"use client"

import { createClient } from "./client"
import type { Database } from "@/types/database"

type Exercise = Database["public"]["Tables"]["lift_exercises"]["Row"]

export async function getExercisesClient(): Promise<Exercise[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("lift_exercises")
    .select("*")
    .order("display_order", { ascending: true })

  if (error) {
    console.error("Error fetching exercises:", error)
    return []
  }

  return data || []
}

export async function getExercisesByCategoryClient() {
  const exercises = await getExercisesClient()
  const grouped: Record<string, Exercise[]> = {}

  exercises.forEach((exercise) => {
    const key = `${exercise.category_type}-${exercise.major_category}`
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(exercise)
  })

  return grouped
}
