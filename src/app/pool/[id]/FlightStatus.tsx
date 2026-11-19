"use client";

import { useEffect, useState } from "react";
import type { PoolLeg } from "@/lib/types";
import LocalTime from "@/components/LocalTime";

type Status = { title: string; detail: string; target: number | null };

const MINUTE = 60_000;
const ABOUT_TO_LAND_MS = 30 * MINUTE;

export function computeStatus(legs: PoolLeg[], now: number): Status {
  const at = (iso: string) => new Date(iso).getTime();
  const last = legs[legs.length - 1];
  const landed: Status = {
    title: `Landed at ${last.destination_airport}`,
    detail: "You landed together with the travelers below. Say hello.",
    target: null,
  };
  if (now >= at(last.arrival_time)) return landed;

  for (const leg of legs) {
    const route = `${leg.flight_number}: ${leg.origin_airport} to ${leg.destination_airport}`;
    if (now < at(leg.boarding_time)) {
      return { title: "Boarding starts in", detail: route, target: at(leg.boarding_time) };
    }
    if (now < at(leg.departure_time)) {
      return { title: "Boarding now. Boarding closes in", detail: route, target: at(leg.departure_time) };
    }
    if (now < at(leg.arrival_time)) {
      const soon = at(leg.arrival_time) - now <= ABOUT_TO_LAND_MS;
      return {
        title: soon ? `About to land at ${leg.destination_airport} in` : `In the air. Landing at ${leg.destination_airport} in`,
        detail: route,
        target: at(leg.arrival_time),
      };
    }
    // This leg is done; the next iteration reports the connection.
  }
  return landed;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function FlightStatus({ legs }: { legs: PoolLeg[] }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (legs.length === 0) return null;
  const status = now === null ? null : computeStatus(legs, now);

  return (
    <>
      <div className="card status">
        <div>
          <strong>{status?.title ?? "Checking your flight..."}</strong>
          <div className="muted">{status?.detail}</div>
        </div>
        {status?.target != null && now !== null && <div className="clock">{formatCountdown(status.target - now)}</div>}
      </div>

      <div className="card">
        <h2>Your flights</h2>
        {legs.map((leg) => (
          <p key={leg.leg_index} style={{ margin: "0 0 8px" }}>
            <strong>{leg.flight_number}</strong> {leg.origin_airport} to {leg.destination_airport}
            <span className="muted">
              {" "}
              · boards <LocalTime iso={leg.boarding_time} timeOnly /> · departs <LocalTime iso={leg.departure_time} /> ·
              lands <LocalTime iso={leg.arrival_time} />
            </span>
          </p>
        ))}
      </div>
    </>
  );
}
