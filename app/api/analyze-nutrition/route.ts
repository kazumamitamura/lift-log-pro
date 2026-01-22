import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("image") as File

    if (!file) {
      return NextResponse.json(
        { error: "画像がアップロードされていません" },
        { status: 400 }
      )
    }

    // 画像をbase64に変換
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString("base64")

    // OpenAI APIで画像解析
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `この食事画像を分析して、以下のJSON形式で返してください：
{
  "calories": 数値（カロリー）,
  "protein": 数値（タンパク質、g）,
  "fat": 数値（脂質、g）,
  "carbs": 数値（炭水化物、g）,
  "missing_nutrients": ["不足している栄養素1", "不足している栄養素2"]
}

ウエイトリフティング選手向けの分析をお願いします。`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("AIからの応答がありません")
    }

    // JSONを抽出（コードブロックがある場合を考慮）
    let jsonStr = content.trim()
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "")
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```\n?/g, "")
    }

    const nutritionData = JSON.parse(jsonStr)

    return NextResponse.json(nutritionData)
  } catch (error: any) {
    console.error("Nutrition analysis error:", error)
    return NextResponse.json(
      { error: error.message || "食事分析に失敗しました" },
      { status: 500 }
    )
  }
}
