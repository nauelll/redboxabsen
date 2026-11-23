import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "REDBOX LIVE ATTENDANCE",
    short_name: "REDBOX",
    description: "Aplikasi absensi host live REDBOX",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#FAF7F2",
    theme_color: "#dc2626",
    icons: [
      { src: "/icon.png", sizes: "any", type: "image/png", purpose: "any" },
    ],
  };
}