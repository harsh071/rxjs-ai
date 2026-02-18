import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "rxjs-ai": resolve(__dirname, "../src/index.ts"),
    },
  },
});
