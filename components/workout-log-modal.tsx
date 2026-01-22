"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, X, Upload } from "lucide-react"
import { saveWorkoutLog } from "@/lib/supabase/workouts"
import { getExercisesByCategoryClient } from "@/lib/supabase/exercises-client"
import { NutritionAnalysis } from "@/components/nutrition-analysis"
import { getBodyPartFromExercise } from "@/lib/utils/exercise-utils"
import type { WorkoutLogWithSets } from "@/lib/supabase/workouts"
import type { Database } from "@/types/database"

type Exercise = Database["public"]["Tables"]["lift_exercises"]["Row"]

interface WorkoutSet {
  id: string
  exercise_name: string
  weight: string
  reps: string
  sets: string
  tonnage: number
  target_body_part: string | null
}

interface WorkoutLogModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | undefined
  existingLog: WorkoutLogWithSets | null
}

export function WorkoutLogModal({
  isOpen,
  onClose,
  selectedDate,
  existingLog,
}: WorkoutLogModalProps) {
  const { toast } = useToast()
  const [timeZone, setTimeZone] = useState<string>("")
  const [sleepHours, setSleepHours] = useState<string>("")
  const [nutritionSummary, setNutritionSummary] = useState<string>("")
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [exercisesByCategory, setExercisesByCategory] = useState<
    Record<string, Exercise[]>
  >({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedMajorCategory, setSelectedMajorCategory] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // 種目データの読み込み
  useEffect(() => {
    const loadExercises = async () => {
      const grouped = await getExercisesByCategoryClient()
      setExercisesByCategory(grouped)

      // 全種目をフラット化
      const allExercises: Exercise[] = []
      Object.values(grouped).forEach((categoryExercises) => {
        allExercises.push(...categoryExercises)
      })
      setExercises(allExercises)
    }

    if (isOpen) {
      loadExercises()
    }
  }, [isOpen])

  // 既存ログの読み込み
  useEffect(() => {
    if (existingLog) {
      setTimeZone(existingLog.time_zone || "")
      setSleepHours(existingLog.sleep_hours?.toString() || "")
      setNutritionSummary(existingLog.nutrition_summary || "")

      const sets: WorkoutSet[] = existingLog.sets.map((set, index) => ({
        id: `existing-${index}`,
        exercise_name: set.exercise_name,
        weight: set.weight.toString(),
        reps: set.reps.toString(),
        sets: set.sets.toString(),
        tonnage: set.tonnage,
        target_body_part: set.target_body_part,
      }))
      setWorkoutSets(sets)
    } else {
      // 新規作成時は空にする
      setTimeZone("")
      setSleepHours("")
      setNutritionSummary("")
      setWorkoutSets([])
    }
  }, [existingLog])

  // セット追加
  const handleAddSet = () => {
    const newSet: WorkoutSet = {
      id: `new-${Date.now()}`,
      exercise_name: "",
      weight: "",
      reps: "",
      sets: "",
      tonnage: 0,
      target_body_part: null,
    }
    setWorkoutSets([...workoutSets, newSet])
  }

  // セット削除
  const handleRemoveSet = (id: string) => {
    setWorkoutSets(workoutSets.filter((set) => set.id !== id))
  }

  // セット更新
  const handleSetChange = (
    id: string,
    field: keyof WorkoutSet,
    value: string
  ) => {
    setWorkoutSets(
      workoutSets.map((set) => {
        if (set.id === id) {
          const updated = { ...set, [field]: value }

          // 種目が変更された場合、部位を自動判定
          if (field === "exercise_name" && value) {
            updated.target_body_part = getBodyPartFromExercise(value)
          }

          // 重量、回数、セット数が全て入力されている場合、トンネージを計算
          if (
            field === "weight" ||
            field === "reps" ||
            field === "sets"
          ) {
            const weight = parseFloat(updated.weight) || 0
            const reps = parseInt(updated.reps) || 0
            const sets = parseInt(updated.sets) || 0
            updated.tonnage = weight * reps * sets
          }

          return updated
        }
        return set
      })
    )
  }

  // 種目選択（検索機能付き）
  const filteredExercises = exercises.filter((exercise) => {
    if (searchQuery) {
      return exercise.exercise_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    }
    if (selectedCategory && exercise.category_type !== selectedCategory) {
      return false
    }
    if (
      selectedMajorCategory &&
      exercise.major_category !== selectedMajorCategory
    ) {
      return false
    }
    return true
  })

  // カテゴリ一覧を取得
  const categories = Array.from(
    new Set(exercises.map((e) => e.category_type))
  )
  const majorCategories = selectedCategory
    ? Array.from(
        new Set(
          exercises
            .filter((e) => e.category_type === selectedCategory)
            .map((e) => e.major_category)
        )
      )
    : []

  // 保存
  const handleSave = async () => {
    if (!selectedDate) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "日付が選択されていません",
      })
      return
    }

    // バリデーション
    const validSets = workoutSets.filter(
      (set) =>
        set.exercise_name &&
        set.weight &&
        set.reps &&
        set.sets &&
        parseFloat(set.weight) > 0 &&
        parseInt(set.reps) > 0 &&
        parseInt(set.sets) > 0
    )

    if (validSets.length === 0 && workoutSets.length > 0) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "有効なセットを入力してください",
      })
      return
    }

    setIsSaving(true)

    try {
      const totalTonnage = validSets.reduce(
        (sum, set) => sum + set.tonnage,
        0
      )

      const setsToSave = validSets.map((set) => ({
        exercise_name: set.exercise_name,
        weight: parseFloat(set.weight),
        reps: parseInt(set.reps),
        sets: parseInt(set.sets),
        tonnage: set.tonnage,
        target_body_part: set.target_body_part,
      }))

      await saveWorkoutLog(
        format(selectedDate, "yyyy-MM-dd"),
        timeZone || null,
        totalTonnage,
        sleepHours ? parseFloat(sleepHours) : null,
        nutritionSummary || null,
        setsToSave
      )

      toast({
        title: "保存しました",
        description: "練習記録を保存しました",
      })

      onClose()
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

  // 総重量計算
  const totalTonnage = workoutSets.reduce((sum, set) => sum + set.tonnage, 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedDate
              ? format(selectedDate, "yyyy年M月d日(E)", { locale: ja })
              : "練習記録"}
          </DialogTitle>
          <DialogDescription>
            練習内容を入力してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time-zone">時間帯</Label>
              <Select value={timeZone} onValueChange={setTimeZone}>
                <SelectTrigger id="time-zone">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="早朝">早朝</SelectItem>
                  <SelectItem value="午前">午前</SelectItem>
                  <SelectItem value="午後">午後</SelectItem>
                  <SelectItem value="夜">夜</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleep-hours">睡眠時間 (時間)</Label>
              <Input
                id="sleep-hours"
                type="number"
                step="0.5"
                placeholder="例: 7.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
              />
            </div>
          </div>

          {/* 種目検索・フィルター */}
          <div className="space-y-2">
            <Label>種目検索</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="種目名で検索..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedCategory("")
                  setSelectedMajorCategory("")
                }}
              />
              <Select
                value={selectedCategory}
                onValueChange={(value) => {
                  setSelectedCategory(value)
                  setSelectedMajorCategory("")
                  setSearchQuery("")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="編を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">すべて</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat === "WL" ? "ウエイトリフティング" : "筋トレ"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCategory && (
                <Select
                  value={selectedMajorCategory}
                  onValueChange={(value) => {
                    setSelectedMajorCategory(value)
                    setSearchQuery("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="大カテゴリを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">すべて</SelectItem>
                    {majorCategories.map((major) => (
                      <SelectItem key={major} value={major}>
                        {major}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* セット一覧 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>練習セット</Label>
              <Button onClick={handleAddSet} size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                セット追加
              </Button>
            </div>

            {workoutSets.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                セットを追加してください
              </div>
            ) : (
              <div className="space-y-3">
                {workoutSets.map((set, index) => (
                  <div
                    key={set.id}
                    className="grid grid-cols-12 gap-2 items-end p-3 border rounded-md"
                  >
                    <div className="col-span-12 sm:col-span-4 space-y-1">
                      <Label className="text-xs">種目</Label>
                      <Select
                        value={set.exercise_name}
                        onValueChange={(value) =>
                          handleSetChange(set.id, "exercise_name", value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="種目を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredExercises.length > 0 ? (
                            filteredExercises.map((exercise) => (
                              <SelectItem
                                key={exercise.id}
                                value={exercise.exercise_name}
                              >
                                {exercise.exercise_name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>
                              種目が見つかりません
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs">重量 (kg)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="0"
                        value={set.weight}
                        onChange={(e) =>
                          handleSetChange(set.id, "weight", e.target.value)
                        }
                        className="text-lg font-semibold"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs">回数</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.reps}
                        onChange={(e) =>
                          handleSetChange(set.id, "reps", e.target.value)
                        }
                        className="text-lg font-semibold"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs">セット数</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.sets}
                        onChange={(e) =>
                          handleSetChange(set.id, "sets", e.target.value)
                        }
                        className="text-lg font-semibold"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-1 space-y-1">
                      <Label className="text-xs">小計</Label>
                      <div className="h-10 flex items-center justify-center text-lg font-bold text-primary">
                        {set.tonnage > 0 ? Math.round(set.tonnage) : "-"}
                      </div>
                    </div>
                    <div className="col-span-6 sm:col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSet(set.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 総重量 */}
            {workoutSets.length > 0 && (
              <div className="flex justify-end pt-2 border-t">
                <div className="text-right">
                  <Label className="text-sm text-muted-foreground">
                    総重量
                  </Label>
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(totalTonnage)} kg
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 食事分析 */}
          <NutritionAnalysis
            nutritionSummary={nutritionSummary}
            onNutritionSummaryChange={setNutritionSummary}
          />

          {/* 保存ボタン */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
