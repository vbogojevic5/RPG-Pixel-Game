import { useState } from 'react';
import Tooltip, { MoveTooltipCard } from './Tooltip.jsx';
import { moveIcon, moveIconSrc } from '../../constants/movePresentation.js';

/** Battle move slot with optional tooltip; SVG icon falls back to type emoji. */
export default function MoveButton({ move, onClick, disabled, affordable = true, showTooltip = true }) {
  const [failedMoveId, setFailedMoveId] = useState(null);
  if (!move) return null;
  const iconSrc = moveIconSrc(move);
  const iconFailed = failedMoveId === move.id;
  const showImg = Boolean(iconSrc) && !iconFailed;
  const isDisabled = disabled || !affordable;
  const button = (
    <button
      type="button"
      className={`move-btn move-btn--${move.type} ${!affordable ? 'move-btn--unaffordable' : ''}`}
      onClick={() => onClick(move.id)}
      disabled={isDisabled}
      data-sfx="abilityClick"
      title={!affordable ? 'Not enough resources.' : undefined}
    >
      <span className="move-btn__icon" aria-hidden>
        {showImg ? (
          <img
            src={iconSrc}
            alt=""
            draggable={false}
            onError={() => setFailedMoveId(move.id)}
          />
        ) : (
          moveIcon(move)
        )}
      </span>
      <span className="move-btn__body">
        <span className="move-btn__name">{move.name}</span>
        <span className="move-btn__meta">
          <span className="move-btn__type">{move.type}</span>
        </span>
      </span>
    </button>
  );

  if (!showTooltip) return button;

  return (
    <Tooltip content={<MoveTooltipCard move={move} />} disabled={disabled}>
      {button}
    </Tooltip>
  );
}
