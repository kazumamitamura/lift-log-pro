"use client"

import { useState, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Upload, Loader2, X } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"

interface NutritionData {
  calories: number
  protein: number
  fat: number
  carbs: number
  missing_nutrients: string[]
}

interface NutritionAnalysisProps {
  nutritionSummary: string
  onNutritionSummaryChange: (summary: string) => void
}

export function NutritionAnalysis({
  nutritionSummary,
  onNutritionSummaryChange,
}: NutritionAnalysisProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 画像プレビュー
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewImage(reader.result as string)
    }
    reader.readAsDataURL(file)

    // AI分析
    setIsAnalyzing(true)
    try {
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/analyze-nutrition", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "分析に失敗しました")
      }

      const data: NutritionData = await response.json()
      setNutritionData(data)

      // サマリーをJSON形式で保存
      onNutritionSummaryChange(JSON.stringify(data))

      toast({
        title: "分析完了",
        description: "食事画像の分析が完了しました",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "分析に失敗しました",
        description: error.message || "もう一度お試しください",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleRemoveImage = () => {
    setPreviewImage(null)
    setNutritionData(null)
    onNutritionSummaryChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // 既存のデータを読み込む
  const existingData = nutritionSummary
    ? (() => {
        try {
          return JSON.parse(nutritionSummary) as NutritionData
        } catch {
          return null
        }
      })()
    : null

  const displayData = nutritionData || existingData

  // PFCバランスのデータ
  const pfcData = displayData
    ? [
        {
          name: "タンパク質",
          value: displayData.protein,
          color: "#3b82f6", // blue
        },
        {
          name: "脂質",
          value: displayData.fat,
          color: "#ef4444", // red
        },
        {
          name: "炭水化物",
          value: displayData.carbs,
          color: "#f59e0b", // amber
        },
      ]
    : []

  return (
    <div className="space-y-4">
      <Label>食事分析（AI）</Label>

      {/* 画像アップロード */}
      {!previewImage && !displayData && (
        <div className="border-2 border-dashed rounded-md p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="nutrition-image"
          />
          <label htmlFor="nutrition-image" className="cursor-pointer">
            <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              食事画像をアップロード
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  画像を選択
                </>
              )}
            </Button>
          </label>
        </div>
      )}

      {/* プレビュー画像 */}
          {previewImage && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt="食事画像"
                className="w-full h-48 object-cover rounded-md"
              />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemoveImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 分析結果 */}
      {displayData && (
        <div className="space-y-4">
          {/* カロリー */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-md">
              <Label className="text-sm text-muted-foreground">総カロリー</Label>
              <div className="text-2xl font-bold text-primary">
                {Math.round(displayData.calories)} kcal
              </div>
            </div>
            <div className="p-4 border rounded-md">
              <Label className="text-sm text-muted-foreground">PFCバランス</Label>
              <div className="text-sm space-y-1 mt-2">
                <div>P: {Math.round(displayData.protein)}g</div>
                <div>F: {Math.round(displayData.fat)}g</div>
                <div>C: {Math.round(displayData.carbs)}g</div>
              </div>
            </div>
          </div>

          {/* PFCバランスグラフ */}
          {pfcData.length > 0 && (
            <div className="p-4 border rounded-md">
              <Label className="text-sm mb-2 block">PFCバランス</Label>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pfcData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pfcData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 不足栄養素 */}
          {displayData.missing_nutrients &&
            displayData.missing_nutrients.length > 0 && (
              <div className="p-4 border rounded-md bg-yellow-50 dark:bg-yellow-900/20">
                <Label className="text-sm mb-2 block">不足している栄養素</Label>
                <ul className="list-disc list-inside space-y-1">
                  {displayData.missing_nutrients.map((nutrient, index) => (
                    <li key={index} className="text-sm">
                      {nutrient}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}
    </div>
  )
}
