import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Seen from the Stands",
    template: "%s | Seen from the Stands",
  },
  description: "A personal archive of football matches attended in person.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Seen from the Stands home">
            <span className="brand-mark" aria-hidden="true">S</span>
            <span className="brand-name">
              <span>Seen from</span>
              <strong>the Stands</strong>
            </span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/">The archive</Link>
            <Link href="/matches/">Match log</Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          A personal archive of matches attended in person.
        </footer>
      </body>
    </html>
  );
}
