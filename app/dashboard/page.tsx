"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Calendar } from "@/components/calendar"
import { WorkoutLogModal } from "@/components/workout-log-modal"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, BarChart3, User } from "lucide-react"
import Link from "next/link"
import { getWorkoutLogsByDateRange, getWorkoutLogByDate } from "@/lib/supabase/workouts"
import type { WorkoutLogWithSets } from "@/lib/supabase/workouts"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    // サーバーサイドレンダリング時のエラーを防ぐ
    if (typeof window === "undefined") return undefined
    return new Date()
  })
  const [workoutLogs, setWorkoutLogs] = useState<Map<string, WorkoutLogWithSets>>(new Map())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<WorkoutLogWithSets | null>(null)

  // ユーザー認証チェック
  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      setUser(user)
      setIsLoading(false)
    }

    checkUser()
  }, [router])

  // カレンダー範囲のログを取得
  useEffect(() => {
    const loadWorkoutLogs = async () => {
      if (!user) return

      try {
        const today = new Date()
        const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)

        const logs = await getWorkoutLogsByDateRange(
          format(startDate, "yyyy-MM-dd"),
          format(endDate, "yyyy-MM-dd")
        )

        const logsMap = new Map<string, WorkoutLogWithSets>()
        logs.forEach((log) => {
          logsMap.set(log.date, log)
        })

        setWorkoutLogs(logsMap)
      } catch (error) {
        console.error("Error loading workout logs:", error)
        toast({
          variant: "destructive",
          title: "エラー",
          description: "練習ログの読み込みに失敗しました",
        })
      }
    }

    loadWorkoutLogs()
  }, [user, toast])

  // 日付選択時の処理
  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) {
      return
    }

    setSelectedDate(date)
    const dateStr = format(date, "yyyy-MM-dd")

    try {
      // 既にログがあるかチェック
      const existingLog = workoutLogs.get(dateStr)
      if (existingLog) {
        setSelectedLog(existingLog)
      } else {
        // データベースから取得を試みる
        try {
          const log = await getWorkoutLogByDate(dateStr)
          if (log) {
            setWorkoutLogs((prev) => {
              const newMap = new Map(prev)
              newMap.set(dateStr, log)
              return newMap
            })
            setSelectedLog(log)
          } else {
            setSelectedLog(null)
          }
        } catch (fetchError) {
          // データ取得エラーは無視して、新規作成として続行
          console.warn("Error fetching workout log:", fetchError)
          setSelectedLog(null)
        }
      }

      // モーダルを開く
      setIsModalOpen(true)
    } catch (error: any) {
      console.error("Error selecting date:", error)
      // エラーが発生してもモーダルは開く（新規作成として）
      setSelectedLog(null)
      setIsModalOpen(true)
    }
  }

  // モーダルを閉じた後の処理
  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedLog(null)
    // ログを再取得
    const today = new Date()
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    getWorkoutLogsByDateRange(
      format(startDate, "yyyy-MM-dd"),
      format(endDate, "yyyy-MM-dd")
    )
      .then((logs) => {
        const logsMap = new Map<string, WorkoutLogWithSets>()
        logs.forEach((log) => {
          logsMap.set(log.date, log)
        })
        setWorkoutLogs(logsMap)
      })
      .catch((error) => {
        console.error("Error reloading workout logs:", error)
        toast({
          variant: "destructive",
          title: "エラー",
          description: "練習ログの再読み込みに失敗しました",
        })
      })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl p-3 sm:p-4 py-4 sm:py-8">
      {/* ヘッダー */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">ダッシュボード</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {format(new Date(), "yyyy年M月d日", { locale: ja })}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link href="/pb" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <User className="mr-2 h-4 w-4" />
              自己ベスト
            </Button>
          </Link>
          <Link href="/analysis" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <BarChart3 className="mr-2 h-4 w-4" />
              分析
            </Button>
          </Link>
        </div>
      </div>

      {/* カレンダー */}
      <Card>
        <CardHeader>
          <CardTitle>練習カレンダー</CardTitle>
          <CardDescription>
            日付をタップして練習記録を入力・編集できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            workoutLogs={workoutLogs}
            onDateSelect={handleDateSelect}
          />
        </CardContent>
      </Card>

      {/* 記録入力モーダル */}
      <WorkoutLogModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        selectedDate={selectedDate}
        existingLog={selectedLog}
      />
    </div>
  )
}
