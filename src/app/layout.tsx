import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Typing Duels",
  description: "Challenge another player to a live 1v1 typing race.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
