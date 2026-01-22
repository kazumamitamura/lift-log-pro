"use client"

import { useState } from "react"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { cn } from "@/lib/utils"
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
    <div className="flex justify-center">
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={handleSelect}
        locale={ja}
        className="rounded-md"
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          ),
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
        modifiers={{
          hasWorkout: (date) => {
            const dateStr = format(date, "yyyy-MM-dd")
            return workoutLogs.has(dateStr)
          },
        }}
        modifiersClassNames={{
          hasWorkout: "bg-primary/20 font-semibold",
        }}
        components={{
          Day: (props) => {
            // CalendarDayからDateを取得（型アサーションを使用）
            const day = props.day as unknown as Date
            
            // 無効な日付のチェック
            if (!day || !(day instanceof Date) || isNaN(day.getTime())) {
              return null
            }
            
            try {
              const dateStr = format(day, "yyyy-MM-dd")
              const log = workoutLogs.get(dateStr)
              const isSelected =
                selected && format(selected, "yyyy-MM-dd") === dateStr
              const isToday = format(new Date(), "yyyy-MM-dd") === dateStr

              return (
                <button
                  type="button"
                  className={cn(
                    "h-9 w-9 rounded-md text-sm transition-colors flex flex-col items-center justify-center",
                    isSelected && "bg-primary text-primary-foreground",
                    !isSelected && isToday && "bg-accent",
                    !isSelected && !isToday && log && "hover:bg-accent font-semibold",
                    !isSelected && !isToday && !log && "hover:bg-accent"
                  )}
                  onClick={() => handleSelect(day)}
                >
                  <span>{format(day, "d")}</span>
                  {log && log.total_tonnage != null && (
                    <span className="text-[10px] font-bold text-primary leading-none">
                      {Math.round(log.total_tonnage)}
                    </span>
                  )}
                </button>
              )
            } catch (error) {
              console.error("Error rendering day:", error, day)
              return null
            }
          },
        }}
      />
    </div>
  )
}
