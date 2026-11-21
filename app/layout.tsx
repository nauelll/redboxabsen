import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
<<<<<<< HEAD
  title: "REDBOX Live Attendance — Nauell Tech",
  description: "Sistem absensi dan manajemen performa host live REDBOX oleh Nauell Tech",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
=======
  title: "REDBOX Live Attendance",
  description: "Sistem absensi host live REDBOX"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca
}