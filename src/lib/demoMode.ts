// src/lib/demoMode.ts
export const isDemoMode =
  String(import.meta.env.VITE_DEMO_MODE || "").toLowerCase() === "true";
