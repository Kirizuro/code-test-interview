import { useEffect, useMemo, useRef } from "react";

export type DebouncedCallback<Args extends unknown[]> = {
  /** Calls the callback after the delay, replacing any call already waiting. */
  schedule: (...args: Args) => void;
  /** Runs the waiting call now, if there is one. */
  flush: () => void;
  /** Drops the waiting call, if there is one. */
  cancel: () => void;
};

export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): DebouncedCallback<Args> {
  const callbackRef = useRef(callback);
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; args: Args } | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  });

  const debounced = useMemo<DebouncedCallback<Args>>(() => {
    const cancel = () => {
      if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current = null;
      }
    };

    const flush = () => {
      const waiting = pending.current;
      if (waiting) {
        cancel();
        callbackRef.current(...waiting.args);
      }
    };

    const schedule = (...args: Args) => {
      cancel();
      pending.current = { timer: setTimeout(flush, delayMs), args };
    };

    return { schedule, flush, cancel };
  }, [delayMs]);

  useEffect(() => debounced.cancel, [debounced]);

  return debounced;
}
