// Pools group people who finish their journey at the same airport within the same
// landing window. Windows are fixed buckets aligned to the clock, so the key is
// deterministic. Known limitation: two flights landing minutes apart on either
// side of a boundary land in different pools. Overlapping windows can fix that later.
export const POOL_WINDOW_MINUTES = 120;

export type PoolWindow = { key: string; airport: string; start: Date; end: Date };

export function poolWindow(arrival: Date, airport: string): PoolWindow {
  const size = POOL_WINDOW_MINUTES * 60_000;
  const startMs = Math.floor(arrival.getTime() / size) * size;
  const start = new Date(startMs);
  const end = new Date(startMs + size);
  return { key: `${airport}|${start.toISOString()}`, airport, start, end };
}
