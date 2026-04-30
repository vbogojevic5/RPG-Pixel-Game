import { useMemo, useState } from 'react';
import Sprite from '../ui/Sprite.jsx';
import { statLabel } from '../../constants/movePresentation.js';

const STAT_KEYS = ['health', 'mana', 'attack', 'defense', 'magic'];

function formatMoveList(moveIds, moves) {
  return moveIds
    .map((id) => moves?.[id]?.name ?? id)
    .join(', ');
}

export default function CharacterSelect({ config, loading, error, onChooseClass, onBack }) {
  const classes = useMemo(() => Object.values(config?.heroClasses ?? { [config.hero.id]: config.hero }), [config]);
  const [selectedId, setSelectedId] = useState(classes[0]?.id ?? 'knight');
  const selected = classes.find((heroClass) => heroClass.id === selectedId) ?? classes[0];

  return (
    <div className="screen class-select">
      <div className="class-select__header">
        <div>
          <p className="eyebrow">Choose Your Hero</p>
          <h1>Select a Class</h1>
          <p>Each class has distinct stats, starter moves, and level-up growth.</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={onBack} disabled={loading}>
          Back
        </button>
      </div>

      <div className="class-select__grid">
        {classes.map((heroClass) => {
          const active = heroClass.id === selected?.id;
          return (
            <button
              key={heroClass.id}
              type="button"
              className={`class-card${active ? ' is-active' : ''}`}
              onClick={() => setSelectedId(heroClass.id)}
            >
              <Sprite kind="character" id={heroClass.id} size={76} />
              <span className="class-card__name">{heroClass.name}</span>
              <span className="class-card__moves">
                {formatMoveList(heroClass.defaultMoves ?? [], config.moves)}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <section className="class-detail">
          <div>
            <p className="eyebrow">Starting Stats</p>
            <div className="class-detail__stats">
              {STAT_KEYS.map((key) => (
                <span key={key}>
                  {statLabel(key)} <strong>{selected.baseStats?.[key] ?? 0}</strong>
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow">Growth Per Level</p>
            <div className="class-detail__stats">
              {STAT_KEYS.map((key) => (
                <span key={key}>
                  {statLabel(key)} <strong>+{selected.levelUpGrowth?.[key] ?? 0}</strong>
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onChooseClass(selected.id)}
            disabled={loading}
          >
            {loading ? 'Starting Run...' : `Start as ${selected.name}`}
          </button>
          {error && <p className="main-menu__error">{error}</p>}
        </section>
      )}
    </div>
  );
}
