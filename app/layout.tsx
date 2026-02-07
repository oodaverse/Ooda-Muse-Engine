import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ooda Muse Engine",
  description: "Vibrant creative workspace with OodaVerse community uploads."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
