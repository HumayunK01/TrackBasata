import { describe, it, expect, beforeEach, vi } from "vitest";
import { isFeedbackEnabled, setFeedbackEnabled, playTapFeedback } from "@/lib/audio-feedback";

describe("Tactile Audio & Haptic Feedback", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("defaults to enabled if no preference is explicitly set", () => {
    expect(isFeedbackEnabled()).toBe(true);
  });

  it("persists preference changes to localStorage", () => {
    setFeedbackEnabled(false);
    expect(isFeedbackEnabled()).toBe(false);
    expect(localStorage.getItem("basata_feedback_enabled")).toBe("false");

    setFeedbackEnabled(true);
    expect(isFeedbackEnabled()).toBe(true);
    expect(localStorage.getItem("basata_feedback_enabled")).toBe("true");
  });

  it("does not throw when playTapFeedback is executed in headless/test environment", () => {
    expect(() => playTapFeedback()).not.toThrow();
  });

  it("calls navigator.vibrate when feedback is enabled and vibration is available", () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(globalThis.navigator, "vibrate", {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    setFeedbackEnabled(true);
    playTapFeedback();
    expect(vibrateMock).toHaveBeenCalledWith(8);

    vibrateMock.mockClear();
    setFeedbackEnabled(false);
    playTapFeedback();
    expect(vibrateMock).not.toHaveBeenCalled();
  });
});
