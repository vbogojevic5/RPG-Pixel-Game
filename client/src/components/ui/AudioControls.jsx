export default function AudioControls({ audio }) {
  if (!audio) return null;

  return (
    <aside className="audio-controls" aria-label="Audio controls">
      <button
        type="button"
        className="audio-controls__mute"
        onClick={audio.toggleMuted}
        aria-pressed={audio.muted}
      >
        {audio.muted ? 'Sound Off' : 'Sound On'}
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
