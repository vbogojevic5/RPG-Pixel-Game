/**
 * Speaker icons: Heroicons v2 outline (MIT) — SpeakerWaveIcon / SpeakerXMarkIcon
 * https://github.com/tailwindlabs/heroicons
 */
function SpeakerIcon({ muted }) {
  const common = {
    className: 'audio-controls__speaker-svg',
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    width: 22,
    height: 22,
    fill: 'none',
    'aria-hidden': true,
  };

  if (muted) {
    return (
      <svg {...common}>
        <path
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
      />
    </svg>
  );
}

export default function AudioControls({ audio }) {
  if (!audio) return null;

  return (
    <aside className="audio-controls" aria-label="Audio controls">
      <button
        type="button"
        className="audio-controls__mute"
        onClick={audio.toggleMuted}
        aria-pressed={audio.muted}
        aria-label={audio.muted ? 'Turn sound on' : 'Turn sound off'}
        title={audio.muted ? 'Sound off' : 'Sound on'}
      >
        <SpeakerIcon muted={audio.muted} />
      </button>
      <label className="audio-controls__slider">
        <span>Music</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={audio.musicVolume}
          onChange={(event) => audio.setMusicVolume(event.target.value)}
        />
      </label>
      <label className="audio-controls__slider">
        <span>SFX</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={audio.sfxVolume}
          onChange={(event) => audio.setSfxVolume(event.target.value)}
        />
      </label>
    </aside>
  );
}
