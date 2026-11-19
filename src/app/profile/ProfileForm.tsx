"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

function parseList(text: string): string[] {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 15);
}

export default function ProfileForm({ userId, initial }: { userId: string; initial: Profile | null }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [occupation, setOccupation] = useState(initial?.occupation ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [hometown, setHometown] = useState(initial?.hometown ?? "");
  const [currentCity, setCurrentCity] = useState(initial?.current_city ?? "");
  const [languages, setLanguages] = useState((initial?.languages ?? []).join(", "));
  const [interests, setInterests] = useState((initial?.interests ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName.trim(),
      occupation: occupation.trim(),
      bio: bio.trim(),
      hometown: hometown.trim(),
      current_city: currentCity.trim(),
      languages: parseList(languages),
      interests: parseList(interests),
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/journey/new");
    router.refresh();
  }

  return (
    <form className="card" onSubmit={save}>
      <label htmlFor="fullName">Name</label>
      <input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />

      <label htmlFor="occupation">What do you do?</label>
      <input
        id="occupation"
        required
        value={occupation}
        onChange={(e) => setOccupation(e.target.value)}
        placeholder="Product designer at a fintech startup"
      />

      <label htmlFor="bio">Who are you?</label>
      <textarea
        id="bio"
        required
        maxLength={500}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="A line or two about you"
      />

      <div className="row">
        <div>
          <label htmlFor="hometown">Where do you belong?</label>
          <input
            id="hometown"
            required
            value={hometown}
            onChange={(e) => setHometown(e.target.value)}
            placeholder="Hometown"
          />
        </div>
        <div>
          <label htmlFor="currentCity">Which city do you live in?</label>
          <input id="currentCity" required value={currentCity} onChange={(e) => setCurrentCity(e.target.value)} />
        </div>
      </div>

      <label htmlFor="languages">Languages</label>
      <input
        id="languages"
        required
        value={languages}
        onChange={(e) => setLanguages(e.target.value)}
        placeholder="English, Hindi, Kannada"
      />

      <label htmlFor="interests">Hobbies and interests</label>
      <input
        id="interests"
        required
        value={interests}
        onChange={(e) => setInterests(e.target.value)}
        placeholder="Trekking, startups, photography"
      />
      <p className="muted">Separate languages and interests with commas.</p>

      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Saving..." : "Save and continue"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
