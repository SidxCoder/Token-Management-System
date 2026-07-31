"use client";

import { useEffect, useRef } from "react";

// Runs `load` immediately, then on an interval, and stops entirely while the tab
// is hidden — a backgrounded dashboard was still hitting the database every 4s
// per open tab. Returning to the tab refreshes at once rather than waiting out
// the remaining interval.
//
// `load` belongs in the dependency list (it is a useCallback keyed on the
// search/sort/window state), so changing any of those still refetches straight
// away instead of on the next tick.
export function usePolling(
  load: () => void | Promise<void>,
  intervalMs: number,
  // Set when the page server-rendered the first screenful: the data is already
  // fresh, so refetching on mount would just repeat the query the server ran.
  // Only the very first run is skipped — a later sort/search change still
  // refetches immediately, because that re-creates `load`.
  skipInitialRun = false,
) {
  const skipNext = useRef(skipInitialRun);

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

    if (skipNext.current) {
      skipNext.current = false;
    } else {
      run();
    }
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [load, intervalMs]);
}
