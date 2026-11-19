import type { Leg } from "./flights/types";

export const MAX_LEGS = 4;
const MIN_CONNECTION_MS = 30 * 60_000;

export type ChainCheck = { ok: true } | { ok: false; error: string };

/** A journey is valid when each leg starts where the previous one ended, with time to connect. */
export function validateChain(legs: Leg[]): ChainCheck {
  if (legs.length === 0) return { ok: false, error: "A journey needs at least one flight." };
  if (legs.length > MAX_LEGS) return { ok: false, error: `At most ${MAX_LEGS} flights are supported.` };

  for (let i = 1; i < legs.length; i++) {
    const prev = legs[i - 1];
    const next = legs[i];
    if (prev.destinationAirport !== next.originAirport) {
      return {
        ok: false,
        error: `Flight ${i + 1} departs from ${next.originAirport}, but flight ${i} lands at ${prev.destinationAirport}.`,
      };
    }
    const gap = new Date(next.departureTime).getTime() - new Date(prev.arrivalTime).getTime();
    if (gap < MIN_CONNECTION_MS) {
      return { ok: false, error: `Flight ${i + 1} departs less than 30 minutes after flight ${i} lands.` };
    }
  }
  return { ok: true };
}
