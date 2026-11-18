import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Served from https://icc-ras-workshop.github.io/2027/
export default defineConfig({
  base: "/2027/",
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },
});
