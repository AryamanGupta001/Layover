import type { FlightProvider, Leg, LookupInput, LookupResult } from "./types";

// Development-only provider. It invents plausible flights from the PNR so the
// whole product can be exercised without any airline integration. Landing times
// are anchored to "now", so different mock PNRs tend to share a pool window.
const SAMPLES = [
  { number: "101", from: "DEL", to: "BLR", hoursOut: 3, durationH: 2.75 },
  { number: "203", from: "BOM", to: "BLR", hoursOut: 3, durationH: 1.75 },
  { number: "305", from: "HYD", to: "BLR", hoursOut: 4, durationH: 1.25 },
  { number: "407", from: "DXB", to: "BOM", hoursOut: 5, durationH: 3.5 },
  { number: "509", from: "SIN", to: "DEL", hoursOut: 6, durationH: 5.5 },
  { number: "611", from: "LHR", to: "DEL", hoursOut: 8, durationH: 9 },
];

const HOUR_MS = 3_600_000;
const MIN_MS = 60_000;

function checksum(text: string): number {
  let sum = 0;
  for (const ch of text) sum += ch.charCodeAt(0);
  return sum;
}

function startOfCurrentHour(): number {
  return Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
}

export const mockProvider: FlightProvider = {
  name: "mock",

  async lookup(input: LookupInput): Promise<LookupResult> {
    const sample = SAMPLES[checksum(input.pnr) % SAMPLES.length];
    const flightNumber = input.flightNumber?.trim() || sample.number;

    let origin = sample.from;
    let destination = sample.to;
    let departure = startOfCurrentHour() + sample.hoursOut * HOUR_MS;

    // Connecting leg: start where the previous leg ended, with a 2h layover.
    if (input.previous) {
      origin = input.previous.destinationAirport;
      departure = new Date(input.previous.arrivalTime).getTime() + 2 * HOUR_MS;
      if (destination === origin) destination = sample.from === origin ? "BOM" : sample.from;
    }

    const arrival = departure + Math.round(sample.durationH * HOUR_MS);

    const leg: Leg = {
      airline: input.airline,
      flightNumber: `${input.airline}${flightNumber}`,
      originAirport: origin,
      destinationAirport: destination,
      departureTime: new Date(departure).toISOString(),
      boardingTime: new Date(departure - 40 * MIN_MS).toISOString(),
      arrivalTime: new Date(arrival).toISOString(),
    };
    return { ok: true, leg };
  },
};
