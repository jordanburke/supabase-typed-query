import { defineConfig } from "tsdown"

const isProduction = process.env.NODE_ENV === "production"

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: isProduction,
  target: "es2022",
  outDir: "dist",
  platform: "neutral",
  treeshake: true,
  external: ["@supabase/supabase-js", "functype", /^@supabase\//, /^functype\//],
  outExtensions: () => ({
    js: ".js",
    dts: ".d.ts",
  }),
})
