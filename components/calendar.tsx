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
      <div className="w-full max-w-4xl">
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          locale={ja}
          className="rounded-lg border bg-card p-6 shadow-sm"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4 w-full",
            caption: "flex justify-center pt-1 relative items-center mb-4",
            caption_label: "text-xl font-bold text-foreground",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              "h-9 w-9 bg-background border border-input rounded-md p-0 opacity-70 hover:opacity-100 hover:bg-accent transition-all flex items-center justify-center"
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse mt-4",
            head_row: "flex mb-2",
            head_cell:
              "text-muted-foreground rounded-md w-14 font-semibold text-sm text-center",
            row: "flex w-full mt-2",
            cell: "h-16 w-14 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
            day: cn(
              "h-16 w-14 p-0 font-medium text-base rounded-lg transition-all hover:scale-105 relative"
            ),
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-md scale-105 font-bold",
            day_today: "bg-accent text-accent-foreground font-bold border-2 border-primary",
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
            hasWorkout: "bg-primary/30 border-2 border-primary/50 font-semibold",
          }}
          components={{
            Chevron: ({ orientation }) => {
              if (orientation === "left") {
                return <ChevronLeft className="h-4 w-4" />
              }
              return <ChevronRight className="h-4 w-4" />
            },
          }}
        />
        {/* 練習日の総重量を表示するリスト */}
        {workoutLogs.size > 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="text-sm font-semibold mb-2">練習記録</h3>
            <div className="space-y-1">
              {Array.from(workoutLogs.entries())
                .slice(0, 5)
                .map(([dateStr, log]) => {
                  const date = new Date(dateStr)
                  const tonnage = log?.total_tonnage
                  return (
                    <div
                      key={dateStr}
                      className="flex justify-between items-center text-sm"
                    >
                      <span>{format(date, "yyyy年M月d日")}</span>
                      {tonnage != null && tonnage > 0 && (
                        <span className="font-bold text-primary">
                          {Math.round(tonnage)}kg
                        </span>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
