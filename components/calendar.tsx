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
          className="rounded-lg border bg-card p-4 shadow-sm"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4 w-full",
            caption: "flex justify-center pt-1 relative items-center mb-4",
            caption_label: "text-lg font-bold text-foreground",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              "h-8 w-8 bg-background border border-input rounded-md p-0 opacity-70 hover:opacity-100 hover:bg-accent transition-all"
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex mb-2",
            head_cell:
              "text-muted-foreground rounded-md w-12 font-semibold text-sm text-center",
            row: "flex w-full mt-1",
            cell: "h-14 w-12 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
            day: cn(
              "h-14 w-12 p-0 font-medium text-base rounded-lg transition-all hover:scale-105"
            ),
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-md scale-105",
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
            hasWorkout: "bg-primary/30 border border-primary/50 font-semibold",
          }}
          components={{
            Chevron: ({ orientation }) => {
              if (orientation === "left") {
                return <ChevronLeft className="h-4 w-4" />
              }
              return <ChevronRight className="h-4 w-4" />
            },
          }}
          formatters={{
            formatDay: (date) => {
              const dateStr = format(date, "yyyy-MM-dd")
              const log = workoutLogs.get(dateStr)
              const dayNumber = format(date, "d")
              
              if (log && log.total_tonnage != null && log.total_tonnage > 0) {
                return (
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span>{dayNumber}</span>
                    <span className="text-[9px] font-bold leading-tight text-primary">
                      {Math.round(log.total_tonnage)}kg
                    </span>
                  </div>
                )
              }
              return dayNumber
            },
          }}
        />
      </div>
    </div>
  )
}
