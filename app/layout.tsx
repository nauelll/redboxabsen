import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REDBOX Live Attendance",
  description: "Sistem absensi host live REDBOX"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}