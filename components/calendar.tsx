"use client"

import { useState } from "react"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { WorkoutLogWithSets } from "@/lib/supabase/workouts"
import "react-day-picker/dist/style.css"

interface CalendarProps {
  workoutLogs: Map<string, WorkoutLogWithSets>
  onDateSelect: (date: Date | undefined) => void
}

export function Calendar({ workoutLogs, onDateSelect }: CalendarProps) {
  const [selected, setSelected] = useState<Date | undefined>(new Date())

  const handleSelect = (date: Date | undefined) => {
    setSelected(date)
    onDateSelect(date)
  }

  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-5xl">
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          locale={ja}
          className="rounded-xl border-2 border-border bg-gradient-to-br from-card to-card/50 p-6 shadow-lg"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4 w-full",
            caption: "flex justify-center pt-1 relative items-center mb-6",
            caption_label: "text-2xl font-bold text-foreground",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              "h-10 w-10 bg-background border-2 border-input rounded-lg p-0 opacity-80 hover:opacity-100 hover:bg-accent hover:border-primary transition-all flex items-center justify-center shadow-sm"
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse mt-4",
            head_row: "flex mb-3",
            head_cell:
              "text-muted-foreground rounded-md w-16 font-bold text-sm text-center",
            row: "flex w-full mt-2",
            cell: "h-20 w-16 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
            day: cn(
              "h-20 w-16 p-0 font-semibold text-base rounded-xl transition-all hover:scale-110 relative group"
            ),
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-xl scale-110 font-bold ring-2 ring-primary ring-offset-2",
            day_today: "bg-accent text-accent-foreground font-bold border-2 border-primary shadow-md",
            day_outside:
              "day-outside text-muted-foreground opacity-40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
            day_disabled: "text-muted-foreground opacity-30",
            day_range_middle:
              "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
          modifiers={{
            hasWorkout: (date) => {
              try {
                const dateStr = format(date, "yyyy-MM-dd")
                return workoutLogs.has(dateStr)
              } catch {
                return false
              }
            },
          }}
          modifiersClassNames={{
            hasWorkout: "bg-primary/20 border-2 border-primary/60 font-bold shadow-md",
          }}
          components={{
            Chevron: ({ orientation }) => {
              if (orientation === "left") {
                return <ChevronLeft className="h-5 w-5" />
              }
              return <ChevronRight className="h-5 w-5" />
            },
          }}
        />
        {/* 練習日の総重量を表示するリスト */}
        {workoutLogs && workoutLogs.size > 0 && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
            <h3 className="text-sm font-semibold mb-3 text-foreground">練習記録一覧</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(() => {
                try {
                  const entries = Array.from(workoutLogs.entries())
                  if (!entries || entries.length === 0) return null
                  
                  return entries
                    .filter(([dateStr, log]) => dateStr && log)
                    .sort(([a], [b]) => {
                      try {
                        return b.localeCompare(a)
                      } catch {
                        return 0
                      }
                    })
                    .slice(0, 10)
                    .map(([dateStr, log]) => {
                      if (!log || !dateStr) return null
                      try {
                        const date = new Date(dateStr + "T00:00:00")
                        if (isNaN(date.getTime())) return null
                        const tonnage = log?.total_tonnage
                        return (
                          <div
                            key={dateStr}
                            className="flex justify-between items-center text-sm p-2 hover:bg-accent/50 rounded transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              try {
                                handleSelect(date)
                                onDateSelect(date)
                              } catch (error) {
                                console.error("Error selecting date from list:", error)
                              }
                            }}
                          >
                            <span className="font-medium">
                              {format(date, "yyyy年M月d日(E)", { locale: ja })}
                            </span>
                            {tonnage != null && tonnage > 0 && (
                              <span className="font-bold text-primary px-2 py-1 bg-primary/10 rounded">
                                {Math.round(tonnage)}kg
                              </span>
                            )}
                          </div>
                        )
                      } catch (error) {
                        console.error("Error rendering workout log item:", error, dateStr, log)
                        return null
                      }
                    })
                } catch (error) {
                  console.error("Error processing workout logs:", error)
                  return (
                    <div className="text-sm text-muted-foreground p-2">
                      練習記録の読み込み中にエラーが発生しました
                    </div>
                  )
                }
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
