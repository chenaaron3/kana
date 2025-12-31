import type { StateCreator } from "zustand";

// Dev logging middleware
export const loggerMiddleware =
  <T>(config: StateCreator<T>, name?: string) =>
  (set: any, get: any, api: any) =>
    config(
      (...args: any[]) => {
        if (import.meta.env.DEV) {
          console.log(`[${name || "Store"}]`, ...args);
        }
        return set(...args);
      },
      get,
      api
    );
