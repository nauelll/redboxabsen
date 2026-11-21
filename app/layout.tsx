import type { Metadata } from "next";
import "./globals.css";
import MusicPlayer from "@/components/MusicPlayer";

export const metadata: Metadata = {
  title: "REDBOX Live Attendance — Nauell Tech",
  description: "Sistem absensi dan manajemen performa host live REDBOX oleh Nauell Tech",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}<MusicPlayer /></body>
    </html>
  );
}