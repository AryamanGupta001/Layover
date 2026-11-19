import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LocalTime from "@/components/LocalTime";

type PoolRow = { pool_id: string; pools: { airport: string; window_start: string; window_end: string } | null };

export default async function MyPoolsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("pool_members")
    .select("pool_id, pools(airport, window_start, window_end)")
    .eq("user_id", user!.id)
    .order("joined_at", { ascending: false });
  const rows = (data ?? []) as unknown as PoolRow[];

  return (
    <main className="container">
      <h1>My pools</h1>
      <p className="lead">Every airport group you have joined.</p>

      {rows.length === 0 && (
        <div className="card">
          <p>
            You are not in any pool yet. <Link href="/journey/new">Add a journey</Link> to join one.
          </p>
        </div>
      )}

      {rows.map((row) =>
        row.pools ? (
          <div className="card" key={row.pool_id}>
            <h2>
              <Link href={`/pool/${row.pool_id}`}>Landing at {row.pools.airport}</Link>
            </h2>
            <span className="muted">
              <LocalTime iso={row.pools.window_start} /> to <LocalTime iso={row.pools.window_end} />
            </span>
          </div>
        ) : null
      )}
    </main>
  );
}
