// @ts-nocheck
"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  format,
} from "date-fns";
import { cs } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────

export type PeriodMode = "day" | "week" | "month" | "quarter" | "year" | "custom";

export interface PeriodValue {
  start: Date;
  end: Date;
  mode: PeriodMode;
}

export interface PeriodPickerProps {
  value: PeriodValue;
  onChange: (period: PeriodValue) => void;
  className?: string;
}

// ── Mode labels ───────────────────────────────────────────────

const MODE_LABELS: Record<PeriodMode, string> = {
  day: "Den",
  week: "Týden",
  month: "Měsíc",
  quarter: "Kvartál",
  year: "Rok",
  custom: "Vlastní",
};

// ── Helpers ───────────────────────────────────────────────────

function getPeriodForMode(mode: PeriodMode, referenceDate: Date): { start: Date; end: Date } {
  switch (mode) {
    case "day":
      return { start: startOfDay(referenceDate), end: endOfDay(referenceDate) };
    case "week":
      return { start: startOfWeek(referenceDate, { weekStartsOn: 1 }), end: endOfWeek(referenceDate, { weekStartsOn: 1 }) };
    case "month":
      return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
    case "quarter":
      return { start: startOfQuarter(referenceDate), end: endOfQuarter(referenceDate) };
    case "year":
      return { start: startOfYear(referenceDate), end: endOfYear(referenceDate) };
    case "custom":
      return { start: referenceDate, end: referenceDate };
  }
}

function navigatePeriod(current: PeriodValue, direction: -1 | 1): PeriodValue {
  const { start, mode } = current;
  let newRef: Date;

  switch (mode) {
    case "day":
      newRef = direction === 1 ? addDays(start, 1) : subDays(start, 1);
      break;
    case "week":
      newRef = direction === 1 ? addWeeks(start, 1) : subWeeks(start, 1);
      break;
    case "month":
      newRef = direction === 1 ? addMonths(start, 1) : subMonths(start, 1);
      break;
    case "quarter":
      newRef = direction === 1 ? addQuarters(start, 1) : subQuarters(start, 1);
      break;
    case "year":
      newRef = direction === 1 ? addYears(start, 1) : subYears(start, 1);
      break;
    default:
      return current;
  }

  const { start: s, end: e } = getPeriodForMode(mode, newRef);
  return { start: s, end: e, mode };
}

// ── Format label ──────────────────────────────────────────────

function formatPeriodLabel(value: PeriodValue): string {
  const { start, end, mode } = value;
  switch (mode) {
    case "day":
      return format(start, "d. MMMM yyyy", { locale: cs });
    case "week":
      return `${format(start, "d. M.", { locale: cs })} – ${format(end, "d. M. yyyy", { locale: cs })}`;
    case "month":
      return format(start, "LLLL yyyy", { locale: cs });
    case "quarter":
      return `Q${Math.ceil((start.getMonth() + 1) / 3)} ${format(start, "yyyy")}`;
    case "year":
      return format(start, "yyyy");
    case "custom":
      return `${format(start, "d. M. yyyy", { locale: cs })} – ${format(end, "d. M. yyyy", { locale: cs })}`;
  }
}

// ── Component ─────────────────────────────────────────────────

export function PeriodPicker({ value, onChange, className }: PeriodPickerProps) {
  const label = useMemo(() => formatPeriodLabel(value), [value]);

  const handleModeChange = (mode: PeriodMode) => {
    if (mode === "custom") {
      onChange({ start: value.start, end: value.end, mode: "custom" });
      return;
    }
    const { start, end } = getPeriodForMode(mode, new Date());
    onChange({ start, end, mode });
  };

  const handlePrev = () => onChange(navigatePeriod(value, -1));
  const handleNext = () => onChange(navigatePeriod(value, 1));

  const handleToday = () => {
    const { start, end } = getPeriodForMode(value.mode === "custom" ? "month" : value.mode, new Date());
    onChange({ start, end, mode: value.mode === "custom" ? "month" : value.mode });
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 ${className || ""}`}>
      {/* Mode buttons */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-0.5">
        {(Object.keys(MODE_LABELS) as PeriodMode[]).map((mode) => (
          <Button
            key={mode}
            variant={value.mode === mode ? "default" : "ghost"}
            size="sm"
            className={`h-7 px-2.5 text-xs ${value.mode === mode ? "bg-lagoon text-white hover:bg-lagoon/90" : ""}`}
            onClick={() => handleModeChange(mode)}
          >
            {MODE_LABELS[mode]}
          </Button>
        ))}
      </div>

      {/* Navigation */}
      {value.mode !== "custom" && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={handlePrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={handleToday}>
            Dnes
          </Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={handleNext}>
            <ChevronRight className="size-4" />
          </Button>
          <span className="font-semibold text-sm ml-2 whitespace-nowrap">{label}</span>
        </div>
      )}

      {/* Custom date inputs */}
      {value.mode === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="h-7 text-xs w-[140px]"
            value={format(value.start, "yyyy-MM-dd")}
            onChange={(e) => {
              const d = new Date(e.target.value);
              if (!isNaN(d.getTime())) {
                onChange({ start: startOfDay(d), end: value.end, mode: "custom" });
              }
            }}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="date"
            className="h-7 text-xs w-[140px]"
            value={format(value.end, "yyyy-MM-dd")}
            onChange={(e) => {
              const d = new Date(e.target.value);
              if (!isNaN(d.getTime())) {
                onChange({ start: value.start, end: endOfDay(d), mode: "custom" });
              }
            }}
          />
          <span className="font-semibold text-sm ml-1 whitespace-nowrap">{label}</span>
        </div>
      )}
    </div>
  );
}

// ── Hook helper ───────────────────────────────────────────────

export function useDefaultPeriod(mode: PeriodMode = "month"): PeriodValue {
  const now = new Date();
  const { start, end } = getPeriodForMode(mode, now);
  return { start, end, mode };
}
