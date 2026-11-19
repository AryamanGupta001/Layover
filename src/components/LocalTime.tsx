"use client";

import { useEffect, useState } from "react";

// Times are rendered after mount so the server and client markup match, and they
// show in the viewer's own time zone.
export default function LocalTime({ iso, timeOnly = false }: { iso: string; timeOnly?: boolean }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const date = new Date(iso);
    setText(
      date.toLocaleString(
        [],
        timeOnly
          ? { hour: "2-digit", minute: "2-digit" }
          : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
      )
    );
  }, [iso, timeOnly]);

  return <time dateTime={iso}>{text}</time>;
}
