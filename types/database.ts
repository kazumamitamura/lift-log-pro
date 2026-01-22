export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      lift_profiles: {
        Row: {
          id: string
          last_name: string
          first_name: string
          display_name: string | null
          role: 'admin' | 'user'
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          last_name: string
          first_name: string
          display_name?: string | null
          role?: 'admin' | 'user'
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          last_name?: string
          first_name?: string
          display_name?: string | null
          role?: 'admin' | 'user'
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      lift_exercises: {
        Row: {
          id: string
          category_type: 'WL' | 'Training'
          major_category: string
          exercise_name: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          category_type: 'WL' | 'Training'
          major_category: string
          exercise_name: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          category_type?: 'WL' | 'Training'
          major_category?: string
          exercise_name?: string
          display_order?: number
          created_at?: string
        }
      }
      lift_personal_bests: {
        Row: {
          id: string
          user_id: string
          grade: '中1' | '中2' | '中3' | '高1' | '高2' | '高3' | '大1' | '大2' | '大3' | '大4' | '社会人'
          body_weight: number | null
          records: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          grade: '中1' | '中2' | '中3' | '高1' | '高2' | '高3' | '大1' | '大2' | '大3' | '大4' | '社会人'
          body_weight?: number | null
          records?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          grade?: '中1' | '中2' | '中3' | '高1' | '高2' | '高3' | '大1' | '大2' | '大3' | '大4' | '社会人'
          body_weight?: number | null
          records?: Json
          created_at?: string
          updated_at?: string
        }
      }
      lift_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          time_zone: '早朝' | '午前' | '午後' | '夜' | null
          total_tonnage: number
          sleep_hours: number | null
          nutrition_summary: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          time_zone?: '早朝' | '午前' | '午後' | '夜' | null
          total_tonnage?: number
          sleep_hours?: number | null
          nutrition_summary?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          time_zone?: '早朝' | '午前' | '午後' | '夜' | null
          total_tonnage?: number
          sleep_hours?: number | null
          nutrition_summary?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lift_sets: {
        Row: {
          id: string
          log_id: string
          exercise_name: string
          weight: number
          reps: number
          sets: number
          tonnage: number
          target_body_part: string | null
          created_at: string
        }
        Insert: {
          id?: string
          log_id: string
          exercise_name: string
          weight: number
          reps: number
          sets: number
          tonnage: number
          target_body_part?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          log_id?: string
          exercise_name?: string
          weight?: number
          reps?: number
          sets?: number
          tonnage?: number
          target_body_part?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
