/**
 * Persistent ambient overlay shown over a fighter for each active status
 * (burn, poison, bleed). Pure CSS — small DOM footprint, no per-frame work.
 *
 * Embeds inside the same positioned container as the fighter sprite so that
 * the effects move with it.
 */
export default function StatusOverlay({ statuses }) {
  if (!statuses || statuses.length === 0) return null;
  const kinds = new Set(statuses.map((s) => s.kind));

  return (
    <div className="status-overlay" aria-hidden>
      {kinds.has('burn') && <BurnOverlay />}
      {kinds.has('poison') && <PoisonOverlay />}
      {kinds.has('bleed') && <BleedOverlay />}
    </div>
  );
}

function BurnOverlay() {
  return (
    <div className="status-fx status-fx--burn">
      <div className="status-fx__aura status-fx__aura--burn" />
      {Array.from({ length: 7 }).map((_, i) => (
        <span
          key={i}
          className="ember"
          style={{
            left: `${10 + i * 12}%`,
            animationDelay: `${i * 140}ms`,
            animationDuration: `${1100 + (i % 3) * 220}ms`,
          }}
        />
      ))}
      <div className="status-fx__flicker status-fx__flicker--burn" />
    </div>
  );
}

function PoisonOverlay() {
  return (
    <div className="status-fx status-fx--poison">
      <div className="status-fx__aura status-fx__aura--poison" />
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="bubble"
          style={{
            left: `${15 + i * 13}%`,
            animationDelay: `${i * 220}ms`,
            animationDuration: `${1600 + (i % 3) * 260}ms`,
          }}
        />
      ))}
    </div>
  );
}

function BleedOverlay() {
  return (
    <div className="status-fx status-fx--bleed">
      <div className="status-fx__aura status-fx__aura--bleed" />
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="drop"
          style={{
            left: `${20 + i * 15}%`,
            animationDelay: `${i * 240}ms`,
            animationDuration: `${1100 + (i % 2) * 220}ms`,
          }}
        />
      ))}
    </div>
  );
}
