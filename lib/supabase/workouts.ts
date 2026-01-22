import { createClient } from "./client"
import type { Database } from "@/types/database"

type WorkoutLog = Database["public"]["Tables"]["lift_logs"]["Row"]
type WorkoutSet = Database["public"]["Tables"]["lift_sets"]["Row"]

export interface WorkoutLogWithSets extends WorkoutLog {
  sets: WorkoutSet[]
}

// 日付範囲でログを取得
export async function getWorkoutLogsByDateRange(
  startDate: string,
  endDate: string
): Promise<WorkoutLogWithSets[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from("lift_logs")
    .select(
      `
      *,
      lift_sets (*)
    `
    )
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false })

  if (error) {
    console.error("Error fetching workout logs:", error)
    return []
  }

  return (data as WorkoutLogWithSets[]) || []
}

// 特定の日のログを取得
export async function getWorkoutLogByDate(
  date: string
): Promise<WorkoutLogWithSets | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from("lift_logs")
    .select(
      `
      *,
      lift_sets (*)
    `
    )
    .eq("user_id", user.id)
    .eq("date", date)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      // データが見つからない
      return null
    }
    console.error("Error fetching workout log:", error)
    return null
  }

  return data as WorkoutLogWithSets
}

// ログを保存（セットも含む）
export async function saveWorkoutLog(
  date: string,
  timeZone: string | null,
  totalTonnage: number,
  sleepHours: number | null,
  nutritionSummary: string | null,
  sets: Array<{
    exercise_name: string
    weight: number
    reps: number
    sets: number
    tonnage: number
    target_body_part: string | null
  }>
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("User not authenticated")
  }

  // トランザクション的に処理（まずログを作成）
  const { data: logData, error: logError } = await supabase
    .from("lift_logs")
    .upsert({
      user_id: user.id,
      date,
      time_zone: timeZone,
      total_tonnage: totalTonnage,
      sleep_hours: sleepHours,
      nutrition_summary: nutritionSummary,
    })
    .select()
    .single()

  if (logError) {
    throw logError
  }

  // 既存のセットを削除
  const { error: deleteError } = await supabase
    .from("lift_sets")
    .delete()
    .eq("log_id", logData.id)

  if (deleteError) {
    console.error("Error deleting existing sets:", deleteError)
  }

  // 新しいセットを追加
  if (sets.length > 0) {
    const setsToInsert = sets.map((set) => ({
      log_id: logData.id,
      ...set,
    }))

    const { error: setsError } = await supabase
      .from("lift_sets")
      .insert(setsToInsert)

    if (setsError) {
      throw setsError
    }
  }

  return logData
}

// ログを削除（セットも含む）
export async function deleteWorkoutLog(date: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("User not authenticated")
  }

  // まずログを取得
  const { data: logData, error: logError } = await supabase
    .from("lift_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", date)
    .single()

  if (logError) {
    throw logError
  }

  if (!logData) {
    throw new Error("Workout log not found")
  }

  // セットを削除（CASCADEで自動削除されるが、明示的に削除）
  const { error: setsError } = await supabase
    .from("lift_sets")
    .delete()
    .eq("log_id", logData.id)

  if (setsError) {
    console.error("Error deleting sets:", setsError)
    // セットの削除エラーは無視して続行
  }

  // ログを削除
  const { error: deleteError } = await supabase
    .from("lift_logs")
    .delete()
    .eq("id", logData.id)

  if (deleteError) {
    throw deleteError
  }

  return true
}
