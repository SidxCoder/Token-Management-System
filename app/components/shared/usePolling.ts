"use client";

import { useEffect } from "react";

// Runs `load` immediately, then on an interval, and stops entirely while the tab
// is hidden — a backgrounded dashboard was still hitting the database every 4s
// per open tab. Returning to the tab refreshes at once rather than waiting out
// the remaining interval.
//
// `load` belongs in the dependency list (it is a useCallback keyed on the
// search/sort/window state), so changing any of those still refetches straight
// away instead of on the next tick.
export function usePolling(load: () => void | Promise<void>, intervalMs: number) {
  useEffect(() => {
    let timer: number | undefined;

    const run = () => void load();

    const start = () => {
      if (timer === undefined) timer = window.setInterval(run, intervalMs);
    };

    const stop = () => {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        run();
        start();
      }
    };

    run();
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [load, intervalMs]);
}
