import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedCallback } from "../modules/CandidateSearch/Components/useDebouncedCallback";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup() {
  const callback = vi.fn<(value: string) => void>();
  const hook = renderHook(() => useDebouncedCallback(callback, 300));
  return { callback, debounced: hook.result.current, unmount: hook.unmount };
}

describe("useDebouncedCallback", () => {
  it("calls once with the latest arguments after the delay", () => {
    const { callback, debounced } = setup();

    debounced.schedule("m");
    vi.advanceTimersByTime(200);
    debounced.schedule("ma");
    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledExactlyOnceWith("ma");
  });

  it("flush runs the waiting call immediately and only once", () => {
    const { callback, debounced } = setup();

    debounced.schedule("marco");
    debounced.flush();
    vi.advanceTimersByTime(300);

    expect(callback).toHaveBeenCalledExactlyOnceWith("marco");
  });

  it("flush does nothing when no call is waiting", () => {
    const { callback, debounced } = setup();

    debounced.flush();

    expect(callback).not.toHaveBeenCalled();
  });

  it("cancel drops the waiting call", () => {
    const { callback, debounced } = setup();

    debounced.schedule("marco");
    debounced.cancel();
    vi.advanceTimersByTime(300);

    expect(callback).not.toHaveBeenCalled();
  });

  it("drops the waiting call on unmount", () => {
    const { callback, debounced, unmount } = setup();

    debounced.schedule("marco");
    unmount();
    vi.advanceTimersByTime(300);

    expect(callback).not.toHaveBeenCalled();
  });
});
