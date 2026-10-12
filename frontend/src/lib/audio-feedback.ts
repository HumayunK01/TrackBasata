// Audio and haptic tactile feedback for rapid document indexing
// Zero network audio assets: synthesizes an ultra-crisp ~10ms mechanical tick using Web Audio API

const FEEDBACK_PREF_KEY = "basata_feedback_enabled";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isFeedbackEnabled(): boolean {
  try {
    const val = localStorage.getItem(FEEDBACK_PREF_KEY);
    // Enabled by default for tactile indexing
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

export function setFeedbackEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(FEEDBACK_PREF_KEY, String(enabled));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Plays a subtle, non-intrusive tactile click and triggers light haptic pulse.
 * Safe to call at high frequencies (up to 10+ times/sec).
 */
export function playTapFeedback(): void {
  if (!isFeedbackEnabled()) return;

  // 1. Synthesized acoustic click (Web Audio API)
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.012);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.012);
    }
  } catch {
    // AudioContext blocked or unsupported
  }

  // 2. Mobile / trackpad haptic pulse (navigator.vibrate)
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(8);
    }
  } catch {
    // Vibration unsupported
  }
}
