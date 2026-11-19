"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, Profile } from "@/lib/types";

type Props = {
  poolId: string;
  userId: string;
  initialMessages: ChatMessage[];
  names: Record<string, string>; // user id -> display name
};

export default function Chat({ poolId, userId, initialMessages, names }: Props) {
  const [supabase] = useState(() => createClient());
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [nameMap, setNameMap] = useState<Record<string, string>>(names);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const requested = useRef<Set<string>>(new Set());

  const addMessage = (msg: ChatMessage) =>
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));

  // Live updates from other travelers in this pool.
  useEffect(() => {
    const channel = supabase
      .channel(`pool:${poolId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `pool_id=eq.${poolId}` },
        (payload) => addMessage(payload.new as ChatMessage)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, poolId]);

  // Someone may join after this page loaded; look up their name the first time they speak.
  useEffect(() => {
    for (const msg of messages) {
      if (nameMap[msg.user_id] || requested.current.has(msg.user_id)) continue;
      requested.current.add(msg.user_id);
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", msg.user_id)
        .maybeSingle()
        .then(({ data }) => {
          const profile = data as Pick<Profile, "id" | "full_name"> | null;
          if (profile) setNameMap((prev) => ({ ...prev, [profile.id]: profile.full_name }));
        });
    }
  }, [messages, nameMap, supabase]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from("messages")
      .insert({ pool_id: poolId, user_id: userId, body })
      .select()
      .single();
    setBusy(false);
    if (error) return setError("Could not send your message. Please try again.");
    setText("");
    addMessage(data as ChatMessage);
  }

  return (
    <div className="card chat">
      <h2>Pool chat</h2>
      <div className="chat-log" ref={logRef}>
        {messages.length === 0 && <p className="muted">No messages yet. Introduce yourself.</p>}
        {messages.map((msg) => {
          const mine = msg.user_id === userId;
          return (
            <div key={msg.id} className={mine ? "msg mine" : "msg"}>
              {!mine && <div className="who">{nameMap[msg.user_id] ?? "Traveler"}</div>}
              <span className="bubble">{msg.body}</span>
            </div>
          );
        })}
      </div>
      <form className="chat-form" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Say hi, ask about a shared ride..."
          aria-label="Message"
        />
        <button className="btn" type="submit" disabled={busy || !text.trim()}>
          Send
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
