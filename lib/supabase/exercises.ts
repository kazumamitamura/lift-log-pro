// ウエイトリフティング種目のリスト（自己ベスト入力用）
export const WL_EXERCISES = [
  "S",
  "HS",
  "PwS",
  "C&J",
  "HJ",
  "P",
  "PP",
  "PJ",
  "BSq",
  "FSq",
  "DL_S",
  "DL_J",
] as const

export type WLExercise = (typeof WL_EXERCISES)[number]
