import type { FlightProvider } from "./types";
import { mockProvider } from "./mock";

// Register real providers here (for example a GDS adapter or a flight-status API
// keyed by flight number + date). Each one implements FlightProvider.
const providers: Record<string, FlightProvider> = {
  mock: mockProvider,
};

export function getProvider(): FlightProvider {
  const name = process.env.FLIGHT_PROVIDER ?? "mock";
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown FLIGHT_PROVIDER "${name}". Known: ${Object.keys(providers).join(", ")}`);
  }
  return provider;
}
