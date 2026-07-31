"use client";

import { useCallback, useRef, useState } from "react";

// Errors used to vanish about a second after appearing: every list clears its
// error at the top of `load`, and `load` runs on a 4s poll — so a message from
// a user action survived only until the next tick.
//
// Tracking which side raised the error fixes that. A failed poll still clears
// itself once the next poll succeeds, but an action's error stays put until the
// user does something else or dismisses it.
export function useActionError() {
  const [error, setError] = useState<string | null>(null);
  const fromLoad = useRef(false);

  const setActionError = useCallback((message: string | null) => {
    fromLoad.current = false;
    setError(message);
  }, []);

  const setLoadError = useCallback((message: string) => {
    fromLoad.current = true;
    setError(message);
  }, []);

  // Called after a successful poll: clears a previous load failure, leaves an
  // action error alone.
  const clearLoadError = useCallback(() => {
    if (fromLoad.current) {
      fromLoad.current = false;
      setError(null);
    }
  }, []);

  return { error, setActionError, setLoadError, clearLoadError };
}
