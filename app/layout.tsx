import type { Metadata } from "next";
import "./globals.css";
import MusicPlayer from "@/components/MusicPlayer";

export const metadata: Metadata = {
  title: "REDBOX Live Attendance — Nauell Tech",
  description: "Sistem absensi dan manajemen performa host live REDBOX oleh Nauell Tech",
  applicationName: "REDBOX LIVE ATTENDANCE",
  manifest: "/manifest.webmanifest",
  themeColor: "#dc2626",
  appleWebApp: {
    capable: true,
    title: "REDBOX Attendance",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
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