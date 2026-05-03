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
        <h1 className="screen-page-title class-select__title">Choose your hero</h1>
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
          <div className="class-detail__columns">
            <div className="class-detail__col">
              <p className="eyebrow">Starting Stats</p>
              <ul className="class-detail__list">
                {STAT_KEYS.map((key) => (
                  <li key={key}>
                    <span className="class-detail__label">{statLabel(key)}</span>
                    <strong>{selected.baseStats?.[key] ?? 0}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className="class-detail__col">
              <p className="eyebrow">Growth Per Level</p>
              <ul className="class-detail__list">
                {STAT_KEYS.map((key) => (
                  <li key={key}>
                    <span className="class-detail__label">{statLabel(key)}</span>
                    <strong>+{selected.levelUpGrowth?.[key] ?? 0}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="class-detail__actions">
            <button type="button" className="btn btn--ghost" onClick={onBack} disabled={loading}>
              Back
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => onChooseClass(selected.id)}
              disabled={loading}
            >
              {loading ? 'Starting Run...' : 'Start'}
            </button>
          </div>
          {error && <p className="main-menu__error">{error}</p>}
        </section>
      )}
    </div>
  );
}
