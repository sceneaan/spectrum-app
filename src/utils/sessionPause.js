let pauseCount = 0;

/** Pause inactivity logout (e.g. during an active video call). */
export function pauseSessionTimeout() {
  pauseCount += 1;
}

export function resumeSessionTimeout() {
  pauseCount = Math.max(0, pauseCount - 1);
}

export function isSessionTimeoutPaused() {
  return pauseCount > 0;
}
