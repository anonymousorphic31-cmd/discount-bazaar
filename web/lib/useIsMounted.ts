"use client";

import { useEffect, useState } from "react";

/**
 * Returns true only after the component has mounted on the client. Use this to
 * guard rendering of values that differ between server and client (e.g.
 * `new Date().toLocaleDateString()`), preventing React hydration mismatches.
 */
export function useIsMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
