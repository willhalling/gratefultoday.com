import sobrietyChipsData from "@/json/sobriety-chips.json";

export interface SobrietyChip {
  id: string;
  chipNumber: number;
  chipText: string;
  chipNumberX: number;
  chipNumberY: number;
  chipTextX: number;
  chipTextY: number;
  title: string;
  order: number;
  type: string;
  chipColor: string;
}

export interface SobrietyBreakdown {
  years: number;
  months: number;
  days: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const SOBRIETY_MILESTONES = (sobrietyChipsData as SobrietyChip[])
  .slice()
  .sort((left, right) => left.order - right.order);

export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

export function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function calendarDaysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / DAY_MS);
}

function addClampedMonths(date: Date, months: number): Date {
  const targetMonth = date.getMonth() + months;
  const targetYear = date.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  return startOfDay(
    new Date(targetYear, normalizedMonth, Math.min(date.getDate(), lastDay)),
  );
}

export function milestoneDate(chip: SobrietyChip, start: Date): Date {
  const unit = chip.chipText.toLowerCase();
  if (unit.includes("year"))
    return addClampedMonths(start, chip.chipNumber * 12);
  if (unit.includes("month")) return addClampedMonths(start, chip.chipNumber);
  if (unit.includes("week")) {
    return startOfDay(
      new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + chip.chipNumber * 7,
      ),
    );
  }
  const days = unit.includes("hour")
    ? Math.ceil(chip.chipNumber / 24)
    : chip.chipNumber;
  return startOfDay(
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + days),
  );
}

export function sobrietyBreakdown(start: Date, today: Date): SobrietyBreakdown {
  let totalMonths =
    (today.getFullYear() - start.getFullYear()) * 12 +
    today.getMonth() -
    start.getMonth();
  if (addClampedMonths(start, totalMonths) > today) totalMonths -= 1;
  totalMonths = Math.max(0, totalMonths);
  const anchor = addClampedMonths(start, totalMonths);
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: calendarDaysBetween(anchor, today),
  };
}

export function getSobrietyProgress(startDate: Date, currentDate = new Date()) {
  const start = startOfDay(startDate);
  const today = startOfDay(currentDate);
  if (start > today) throw new Error("Sobriety date cannot be in the future");

  const dated = SOBRIETY_MILESTONES.map((chip) => ({
    chip,
    date: milestoneDate(chip, start),
  }));
  const reached = dated
    .filter((entry) => entry.date <= today)
    .sort(
      (left, right) =>
        right.date.getTime() - left.date.getTime() ||
        right.chip.order - left.chip.order,
    );
  const upcoming = dated
    .filter((entry) => entry.date > today)
    .sort(
      (left, right) =>
        left.date.getTime() - right.date.getTime() ||
        right.chip.order - left.chip.order,
    );
  const totalDays = calendarDaysBetween(start, today);
  const next = upcoming[0] ?? null;

  return {
    start,
    today,
    totalDays,
    dayNumber: totalDays + 1,
    breakdown: sobrietyBreakdown(start, today),
    current: reached[0]?.chip ?? null,
    next: next
      ? {
          chip: next.chip,
          date: next.date,
          daysRemaining: calendarDaysBetween(today, next.date),
        }
      : null,
  };
}

export function getMilestoneNeighbors(id: string) {
  const index = SOBRIETY_MILESTONES.findIndex((chip) => chip.id === id);
  return {
    previous: index > 0 ? SOBRIETY_MILESTONES[index - 1] : null,
    next:
      index >= 0 && index < SOBRIETY_MILESTONES.length - 1
        ? SOBRIETY_MILESTONES[index + 1]
        : null,
  };
}
