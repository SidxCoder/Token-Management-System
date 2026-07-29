"use client";

import { useEffect, useState } from "react";

// Search is server-side, so every keystroke would otherwise be a request. This
// keeps the input responsive and only lets the value through once typing pauses.
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
