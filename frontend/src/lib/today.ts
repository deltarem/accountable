// Today and now come from GET /api/today, never from the browser's clock
// (DEC-12). The query refetches whenever the window gets focus.

import { useToday } from '../api/hooks';

export function useTodayValue(): { today: string | undefined; now: string | undefined } {
  const { data } = useToday();
  return { today: data?.today, now: data?.now };
}

/** "2026-11-23T14:05:00" as the value of a datetime-local input. */
export function toDateTimeInput(iso: string | undefined): string {
  return iso ? iso.slice(0, 16) : '';
}
