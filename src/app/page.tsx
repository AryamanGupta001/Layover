import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="container">
      <h1>Landing at the same time? Say hello.</h1>
      <p className="lead">
        Add your flight, and Layover puts you in a room with the other travelers reaching the same airport around the
        same time. Chat, share a ride, grab a coffee, or just network.
      </p>

      <Link href={user ? "/journey/new" : "/login"} className="btn">
        {user ? "Add your journey" : "Get started"}
      </Link>

      <div className="card" style={{ marginTop: 32 }}>
        <h2>How it works</h2>
        <ol>
          <li>Verify your email with a one-time code and set up a short profile.</li>
          <li>Pick your airline and enter your PNR. Add your connecting flights too, if you have any.</li>
          <li>We pool you with people finishing their trip at the same airport in the same landing window.</li>
          <li>Chat with them while you board, fly, and land.</li>
        </ol>
      </div>
    </main>
  );
}
