import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage, PoolLeg, Profile } from "@/lib/types";
import LocalTime from "@/components/LocalTime";
import FlightStatus from "./FlightStatus";
import Chat from "./Chat";

export default async function PoolPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound(); // middleware redirects first; this keeps types honest

  // Row level security returns nothing for pools the user is not a member of.
  const { data: pool } = await supabase
    .from("pools")
    .select("id, airport, window_start, window_end")
    .eq("id", params.id)
    .maybeSingle();
  if (!pool) return notFound();

  const { data: journey } = await supabase
    .from("journeys")
    .select("id")
    .eq("user_id", user.id)
    .eq("pool_id", pool.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: legRows } = journey
    ? await supabase
        .from("legs")
        .select("leg_index, flight_number, origin_airport, destination_airport, departure_time, boarding_time, arrival_time")
        .eq("journey_id", journey.id)
        .order("leg_index")
    : { data: [] };
  const legs = (legRows ?? []) as PoolLeg[];

  const { data: memberRows } = await supabase.from("pool_members").select("user_id").eq("pool_id", pool.id);
  const memberIds = (memberRows ?? []).map((m) => m.user_id as string);
  const { data: profileRows } = await supabase.from("profiles").select("*").in("id", memberIds);
  const profiles = (profileRows ?? []) as Profile[];
  const names = Object.fromEntries(profiles.map((p) => [p.id, p.full_name]));

  const { data: messageRows } = await supabase
    .from("messages")
    .select("id, pool_id, user_id, body, created_at")
    .eq("pool_id", pool.id)
    .order("created_at", { ascending: true })
    .limit(200);
  const messages = (messageRows ?? []) as ChatMessage[];

  return (
    <main className="container">
      <h1>Landing at {pool.airport}</h1>
      <p className="lead">
        Travelers reaching {pool.airport} between <LocalTime iso={pool.window_start} /> and{" "}
        <LocalTime iso={pool.window_end} />. {profiles.length} {profiles.length === 1 ? "person has" : "people have"}{" "}
        joined.
      </p>

      <FlightStatus legs={legs} />

      <div className="card">
        <h2>Who is here</h2>
        <div className="members">
          {profiles.map((p) => (
            <article className="member" key={p.id}>
              <h3>
                {p.full_name}
                {p.id === user.id ? " (you)" : ""}
              </h3>
              <div className="muted">{p.occupation}</div>
              <p style={{ margin: "8px 0" }}>{p.bio}</p>
              <div className="muted" style={{ marginBottom: 8 }}>
                From {p.hometown} · Lives in {p.current_city}
              </div>
              <div>
                {p.languages.map((l) => (
                  <span className="tag" key={`l-${l}`}>
                    {l}
                  </span>
                ))}
                {p.interests.map((i) => (
                  <span className="tag" key={`i-${i}`}>
                    {i}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <Chat poolId={pool.id} userId={user.id} initialMessages={messages} names={names} />
    </main>
  );
}
