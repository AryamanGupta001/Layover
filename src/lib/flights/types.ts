export type Leg = {
  airline: string;
  flightNumber: string;
  originAirport: string; // IATA
  destinationAirport: string; // IATA
  departureTime: string; // ISO 8601
  boardingTime: string; // ISO 8601
  arrivalTime: string; // ISO 8601
};

export type LookupInput = {
  airline: string;
  pnr: string;
  /** Fallback fields for providers that cannot resolve a PNR on its own. */
  flightNumber?: string;
  date?: string; // YYYY-MM-DD
  /** Previous leg of a connecting journey, if any. */
  previous?: Leg;
};

export type LookupFailure = "not_found" | "needs_flight_details" | "provider_error";

export type LookupResult =
  | { ok: true; leg: Leg }
  | { ok: false; reason: LookupFailure; message: string };

export interface FlightProvider {
  readonly name: string;
  lookup(input: LookupInput): Promise<LookupResult>;
}
