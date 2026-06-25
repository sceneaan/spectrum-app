import {
  pauseSessionTimeout,
  resumeSessionTimeout,
  isSessionTimeoutPaused,
} from '../../src/utils/sessionPause';

describe('sessionPause', () => {
  afterEach(() => {
    while (isSessionTimeoutPaused()) {
      resumeSessionTimeout();
    }
  });

  test('pause/resume counter', () => {
    expect(isSessionTimeoutPaused()).toBe(false);
    pauseSessionTimeout();
    expect(isSessionTimeoutPaused()).toBe(true);
    resumeSessionTimeout();
    expect(isSessionTimeoutPaused()).toBe(false);
  });

  test('nested pause requires matching resumes', () => {
    pauseSessionTimeout();
    pauseSessionTimeout();
    expect(isSessionTimeoutPaused()).toBe(true);
    resumeSessionTimeout();
    expect(isSessionTimeoutPaused()).toBe(true);
    resumeSessionTimeout();
    expect(isSessionTimeoutPaused()).toBe(false);
  });
});
