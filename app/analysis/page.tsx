"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Download, ArrowLeft } from "lucide-react"
import Link from "next/link"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { format, subDays, parseISO } from "date-fns"
import { ja } from "date-fns/locale"
import * as XLSX from "xlsx"
import type { Database } from "@/types/database"

type WorkoutLog = Database["public"]["Tables"]["lift_logs"]["Row"]
type WorkoutSet = Database["public"]["Tables"]["lift_sets"]["Row"]
type Profile = Database["public"]["Tables"]["lift_profiles"]["Row"]

interface WorkoutLogWithSets extends WorkoutLog {
  sets: WorkoutSet[]
}

export default function AnalysisPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [users, setUsers] = useState<Profile[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLogWithSets[]>([])
  const [dateRange, setDateRange] = useState<"week" | "month" | "all">("month")
  const [isExporting, setIsExporting] = useState(false)

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

      // プロファイルを取得して管理者かチェック
      const { data: profile } = await supabase
        .from("lift_profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profile?.role === "admin") {
        setIsAdmin(true)
        // 全ユーザーを取得
        const { data: allUsers } = await supabase
          .from("lift_profiles")
          .select("*")
          .order("created_at", { ascending: false })

        setUsers(allUsers || [])
      }

      setUser(user)
      setSelectedUserId(user.id)
      setIsLoading(false)
    }

    checkUser()
  }, [router])

  // ログデータの取得
  useEffect(() => {
    const loadWorkoutLogs = async () => {
      if (!selectedUserId) return

      const supabase = createClient()
      let startDate: Date

      switch (dateRange) {
        case "week":
          startDate = subDays(new Date(), 7)
          break
        case "month":
          startDate = subDays(new Date(), 30)
          break
        default:
          startDate = new Date(0) // 全期間
      }

      const { data, error } = await supabase
        .from("lift_logs")
        .select(
          `
          *,
          lift_sets (*)
        `
        )
        .eq("user_id", selectedUserId)
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .order("date", { ascending: true })

      if (error) {
        console.error("Error fetching workout logs:", error)
        return
      }

      setWorkoutLogs((data as WorkoutLogWithSets[]) || [])
    }

    loadWorkoutLogs()
  }, [selectedUserId, dateRange])

  // 部位別トレーニング割合
  const bodyPartData = (() => {
    const bodyPartMap: Record<string, number> = {}

    workoutLogs.forEach((log) => {
      log.sets.forEach((set) => {
        // target_body_partがnullの場合は種目名から推定
        let bodyPart = set.target_body_part
        if (!bodyPart && set.exercise_name) {
          // 簡易的な判定（完全な実装はexercise-utilsを使用）
          const name = set.exercise_name.toLowerCase()
          if (name.includes("スクワット") || name.includes("レッグ") || name.includes("sq")) {
            bodyPart = "脚"
          } else if (name.includes("ベンチ") || name.includes("プレス") || name.includes("フライ")) {
            bodyPart = "胸"
          } else if (name.includes("懸垂") || name.includes("ロウ") || name.includes("プル")) {
            bodyPart = "背中"
          } else if (name.includes("カール") || name.includes("トライセップ")) {
            bodyPart = "腕"
          } else if (name.includes("スナッチ") || name === "s" || name === "hs") {
            bodyPart = "全身（スナッチ）"
          } else if (name.includes("クリーン") || name.includes("ジャーク") || name === "c&j" || name === "hj") {
            bodyPart = "全身（C&J）"
          } else if (name.includes("デッドリフト") || name.includes("dl")) {
            bodyPart = "全身（デッドリフト）"
          } else {
            bodyPart = "その他"
          }
        } else {
          bodyPart = bodyPart || "その他"
        }
        bodyPartMap[bodyPart] = (bodyPartMap[bodyPart] || 0) + set.tonnage
      })
    })

    return Object.entries(bodyPartMap)
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
      }))
      .sort((a, b) => b.value - a.value) // 降順でソート
  })()

  const bodyPartColors = [
    "#3b82f6",
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#8b5cf6",
    "#ec4899",
  ]

  // 総重量の推移
  const tonnageTrend = workoutLogs.map((log) => ({
    date: format(parseISO(log.date), "M/d", { locale: ja }),
    tonnage: Math.round(log.total_tonnage),
  }))

  // Excel出力
  const handleExportExcel = async () => {
    setIsExporting(true)

    try {
      const supabase = createClient()
      const { data: profile } = await supabase
        .from("lift_profiles")
        .select("*")
        .eq("id", selectedUserId)
        .single()

      const userName = profile
        ? `${profile.last_name} ${profile.first_name}`
        : "ユーザー"

      // ワークブックを作成
      const wb = XLSX.utils.book_new()

      // サマリーシート
      const summaryData = [
        ["氏名", userName],
        ["対象期間", dateRange === "week" ? "直近1週間" : dateRange === "month" ? "直近1ヶ月" : "全期間"],
        ["総重量合計", workoutLogs.reduce((sum, log) => sum + log.total_tonnage, 0).toFixed(2) + " kg"],
        [],
        ["部位別トレーニング割合"],
        ...bodyPartData.map((item) => [item.name, item.value + " kg"]),
      ]

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, wsSummary, "サマリー")

      // 詳細ログシート
      const logData = [
        ["日付", "時間帯", "総重量", "睡眠時間", "種目", "重量", "回数", "セット数", "小計", "部位"],
        ...workoutLogs.flatMap((log) =>
          log.sets.length > 0
            ? log.sets.map((set, index) => [
                index === 0 ? log.date : "",
                index === 0 ? (log.time_zone || "") : "",
                index === 0 ? log.total_tonnage.toFixed(2) : "",
                index === 0 ? (log.sleep_hours?.toString() || "") : "",
                set.exercise_name,
                set.weight,
                set.reps,
                set.sets,
                set.tonnage.toFixed(2),
                set.target_body_part || "",
              ])
            : [
                [
                  log.date,
                  log.time_zone || "",
                  log.total_tonnage.toFixed(2),
                  log.sleep_hours?.toString() || "",
                  "",
                  "",
                  "",
                  "",
                  "",
                  "",
                ],
              ]
        ),
      ]

      const wsLogs = XLSX.utils.aoa_to_sheet(logData)
      XLSX.utils.book_append_sheet(wb, wsLogs, "詳細ログ")

      // ファイルをダウンロード
      const fileName = `${userName}_${format(new Date(), "yyyyMMdd")}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast({
        title: "エクスポート完了",
        description: "Excelファイルをダウンロードしました",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "エクスポートに失敗しました",
        description: error.message || "もう一度お試しください",
      })
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            ダッシュボードに戻る
          </Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">データ分析</h1>
          <p className="text-muted-foreground">トレーニングデータの可視化</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="ユーザーを選択" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.last_name} {user.first_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">直近1週間</SelectItem>
              <SelectItem value="month">直近1ヶ月</SelectItem>
              <SelectItem value="all">全期間</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportExcel} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                エクスポート中...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Excel出力
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 部位別トレーニング割合 */}
        <Card>
          <CardHeader>
            <CardTitle>部位別トレーニング割合</CardTitle>
            <CardDescription>総重量での割合</CardDescription>
          </CardHeader>
          <CardContent>
            {bodyPartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bodyPartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bodyPartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={bodyPartColors[index % bodyPartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>

        {/* 総重量の推移 */}
        <Card>
          <CardHeader>
            <CardTitle>総重量の推移</CardTitle>
            <CardDescription>日別の総挙上重量</CardDescription>
          </CardHeader>
          <CardContent>
            {tonnageTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={tonnageTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="tonnage"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="総重量 (kg)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
