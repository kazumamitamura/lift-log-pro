"use client"

import { useState } from "react"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { WorkoutLogWithSets } from "@/lib/supabase/workouts"
import type { DayProps } from "react-day-picker"
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

  // カスタムDayコンポーネント
  function CustomDay(props: DayProps) {
    const { day, modifiers, ...rest } = props
    
    // dayをDateに変換
    let date: Date | null = null
    try {
      if (day instanceof Date) {
        date = day
      } else if (typeof day === "string") {
        date = new Date(day)
      } else if (day && typeof day === "object" && "getTime" in day) {
        date = day as Date
      }
      
      if (!date || isNaN(date.getTime())) {
        return <div className="h-20 w-16" />
      }
    } catch {
      return <div className="h-20 w-16" />
    }

    const dateStr = format(date, "yyyy-MM-dd")
    const log = workoutLogs.get(dateStr)
    const isSelected = selected && format(selected, "yyyy-MM-dd") === dateStr
    const isToday = format(new Date(), "yyyy-MM-dd") === dateStr
    const tonnage = log?.total_tonnage
    const hasWorkout = modifiers?.hasWorkout || false

    return (
      <button
        type="button"
        {...rest}
        className={cn(
          "h-20 w-16 rounded-xl text-sm transition-all flex flex-col items-center justify-center gap-1 relative",
          "hover:shadow-lg hover:scale-110 active:scale-105",
          isSelected && "bg-primary text-primary-foreground shadow-xl scale-110 font-bold ring-2 ring-primary ring-offset-2",
          !isSelected && isToday && "bg-accent text-accent-foreground border-2 border-primary font-bold shadow-md",
          !isSelected && !isToday && hasWorkout && "bg-primary/20 hover:bg-primary/30 font-bold border-2 border-primary/60 shadow-md",
          !isSelected && !isToday && !hasWorkout && "hover:bg-accent/50"
        )}
        onClick={() => handleSelect(date)}
      >
        <span className={cn(
          "text-lg leading-none font-bold",
          isSelected && "text-primary-foreground",
          isToday && !isSelected && "text-accent-foreground",
          hasWorkout && !isSelected && !isToday && "text-primary"
        )}>
          {format(date, "d")}
        </span>
        {tonnage != null && tonnage > 0 && (
          <span className={cn(
            "text-[10px] font-extrabold leading-tight px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-sm",
            isSelected 
              ? "bg-primary-foreground/30 text-primary-foreground border border-primary-foreground/50" 
              : "bg-primary text-primary-foreground border border-primary/80"
          )}>
            {Math.round(tonnage)}kg
          </span>
        )}
      </button>
    )
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
            Day: CustomDay,
          }}
        />
      </div>
    </div>
  )
}
