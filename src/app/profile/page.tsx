import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware already redirects signed-out visitors, so user is set here.
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();

  return (
    <main className="container">
      <h1>Your profile</h1>
      <p className="lead">This is what fellow travelers in your pool will see. Keep it friendly.</p>
      <ProfileForm userId={user!.id} initial={(profile as Profile | null) ?? null} />
    </main>
  );
}
