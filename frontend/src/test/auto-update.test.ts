import { describe, it, expect, beforeEach } from "vitest";
import {
  extractBuildAssetsFromHtml,
  getCurrentDomSignature,
  isSafeToAutoSwap,
} from "@/lib/autoUpdate";

describe("Pre-Cached Micro-Idle Auto-Updater", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  });

  it("extracts the entry bundle signature and all hashed /assets/ URLs from index.html", () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <script type="module" crossorigin src="/assets/index-D_tRioZV.js"></script>
          <link rel="modulepreload" crossorigin href="/assets/react-vendor-DbLiHL-j.js">
          <link rel="stylesheet" crossorigin href="/assets/index-4NQDJlr4.css">
        </head>
        <body><div id="root"></div></body>
      </html>
    `;

    const { signature, assetUrls } = extractBuildAssetsFromHtml(html);
    expect(signature).toBe("/assets/index-D_tRioZV.js");
    expect(assetUrls).toEqual([
      "/assets/index-D_tRioZV.js",
      "/assets/react-vendor-DbLiHL-j.js",
      "/assets/index-4NQDJlr4.css",
    ]);
  });

  it("returns null signature in local Vite dev mode", () => {
    document.body.innerHTML = `<script type="module" src="/src/main.tsx"></script>`;
    expect(getCurrentDomSignature(document)).toBeNull();
  });

  it("blocks auto-swap while counter has unsaved dirty taps", () => {
    localStorage.setItem("counter_dirty", "true");
    const lastActivity = 1000;
    const now = 20_000; // 19s idle
    expect(isSafeToAutoSwap(lastActivity, now, document, localStorage)).toBe(false);
  });

  it("blocks auto-swap while an input or textarea is focused", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const lastActivity = 1000;
    const now = 20_000;
    expect(isSafeToAutoSwap(lastActivity, now, document, localStorage)).toBe(false);
  });

  it("blocks auto-swap while a modal dialog is open", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("data-state", "open");
    document.body.appendChild(dialog);

    const lastActivity = 1000;
    const now = 20_000;
    expect(isSafeToAutoSwap(lastActivity, now, document, localStorage)).toBe(false);
  });

  it("blocks auto-swap if user tapped within the last 5 seconds", () => {
    const lastActivity = 10_000;
    const now = 12_500; // only 2.5s since last tap
    expect(isSafeToAutoSwap(lastActivity, now, document, localStorage)).toBe(false);
  });

  it("allows auto-swap once counts are synced, no dialogs are open, and user is idle >= 5s", () => {
    const lastActivity = 10_000;
    const now = 15_500; // 5.5s idle
    expect(isSafeToAutoSwap(lastActivity, now, document, localStorage)).toBe(true);
  });
});
