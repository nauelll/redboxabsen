import type { Metadata } from "next";
import "./globals.css";
import MusicPlayer from "@/components/MusicPlayer";

export const metadata: Metadata = {
  title: "REDBOX Live Attendance — Nauell Tech",
  description: "Sistem absensi dan manajemen performa host live REDBOX oleh Nauell Tech",
  applicationName: "REDBOX LIVE ATTENDANCE",
  manifest: "/manifest.webmanifest",
  themeColor: "#dc2626",
  icons: {
    icon: [{ url: "/redbox-app-icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/redbox-app-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/redbox-app-icon.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    title: "REDBOX Attendance",
    statusBarStyle: "default",
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