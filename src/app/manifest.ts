import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Instay",
    short_name: "Instay",
    description: "Intelligent Properties Management System",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0A0A0A",
    icons: [
      {
        src: "/logo-mobile.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
