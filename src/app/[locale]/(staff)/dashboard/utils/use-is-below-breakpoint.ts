"use client";

import { useMemo, useSyncExternalStore } from "react";

export const useIsBelowBreakpoint = (breakpoint: number) => {
  const mediaQuery = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.matchMedia(`(max-width: ${breakpoint}px)`);
  }, [breakpoint]);

  return useSyncExternalStore(
    (onStoreChange) => {
      if (!mediaQuery) return () => {};
      const handleChange = () => {
        onStoreChange();
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    },
    () => mediaQuery?.matches ?? false,
    () => false,
  );
};
