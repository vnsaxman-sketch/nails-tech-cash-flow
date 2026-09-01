import type { IncomeEntry } from "./types";

export function todayText() {
  return new Date().toISOString().slice(0, 10);
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function entryTotal(entry: IncomeEntry) {
  return entry.serviceAmount + entry.tipAmount;
}

export function totalIncome(entries: IncomeEntry[]) {
  return entries.reduce((sum, entry) => {
    return sum + entryTotal(entry);
  }, 0);
}

export function totalServiceIncome(entries: IncomeEntry[]) {
  return entries.reduce((sum, entry) => {
    return sum + entry.serviceAmount;
  }, 0);
}

export function totalTips(entries: IncomeEntry[]) {
  return entries.reduce((sum, entry) => {
    return sum + entry.tipAmount;
  }, 0);
}

export function toDateOnly(dateText: string) {
  return new Date(`${dateText}T00:00:00`);
}

export function filterByDateRange(
  entries: IncomeEntry[],
  start: Date,
  end: Date,
) {
  return entries.filter((entry) => {
    const entryDate = toDateOnly(entry.date);
    return entryDate >= start && entryDate <= end;
  });
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date) {
  const result = startOfDay(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function startOfWeek(date: Date) {
  const result = startOfDay(date);
  const day = result.getDay();

  // Week begins Monday.
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  result.setDate(result.getDate() - daysSinceMonday);
  return result;
}

export function endOfWeek(date: Date) {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}

export function biweeklyRange(anchorDateText: string, selectedDate: Date) {
  const anchor = toDateOnly(anchorDateText);
  anchor.setHours(0, 0, 0, 0);

  const selected = startOfDay(selectedDate);

  const differenceInDays = Math.floor(
    (selected.getTime() - anchor.getTime()) / 86_400_000,
  );

  const periodNumber = Math.floor(differenceInDays / 14);

  const start = new Date(anchor);
  start.setDate(anchor.getDate() + periodNumber * 14);

  const end = new Date(start);
  end.setDate(start.getDate() + 13);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function dateRangeLabel(start: Date, end: Date) {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString(
    "en-US",
    options,
  )}`;
}

export function getServiceDisplayName(entry: IncomeEntry) {
  if (entry.serviceCategory === "Extra Service") {
    return entry.extraServiceNote || "Extra Service";
  }

  return entry.serviceCategory;
}

export function escapeCsv(value: string | number) {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

