import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TapMenu 3D — Restaurant Ordering",
    short_name: "TapMenu",
    description: "A beautiful NFC-powered restaurant menu and ordering experience.",
    start_url: "/",
    display: "standalone",
    background_color: "#090607",
    theme_color: "#7f1724",
    orientation: "portrait",
    categories: ["food", "business"],
  };
}
