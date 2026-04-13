import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "DinosaurType",
  description: "A prehistoric 1v1 typing race where the fastest dino survives.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
