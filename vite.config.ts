import { resolve } from "node:path"
import { defineConfig } from "vite"

export default defineConfig({
  base: "./",
  build: {
    emptyOutDir: true,
    target: "chrome114",
    rolldownOptions: {
      input: {
        popup: resolve(import.meta.dirname, "popup/index.html"),
        sidepanel: resolve(import.meta.dirname, "sidepanel/index.html")
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
})
