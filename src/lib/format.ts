const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parts(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.split("-").map(Number);
  return { y: y!, m: m!, d: d! };
}

/** "2026-10-09" -> "October 9, 2026". */
export function formatDate(date: string): string {
  const { y, m, d } = parts(date);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** "2026-10-09" -> "Friday, October 9, 2026". */
export function formatLongDate(date: string): string {
  const { y, m, d } = parts(date);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${formatDate(date)}`;
}

/** "2026-10-09" -> "Oct 9". */
export function formatShortDate(date: string): string {
  const { m, d } = parts(date);
  return `${MONTHS[m - 1]!.slice(0, 3)} ${d}`;
}

export function monthName(m: number): string {
  return MONTHS[m - 1]!;
}

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? word : pluralWord}`;
}
