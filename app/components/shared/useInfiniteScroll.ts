"use client";

import { useEffect, useRef } from "react";

// Attach the returned ref to a sentinel element at the end of a list. When it
// scrolls into view, `onReach` fires.
//
// The observer deliberately uses the viewport as its root rather than the list
// pane: below `lg` these lists have no internal scroller and the page itself
// scrolls, so a fixed root element would never intersect. Ancestor clipping is
// already accounted for, which covers the `lg` case where the pane does scroll.
export function useInfiniteScroll(onReach: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const handler = useRef(onReach);

  // Kept in a ref so a new inline callback each render does not tear down and
  // rebuild the observer.
  useEffect(() => {
    handler.current = onReach;
  }, [onReach]);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handler.current();
      },
      // Start fetching slightly before the sentinel is actually visible.
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  return ref;
}
