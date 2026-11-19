"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AIRLINES } from "@/lib/airlines";
import { MAX_LEGS } from "@/lib/journey";

type LegForm = { airline: string; pnr: string; flightNumber: string; date: string };

const emptyLeg = (): LegForm => ({ airline: AIRLINES[0].code, pnr: "", flightNumber: "", date: "" });

export default function NewJourneyPage() {
  const router = useRouter();
  const [hasConnections, setHasConnections] = useState(false);
  const [connections, setConnections] = useState(1);
  const [legs, setLegs] = useState<LegForm[]>([emptyLeg()]);
  const [needsDetails, setNeedsDetails] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = hasConnections ? connections + 1 : 1;
  const visibleLegs = Array.from({ length: total }, (_, i) => legs[i] ?? emptyLeg());

  function update(index: number, patch: Partial<LegForm>) {
    setLegs((prev) => {
      const next = Array.from({ length: Math.max(prev.length, index + 1) }, (_, i) => prev[i] ?? emptyLeg());
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/journeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legs: visibleLegs.map((leg) => ({
          airline: leg.airline,
          pnr: leg.pnr,
          flightNumber: leg.flightNumber || undefined,
          date: leg.date || undefined,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (res.status === 401) return router.push("/login");
    if (res.status === 409) return router.push("/profile");
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      if (data.reason === "needs_flight_details" && typeof data.legIndex === "number") {
        setNeedsDetails((prev) => (prev.includes(data.legIndex) ? prev : [...prev, data.legIndex]));
      }
      return;
    }
    router.push(`/pool/${data.poolId}`);
  }

  return (
    <main className="container">
      <h1>Add your journey</h1>
      <p className="lead">
        Your pool is formed at the airport where your whole trip ends, so add every flight if you are connecting.
      </p>

      <form onSubmit={submit}>
        <div className="card">
          <h2>Connecting flights</h2>
          <label htmlFor="hasConnections">Do you have a connecting flight?</label>
          <select
            id="hasConnections"
            value={hasConnections ? "yes" : "no"}
            onChange={(e) => setHasConnections(e.target.value === "yes")}
          >
            <option value="no">No, a single flight</option>
            <option value="yes">Yes</option>
          </select>

          {hasConnections && (
            <>
              <label htmlFor="connections">How many connecting flights?</label>
              <select id="connections" value={connections} onChange={(e) => setConnections(Number(e.target.value))}>
                {Array.from({ length: MAX_LEGS - 1 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {visibleLegs.map((leg, i) => (
          <div className="card" key={i}>
            <h2>{i === 0 ? "Your first flight" : `Connecting flight ${i}`}</h2>
            <div className="row">
              <div>
                <label htmlFor={`airline-${i}`}>Airline</label>
                <select id={`airline-${i}`} value={leg.airline} onChange={(e) => update(i, { airline: e.target.value })}>
                  {AIRLINES.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`pnr-${i}`}>PNR</label>
                <input
                  id={`pnr-${i}`}
                  required
                  maxLength={8}
                  autoCapitalize="characters"
                  value={leg.pnr}
                  onChange={(e) => update(i, { pnr: e.target.value.toUpperCase() })}
                  placeholder="ABC123"
                />
              </div>
            </div>

            {needsDetails.includes(i) && (
              <div className="row">
                <div>
                  <label htmlFor={`fn-${i}`}>Flight number</label>
                  <input
                    id={`fn-${i}`}
                    required
                    value={leg.flightNumber}
                    onChange={(e) => update(i, { flightNumber: e.target.value })}
                    placeholder="2345"
                  />
                </div>
                <div>
                  <label htmlFor={`date-${i}`}>Departure date</label>
                  <input
                    id={`date-${i}`}
                    type="date"
                    required
                    value={leg.date}
                    onChange={(e) => update(i, { date: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Finding your pool..." : "Find my pool"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}
