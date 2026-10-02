export const CHART_MONTHS = 6;

/** One calendar month as a FHIR `_lastUpdated` range: `ge` its first day, `lt` the next month's. */
export interface MonthWindow {
  start: Date;
  ge: string;
  lt: string;
}

function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `months` consecutive calendar months in local time, oldest first, ending with the month of `now`. */
export function monthWindows(now: Date, months: number = CHART_MONTHS): MonthWindow[] {
  return Array.from({ length: months }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
    const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return { start, ge: `ge${localDate(start)}`, lt: `lt${localDate(next)}` };
  });
}
