import Tooltip, { MoveTooltipCard } from './Tooltip.jsx';

/**
 * MoveButton — a single move the player can click during battle.
 * Phase 3: wraps itself in a Tooltip that shows full move info on hover.
 */
export default function MoveButton({ move, onClick, disabled, showTooltip = true }) {
  if (!move) return null;
  const button = (
    <button
      type="button"
      className={`move-btn move-btn--${move.type}`}
      onClick={() => onClick(move.id)}
      disabled={disabled}
    >
      <span className="move-btn__name">{move.name}</span>
      <span className="move-btn__type">{move.type}</span>
    </button>
  );

  if (!showTooltip) return button;

  return (
    <Tooltip content={<MoveTooltipCard move={move} />} disabled={disabled}>
      {button}
    </Tooltip>
  );
}
