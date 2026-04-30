import { formatMoveStat, moveIcon, statLabel } from '../../constants/movePresentation.js';

/**
 * Tooltip — generic hover card wrapper.
 *
 * Accepts children to wrap (the hover target) and a `content` node to
 * render as the floating card. Pure CSS hover — no JS positioning
 * gymnastics; positioning is handled in phase3.css (absolute, above
 * the wrapper, centered).
 */
export default function Tooltip({ content, children, disabled }) {
  if (!content || disabled) return children;
  return (
    <span className="tooltip-wrapper">
      {children}
      <span className="tooltip" role="tooltip">
        {content}
      </span>
    </span>
  );
}

/**
 * MoveTooltip — specialised card for a Move object. Renders name,
 * type + base value, description, and status-effect info when present.
 */
export function MoveTooltipCard({ move }) {
  if (!move) return null;
  const se = move.statusEffect;
  return (
    <>
      <div className="tooltip__name">{move.name}</div>
      <div className="tooltip__row">
        <span>{moveIcon(move)} {move.type}</span>
        <span>{formatMoveStat(move)}</span>
      </div>
      <div className="tooltip__desc">{move.description}</div>
      {(move.cost?.mana || move.cost?.health) && (
        <div className="tooltip__status tooltip__status--mana">
          Cost:
          {move.cost?.mana ? ` ${move.cost.mana} MP` : ''}
          {move.cost?.health ? ` ${move.cost.health} HP` : ''}
        </div>
      )}
      {move.effect?.stat && (
        <div className="tooltip__status">
          {statLabel(move.effect.stat)} x{move.effect.multiplier} for {move.effect.turns} turns
        </div>
      )}
      {se && (
        <div className={`tooltip__status tooltip__status--${se.kind}`}>
          {Math.round((se.chance ?? 1) * 100)}% chance to {se.kind} —
          {' '}{se.damage ?? '?'} dmg/turn for {se.turns ?? '?'} turns
        </div>
      )}
    </>
  );
}
