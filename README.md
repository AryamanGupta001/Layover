# Layover

Meet the strangers landing at your airport at the same time. Enter your airline and PNR, get pooled with
travelers finishing their trip at the same airport in the same landing window, then chat, share a ride, or network.

Stack: Next.js 14 (App Router), TypeScript, Supabase (email OTP auth, Postgres, row level security, realtime).

## Setup

1. Create a Supabase project.
2. In the SQL editor, run `supabase/schema.sql`.
3. Auth settings: enable the Email provider. In Authentication > Email Templates (Magic Link), include
   `{{ .Token }}` so the email carries the 6-digit code (the login page asks for the code, not a link).
4. Copy `.env.example` to `.env.local` and fill in the Supabase URL, anon key, service role key, and a long random
   `PNR_HASH_SECRET`.
5. `npm install` then `npm run dev`.

## How it works

- Login: email, then a one-time code, then `/profile` (name, what you do, who you are, hometown, city, languages, interests).
- Journey (`/journey/new`): choose connecting or not, then airline + PNR per flight. Each leg is resolved through a
  `FlightProvider`. The chain is validated (each leg starts where the last ended).
- Pool: the journey's final airport plus its landing time, bucketed into 2-hour windows
  (`src/lib/pools.ts`). Same bucket means same pool.
- Pool page: members' profiles, live chat, and a status clock (boarding starts, boarding closes, in the air,
  about to land, landed).
- PNRs are never stored. Only an HMAC hash is kept (`src/lib/pnr.ts`).

## Important: flight data is mocked

`FLIGHT_PROVIDER=mock` invents flights from the PNR. No public API returns flight details from a PNR alone, since PNRs live in
airline and GDS systems. To go live, implement `FlightProvider` (`src/lib/flights/types.ts`) and register it in
`src/lib/flights/index.ts`. Options: a GDS/airline partnership (true PNR lookup), or a flight-status API keyed by
flight number + date. The journey form already reveals flight number and date fields when a provider returns
`needs_flight_details`.

## Known limitations

- Fixed 2-hour buckets: flights landing minutes apart across a boundary end up in different pools. Overlapping windows are the fix.
- Mobile OTP is not included (email only, as chosen). Add an SMS provider later.
- Anyone with a valid-looking PNR format can join; real verification of booking comes with a real provider.
- No moderation, reporting, or blocking yet. Add these before a public launch since this connects strangers.
- Flight times are not refreshed for delays.
- Not yet built or run here: dependencies could not be installed in this environment, so `npm run build` and
  `npm run typecheck` have not been run on the full app.
