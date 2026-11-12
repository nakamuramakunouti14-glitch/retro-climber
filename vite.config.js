import { defineConfig } from "vite";

// GitHub Pages では https://<ユーザー名>.github.io/retro-climber/ の下に置かれるため、base をそのパスにする
export default defineConfig({
  base: "/retro-climber/",
  build: { outDir: "dist", assetsInlineLimit: 0, chunkSizeWarningLimit: 2000 },
});
