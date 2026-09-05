import { useEffect, useState } from "react";

/**
 * Live clock. `fps` = "raf" for 60fps (millisecond counters) or a number for
 * throttled updates. Automatically pauses when the tab is hidden and re-syncs
 * on return, so counters never "jump" or flicker.
 */
export function useNow(fps: number | "raf" = "raf"): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let running = true;
    const interval = fps === "raf" ? 0 : 1000 / fps;

    const loop = (t: number) => {
      if (!running) return;
      if (t - last >= interval) {
        last = t;
        setNow(Date.now());
      }
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      running = true;
      setNow(Date.now());
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fps]);

  return now;
}
