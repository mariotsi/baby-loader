'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import styles from './FusionOverlay.module.css';
import { FUSION_SEEN_KEY } from '@/lib/fusion';
import { useLang } from './LangProvider';

export type FusionOverlayHandle = {
  play: () => void;
};

/** Video duration is 5s: a generous margin before we assume `ended` is lost. */
const ENDED_FALLBACK_MS = 12_000;
/** If playback has not actually started by then, something is wrong. */
const START_FALLBACK_MS = 8_000;
/** Must match the opacity transition in FusionOverlay.module.css. */
const FADE_MS = 900;
/**
 * Second at which the clip's own caption used to appear. The garbled AI text
 * has been painted out of the file, so the HTML caption takes its slot at the
 * exact same moment.
 */
const CAPTION_FROM_S = 4.18;
/**
 * The caption is only on screen for the clip's last 0.86s, which is not long
 * enough to read it. Holding the final frame before the fade buys that time.
 */
const HOLD_AFTER_END_MS = 1800;

function hasSeen(): boolean {
  try {
    return window.localStorage.getItem(FUSION_SEEN_KEY) === '1';
  } catch {
    // Safari in private mode throws on access: treat it as already seen so a
    // storage failure cannot trap the visitor behind the video on every load.
    return true;
  }
}

function markSeen(): void {
  try {
    window.localStorage.setItem(FUSION_SEEN_KEY, '1');
  } catch {
    // Nothing to do: the fallback timers still dismiss the overlay.
  }
}

/**
 * Full screen video shown once per browser when the birth has been announced,
 * plus an imperative `play()` for the replay button.
 *
 * The overlay must never trap the visitor: there is deliberately no skip
 * button, so every failure mode (video error, playback that never starts,
 * an `ended` event that never fires) dismisses it automatically.
 */
const FusionOverlay = forwardRef<FusionOverlayHandle>((_props, ref) => {
  const { t } = useLang();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const [phase, setPhase] = useState<'hidden' | 'playing' | 'fading'>('hidden');
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const [captionOn, setCaptionOn] = useState(false);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) {
      clearTimeout(timer);
    }
    timersRef.current = [];
  }, []);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  const dismiss = useCallback(
    (fade: boolean) => {
      clearTimers();
      setNeedsUnmute(false);
      const video = videoRef.current;
      if (video) {
        video.pause();
      }
      if (!fade) {
        setPhase('hidden');
        return;
      }
      setPhase('fading');
      addTimer(() => setPhase('hidden'), FADE_MS);
    },
    [addTimer, clearTimers]
  );

  const holdThenDismiss = useCallback(() => {
    // `ended` arrived, so the start and ended safety nets have done their job:
    // drop them, otherwise the 8s start check would see a paused video mid-hold
    // and cut the caption short on a slow connection.
    clearTimers();
    addTimer(() => dismiss(true), HOLD_AFTER_END_MS);
  }, [addTimer, clearTimers, dismiss]);

  const start = useCallback(
    async (withSound: boolean) => {
      const video = videoRef.current;
      if (!video) {
        return;
      }

      clearTimers();
      setPhase('playing');
      setNeedsUnmute(false);
      video.currentTime = 0;

      // If playback never actually begins, get out of the way rather than
      // leaving a flaky connection staring at a poster forever.
      addTimer(() => {
        if (video.paused || video.currentTime === 0) {
          dismiss(true);
        }
      }, START_FALLBACK_MS);
      addTimer(() => dismiss(true), ENDED_FALLBACK_MS);

      video.muted = !withSound;
      try {
        await video.play();
      } catch {
        if (!withSound) {
          dismiss(false);
          return;
        }
        // Autoplay with sound is blocked without a prior user gesture, which
        // is the common case rather than the exception. Fall back to muted and
        // offer the sound explicitly.
        video.muted = true;
        setNeedsUnmute(true);
        try {
          await video.play();
        } catch {
          dismiss(false);
        }
      }
    },
    [addTimer, clearTimers, dismiss]
  );

  useImperativeHandle(ref, () => ({
    // Replay always comes from a click, so the gesture is already granted and
    // sound is guaranteed to work.
    play: () => void start(true),
  }));

  useEffect(() => {
    if (!hasSeen()) {
      // Marked on open rather than on end, so reloading mid-video does not
      // restart the whole thing.
      markSeen();
      void start(true);
    }
    // The inline script in page.tsx hid the page behind the overlay before the
    // first paint; from here React owns the visibility.
    document.documentElement.dataset.fusione = 'ready';

    return () => clearTimers();
  }, [clearTimers, start]);

  // Drives the caption off the actual playhead rather than `timeupdate`, which
  // only fires a few times a second: the caption is on screen for well under a
  // second, so a quarter-second of slop would be plainly visible.
  useEffect(() => {
    if (phase === 'hidden') {
      setCaptionOn(false);
      return;
    }
    if (phase !== 'playing') {
      // While fading out we freeze the caption as it was, matching the video.
      return;
    }
    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video) {
        setCaptionOn(video.currentTime >= CAPTION_FROM_S);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  // Locking the scroll keeps a half-scrolled page from peeking around the video.
  useEffect(() => {
    if (phase === 'hidden') {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  const unmute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      setNeedsUnmute(false);
    }
  };

  return (
    <div
      className={`${styles.overlay} ${phase === 'fading' ? styles.fading : ''}`}
      data-phase={phase}
      role="dialog"
      aria-label={t.fusionDialogLabel}
      aria-hidden={phase === 'hidden'}
    >
      {/* The stage reproduces exactly the box `object-fit: contain` would give
          the 16:9 clip, so the caption can be positioned as a percentage of it
          and stay welded to the video at every viewport. */}
      <div className={styles.stage}>
        <video
          ref={videoRef}
          className={styles.video}
          src="/fusione.mp4"
          poster="/fusione-poster.jpg"
          preload="auto"
          playsInline
          onEnded={holdThenDismiss}
          onError={() => dismiss(false)}
        />

        <p className={styles.caption} data-visible={captionOn}>
          {t.fusionCaption}
        </p>
      </div>

      {needsUnmute && (
        <button type="button" className={styles.unmute} onClick={unmute}>
          <SoundIcon />
          {t.unmute}
        </button>
      )}
    </div>
  );
});

FusionOverlay.displayName = 'FusionOverlay';

export default FusionOverlay;

function SoundIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}
