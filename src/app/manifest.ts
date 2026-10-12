import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "No Broke Dayz",
    short_name: "NoBrokeDayz",
    description: "Verified campus micro-jobs with escrow-protected pay.",
    start_url: "/jobs",
    display: "standalone",
    background_color: "#f0fdf4",
    theme_color: "#15803d",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
