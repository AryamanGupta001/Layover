import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/flights";
import type { Leg } from "@/lib/flights/types";
import { hashPnr, normalizePnr } from "@/lib/pnr";
import { isKnownAirline } from "@/lib/airlines";
import { MAX_LEGS, validateChain } from "@/lib/journey";
import { poolWindow } from "@/lib/pools";

type LegInput = { airline: string; pnr: string; flightNumber?: string; date?: string };

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Complete your profile first." }, { status: 409 });

  const body = (await req.json().catch(() => null)) as { legs?: LegInput[] } | null;
  const inputs = body?.legs;
  if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > MAX_LEGS) {
    return NextResponse.json({ error: `Send between 1 and ${MAX_LEGS} flights.` }, { status: 400 });
  }

  // Resolve every leg through the provider, passing the previous leg for connections.
  const provider = getProvider();
  const legs: Leg[] = [];
  const pnrHashes: string[] = [];
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const pnr = normalizePnr(input.pnr ?? "");
    if (!pnr || !isKnownAirline(input.airline)) {
      return NextResponse.json(
        { error: `Check the airline and PNR for flight ${i + 1}.`, legIndex: i },
        { status: 400 }
      );
    }
    const result = await provider.lookup({
      airline: input.airline,
      pnr,
      flightNumber: input.flightNumber,
      date: input.date,
      previous: legs[i - 1],
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, reason: result.reason, legIndex: i },
        { status: result.reason === "provider_error" ? 502 : 422 }
      );
    }
    legs.push(result.leg);
    pnrHashes.push(hashPnr(input.airline, pnr));
  }

  const chain = validateChain(legs);
  if (!chain.ok) return NextResponse.json({ error: chain.error }, { status: 422 });

  const first = legs[0];
  const last = legs[legs.length - 1];
  const window = poolWindow(new Date(last.arrivalTime), last.destinationAirport);

  // Writes go through the service role: users cannot create pools or journeys directly.
  const admin = createAdminClient();

  const { data: pool, error: poolError } = await admin
    .from("pools")
    .upsert(
      {
        pool_key: window.key,
        airport: window.airport,
        window_start: window.start.toISOString(),
        window_end: window.end.toISOString(),
      },
      { onConflict: "pool_key" }
    )
    .select("id")
    .single();
  if (poolError || !pool) return NextResponse.json({ error: "Could not create the pool." }, { status: 500 });

  const { data: journey, error: journeyError } = await admin
    .from("journeys")
    .insert({
      user_id: user.id,
      origin_airport: first.originAirport,
      final_airport: last.destinationAirport,
      final_arrival: last.arrivalTime,
      pool_id: pool.id,
    })
    .select("id")
    .single();
  if (journeyError || !journey) return NextResponse.json({ error: "Could not save the journey." }, { status: 500 });

  const { error: legsError } = await admin.from("legs").insert(
    legs.map((leg, index) => ({
      journey_id: journey.id,
      leg_index: index,
      airline: leg.airline,
      flight_number: leg.flightNumber,
      pnr_hash: pnrHashes[index],
      origin_airport: leg.originAirport,
      destination_airport: leg.destinationAirport,
      departure_time: leg.departureTime,
      boarding_time: leg.boardingTime,
      arrival_time: leg.arrivalTime,
    }))
  );
  if (legsError) {
    await admin.from("journeys").delete().eq("id", journey.id); // keep the data consistent on partial failure
    return NextResponse.json({ error: "Could not save the flights." }, { status: 500 });
  }

  const { error: memberError } = await admin
    .from("pool_members")
    .upsert(
      { pool_id: pool.id, user_id: user.id, journey_id: journey.id },
      { onConflict: "pool_id,user_id" }
    );
  if (memberError) {
    await admin.from("journeys").delete().eq("id", journey.id);
    return NextResponse.json({ error: "Could not join the pool." }, { status: 500 });
  }

  return NextResponse.json({ poolId: pool.id, journeyId: journey.id });
}
