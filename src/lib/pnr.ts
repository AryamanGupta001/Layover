import { createHmac } from "node:crypto";

const PNR_PATTERN = /^[A-Z0-9]{5,8}$/;

export function normalizePnr(raw: string): string | null {
  const pnr = raw.trim().toUpperCase();
  return PNR_PATTERN.test(pnr) ? pnr : null;
}

/** Keyed hash so the raw PNR is never stored. The airline is part of the input because PNRs repeat across airlines. */
export function hashPnr(airline: string, pnr: string): string {
  const secret = process.env.PNR_HASH_SECRET;
  if (!secret) throw new Error("PNR_HASH_SECRET is not set");
  return createHmac("sha256", secret).update(`${airline}:${pnr}`).digest("hex");
}
