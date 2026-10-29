import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  base: '/nails-tech-cash-flow/',

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

