export const AIRLINES = [
  { code: "6E", name: "IndiGo" },
  { code: "AI", name: "Air India" },
  { code: "UK", name: "Vistara" },
  { code: "SG", name: "SpiceJet" },
  { code: "QP", name: "Akasa Air" },
  { code: "IX", name: "Air India Express" },
  { code: "EK", name: "Emirates" },
  { code: "QR", name: "Qatar Airways" },
  { code: "EY", name: "Etihad Airways" },
  { code: "SQ", name: "Singapore Airlines" },
  { code: "BA", name: "British Airways" },
  { code: "LH", name: "Lufthansa" },
] as const;

export function isKnownAirline(code: string): boolean {
  return AIRLINES.some((a) => a.code === code);
}
