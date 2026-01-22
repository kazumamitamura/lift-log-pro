// 種目名から部位を推定
export function getBodyPartFromExercise(exerciseName: string): string {
  const name = exerciseName.toLowerCase()

  // 背中系
  if (
    name.includes("懸垂") ||
    name.includes("チンニング") ||
    name.includes("ラット") ||
    name.includes("ロウ") ||
    name.includes("プル")
  ) {
    return "背中"
  }

  // 脚系
  if (
    name.includes("スクワット") ||
    name.includes("レッグ") ||
    name.includes("ランジ") ||
    name.includes("カーフ") ||
    name.includes("squat") ||
    name.includes("sq")
  ) {
    return "脚"
  }

  // 胸系
  if (
    name.includes("ベンチ") ||
    name.includes("プレス") ||
    name.includes("フライ") ||
    name.includes("ディップ") ||
    name.includes("プッシュ")
  ) {
    return "胸"
  }

  // 腕系
  if (
    name.includes("カール") ||
    name.includes("トライセップ") ||
    name.includes("プレスダウン")
  ) {
    return "腕"
  }

  // 体幹系
  if (
    name.includes("プランク") ||
    name.includes("クランチ") ||
    name.includes("レッグレイズ") ||
    name.includes("デッドバグ")
  ) {
    return "体幹"
  }

  // ウエイトリフティング種目
  if (name.includes("スナッチ") || name === "s" || name === "hs") {
    return "全身（スナッチ）"
  }
  if (
    name.includes("クリーン") ||
    name.includes("ジャーク") ||
    name === "c&j" ||
    name === "hj"
  ) {
    return "全身（C&J）"
  }
  if (name.includes("デッドリフト") || name.includes("dl")) {
    return "全身（デッドリフト）"
  }

  return "その他"
}
