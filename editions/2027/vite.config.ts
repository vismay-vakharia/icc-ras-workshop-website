import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// base './' keeps asset paths relative, so the build works at any URL (e.g. /2027/).
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
