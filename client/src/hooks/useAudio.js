import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AUDIO_STORAGE_KEY, MUSIC_TRACKS, SFX } from '../constants/audio.js';

const DEFAULT_PREFS = {
  muted: false,
  musicVolume: 0.7,
  sfxVolume: 0.8,
};

function clampVolume(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUDIO_STORAGE_KEY) || 'null');
    return {
      ...DEFAULT_PREFS,
      ...saved,
      musicVolume: clampVolume(saved?.musicVolume ?? DEFAULT_PREFS.musicVolume),
      sfxVolume: clampVolume(saved?.sfxVolume ?? DEFAULT_PREFS.sfxVolume),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function fadeAudio(audio, from, to, duration = 600, onDone) {
  const started = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - started) / duration);
    audio.volume = from + (to - from) * progress;
    if (progress < 1) {
      requestAnimationFrame(step);
      return;
    }
    onDone?.();
  };
  audio.volume = from;
  requestAnimationFrame(step);
}

export default function useAudio() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [unlocked, setUnlocked] = useState(false);
  const prefsRef = useRef(prefs);
  const unlockedRef = useRef(unlocked);
  const activeMusicRef = useRef(null);
  const activeContextRef = useRef(null);
  const pendingContextRef = useRef(null);

  useEffect(() => {
    prefsRef.current = prefs;
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(prefs));
    if (activeMusicRef.current) {
      const track = MUSIC_TRACKS[activeContextRef.current];
      activeMusicRef.current.volume = prefs.muted
        ? 0
        : clampVolume(prefs.musicVolume * (track?.volume ?? 1));
    }
  }, [prefs]);

  useEffect(() => {
    unlockedRef.current = unlocked;
  }, [unlocked]);

  const playMusic = useCallback((context) => {
    const track = MUSIC_TRACKS[context];
    if (!track) return;
    pendingContextRef.current = context;
    if (!unlockedRef.current) return;
    if (activeContextRef.current === context && activeMusicRef.current) return;

    const previous = activeMusicRef.current;
    const { muted, musicVolume } = prefsRef.current;
    const targetVolume = muted ? 0 : clampVolume(musicVolume * (track.volume ?? 1));
    const next = new Audio(track.src);
    next.loop = track.loop !== false;
    next.preload = 'auto';
    activeMusicRef.current = next;
    activeContextRef.current = context;

    next.play()
      .then(() => fadeAudio(next, 0, targetVolume, 700))
      .catch(() => {
        if (activeMusicRef.current === next) {
          activeMusicRef.current = null;
          activeContextRef.current = null;
        }
      });

    if (previous) {
      fadeAudio(previous, previous.volume, 0, 450, () => {
        previous.pause();
        previous.src = '';
      });
    }
  }, []);

  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    setUnlocked(true);
    if (pendingContextRef.current) {
      playMusic(pendingContextRef.current);
    }
  }, [playMusic]);

  const playSfx = useCallback((key) => {
    const clip = SFX[key];
    const { muted, sfxVolume } = prefsRef.current;
    if (!clip || !unlockedRef.current || muted) return;
    const audio = new Audio(clip.src);
    audio.volume = clampVolume(sfxVolume * (clip.volume ?? 1));
    audio.play().catch(() => {});
  }, []);

  useEffect(() => {
    const onFirstInteraction = () => unlock();
    window.addEventListener('pointerdown', onFirstInteraction, { once: true });
    window.addEventListener('keydown', onFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };
  }, [unlock]);

  useEffect(() => {
    const interactiveSelector =
      'button:not(:disabled), [role="button"], [data-sfx], [data-sfx-hover]';

    const onPointerOver = (event) => {
      const el = event.target.closest(interactiveSelector);
      if (!el || el.matches(':disabled') || el.contains(event.relatedTarget)) return;
      playSfx(el.dataset.sfxHover || 'buttonHover');
    };

    const onClick = (event) => {
      const el = event.target.closest(interactiveSelector);
      if (!el || el.matches(':disabled')) return;
      if (el.dataset.sfx) {
        playSfx(el.dataset.sfx);
      } else if (el.classList.contains('move-btn')) {
        playSfx('abilityClick');
      } else {
        playSfx('buttonClick');
      }
    };

    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('click', onClick);
    };
  }, [playSfx]);

  const setMuted = useCallback((muted) => {
    setPrefs((current) => ({ ...current, muted }));
  }, []);

  const setMusicVolume = useCallback((musicVolume) => {
    setPrefs((current) => ({ ...current, musicVolume: clampVolume(musicVolume) }));
  }, []);

  const setSfxVolume = useCallback((sfxVolume) => {
    setPrefs((current) => ({ ...current, sfxVolume: clampVolume(sfxVolume) }));
  }, []);

  const toggleMuted = useCallback(() => {
    setPrefs((current) => ({ ...current, muted: !current.muted }));
  }, []);

  return useMemo(
    () => ({
      muted: prefs.muted,
      musicVolume: prefs.musicVolume,
      sfxVolume: prefs.sfxVolume,
      unlocked,
      playMusic,
      playSfx,
      setMuted,
      setMusicVolume,
      setSfxVolume,
      toggleMuted,
    }),
    [
      prefs,
      unlocked,
      playMusic,
      playSfx,
      setMuted,
      setMusicVolume,
      setSfxVolume,
      toggleMuted,
    ]
  );
}
