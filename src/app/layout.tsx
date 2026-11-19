import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Layover",
  description: "Meet the strangers landing at your airport at the same time.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            Layover
          </Link>
          <nav className="nav">
            {user ? (
              <>
                <Link href="/pool">My pools</Link>
                <Link href="/journey/new">New journey</Link>
                <Link href="/profile">Profile</Link>
                <form action="/auth/signout" method="post">
                  <button type="submit" className="link-button">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login">Sign in</Link>
            )}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
