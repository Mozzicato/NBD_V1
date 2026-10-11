import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "No Broke Dayz",
    short_name: "NoBrokeDayz",
    description: "Verified campus micro-jobs with escrow-protected pay.",
    start_url: "/jobs",
    display: "standalone",
    background_color: "#faf5ff",
    theme_color: "#7c3aed",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
