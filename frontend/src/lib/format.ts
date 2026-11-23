// All formatting lives here (DES-05). Dates arrive as ISO text from the API
// and are read by hand, so the browser's time zone never shifts a day.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return [y, m, d];
}

/** 23 Nov 2026 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = parts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** 23 Nov 2026, 14:05 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return `${formatDate(iso)}, ${iso.slice(11, 16)}`;
}

/** Monday, 23 Nov 2026 */
export function formatLongDate(iso: string): string {
  const [y, m, d] = parts(iso);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${formatDate(iso)}`;
}

/** Nov 2026, for a month key like 2026-11 */
export function formatMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Nov, for a month key like 2026-11 */
export function formatMonthShort(key: string): string {
  return MONTHS[Number(key.split('-')[1]) - 1];
}

function groupThousands(whole: number): string {
  return String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** $12.500,00: tables, forms and cards */
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, '0');
  return `${sign}$${groupThousands(whole)},${rest}`;
}

/** 12.500,00, for a money input, without the dollar sign */
export function formatMoneyInput(cents: number): string {
  return formatMoney(cents).replace('$', '');
}

/** $412.500: headline figures drop the cents */
export function formatMoneyWhole(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const dollars = Math.floor((Math.abs(cents) + 50) / 100);
  return `${sign}$${groupThousands(dollars)}`;
}

/** $400k and $1,2M: chart axes and labels */
export function formatMoneyShort(cents: number): string {
  const dollars = Math.round(cents / 100);
  const abs = Math.abs(dollars);
  const sign = dollars < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const millions = Math.round(abs / 100_000) / 10;
    return `${sign}$${String(millions).replace('.', ',')}M`;
  }
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${abs}`;
}

/** 75% */
export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : `${value}%`;
}

/** Whole days from today to the date; negative when it has passed. */
export function daysFrom(todayIso: string, iso: string): number {
  const [ty, tm, td] = parts(todayIso);
  const [y, m, d] = parts(iso);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
}

/** Today, Tomorrow, In 3 days, 3 days overdue */
export function formatRelative(iso: string, todayIso: string): string {
  const days = daysFrom(todayIso, iso);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1) return `In ${days} days`;
  const over = -days;
  return `${over} ${over === 1 ? 'day' : 'days'} overdue`;
}

/** "1 deal", "3 deals" */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Initials for the pipeline card: Sam Whitfield -> SW */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** acme.example, from https://acme.example/ */
export function displayWebsite(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
