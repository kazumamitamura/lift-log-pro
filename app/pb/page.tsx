"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { WL_EXERCISES, type WLExercise } from "@/lib/supabase/exercises"

const GRADES = [
  "中1",
  "中2",
  "中3",
  "高1",
  "高2",
  "高3",
  "大1",
  "大2",
  "大3",
  "大4",
  "社会人",
] as const

type Grade = (typeof GRADES)[number]

export default function PersonalBestPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedGrade, setSelectedGrade] = useState<Grade>("中1")
  const [bodyWeight, setBodyWeight] = useState<string>("")
  const [records, setRecords] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // データの読み込み
  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      setIsLoading(true)

      // 既存のデータを読み込む
      const { data, error } = await supabase
        .from("lift_personal_bests")
        .select("*")
        .eq("user_id", user.id)
        .eq("grade", selectedGrade)
        .single()

      if (data && !error) {
        setBodyWeight(data.body_weight?.toString() || "")
        // JSONBから数値を文字列に変換
        const recordsObj = (data.records as Record<string, number>) || {}
        const recordsStr: Record<string, string> = {}
        Object.entries(recordsObj).forEach(([key, value]) => {
          recordsStr[key] = value.toString()
        })
        setRecords(recordsStr)
      } else {
        // データがない場合は空にする
        setBodyWeight("")
        setRecords({})
      }

      setIsLoading(false)
    }

    loadData()
  }, [selectedGrade, router])

  const handleRecordChange = (exercise: WLExercise, value: string) => {
    setRecords((prev) => ({
      ...prev,
      [exercise]: value,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          variant: "destructive",
          title: "エラー",
          description: "ログインが必要です",
        })
        router.push("/login")
        return
      }

      // 数値に変換（空文字はnull）
      const recordsNumeric: Record<string, number> = {}
      Object.entries(records).forEach(([key, value]) => {
        const num = parseFloat(value)
        if (!isNaN(num) && num > 0) {
          recordsNumeric[key] = num
        }
      })

      const bodyWeightNum = bodyWeight ? parseFloat(bodyWeight) : null

      const { error } = await supabase
        .from("lift_personal_bests")
        .upsert({
          user_id: user.id,
          grade: selectedGrade,
          body_weight: bodyWeightNum,
          records: recordsNumeric,
        })

      if (error) {
        throw error
      }

      toast({
        title: "保存しました",
        description: "自己ベスト記録を保存しました",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "保存に失敗しました",
        description: error.message || "もう一度お試しください",
      })
    } finally {
      setIsSaving(false)
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
    <div className="container mx-auto max-w-4xl p-4 py-8">
      <div className="mb-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            ダッシュボードに戻る
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">自己ベスト記録管理</CardTitle>
          <CardDescription>
            各学年での自己ベスト記録を入力・編集してください。空白でも構いません。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 学年選択タブ */}
          <div className="space-y-2">
            <Label>学年</Label>
            <Tabs value={selectedGrade} onValueChange={(v) => setSelectedGrade(v as Grade)}>
              <TabsList className="grid w-full grid-cols-5 lg:grid-cols-11 overflow-x-auto">
                {GRADES.map((grade) => (
                  <TabsTrigger key={grade} value={grade} className="text-xs sm:text-sm">
                    {grade}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={selectedGrade} className="mt-4">
                <div className="space-y-4">
                  {/* 階級入力 */}
                  <div className="space-y-2">
                    <Label htmlFor="body-weight">階級 (kg)</Label>
                    <Input
                      id="body-weight"
                      type="number"
                      step="0.1"
                      placeholder="例: 67.5"
                      value={bodyWeight}
                      onChange={(e) => setBodyWeight(e.target.value)}
                      className="text-lg"
                    />
                  </div>

                  {/* 種目入力グリッド */}
                  <div className="space-y-4">
                    <Label>種目別ベスト記録 (kg)</Label>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                      {WL_EXERCISES.map((exercise) => (
                        <div key={exercise} className="space-y-2">
                          <Label htmlFor={`exercise-${exercise}`} className="text-sm">
                            {exercise}
                          </Label>
                          <Input
                            id={`exercise-${exercise}`}
                            type="number"
                            step="0.5"
                            placeholder="0"
                            value={records[exercise] || ""}
                            onChange={(e) => handleRecordChange(exercise, e.target.value)}
                            className="text-lg font-semibold"
                            tabIndex={0}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* 保存ボタン */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="min-w-[120px]"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
