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
    background_color: "#111014",
    theme_color: "#dc2626",
    icons: [
      { src: "/redbox-app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}