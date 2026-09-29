import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const base = env.VITE_BASE_PATH || "/";
  return {
    base: base.endsWith("/") ? base : `${base}/`,
    plugins: [react(), VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "끼리 - 함께 정하는 밥약",
        short_name: "끼리",
        description: "친구들과 빠르게 밥집을 합의하는 앱",
        theme_color: "#fffaf2",
        background_color: "#fffaf2",
        display: "standalone",
        lang: "ko",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }]
      }
    })]
  };
});
