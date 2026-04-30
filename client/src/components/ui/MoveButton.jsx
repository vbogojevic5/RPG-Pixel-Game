import Tooltip, { MoveTooltipCard } from './Tooltip.jsx';
import { formatMoveStat, moveIcon, moveIconSrc } from '../../constants/movePresentation.js';

/**
 * MoveButton — a single move the player can click during battle.
 * Phase 3: wraps itself in a Tooltip that shows full move info on hover.
 */
export default function MoveButton({ move, onClick, disabled, affordable = true, showTooltip = true }) {
  if (!move) return null;
  const iconSrc = moveIconSrc(move);
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
        {iconSrc ? <img src={iconSrc} alt="" draggable={false} /> : moveIcon(move)}
      </span>
      <span className="move-btn__body">
        <span className="move-btn__name">{move.name}</span>
        <span className="move-btn__meta">
          <span className="move-btn__type">{move.type}</span>
          <span className="move-btn__stat">{formatMoveStat(move)}</span>
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
