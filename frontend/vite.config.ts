/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 3000,
    hmr: {
      overlay: false,
    },
    watch: {
      ignored: ["**/*.mp4", "**/*.mov"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' http://localhost:5000 https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com",
        "frame-src 'self' https://docs.google.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    },
  },
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/@tanstack/react-query")) {
            return "query-vendor";
          }
          if (id.includes("node_modules/jspdf") || id.includes("node_modules/html2canvas")) {
            return "pdf-vendor";
          }
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "charts-vendor";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons-vendor";
          }
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"], server: { deps: { inline: ["@testing-library/jest-dom"] } },
  },
}));
