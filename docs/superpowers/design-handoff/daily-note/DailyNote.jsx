// Inceptio — Daily Note section (Today screen, above "Best windows ahead")
// HTML/React mirror of the RN components in expo/src/components/.
// Inline styles only; matches the existing UI-kit primitives. Exposes to window.
//
// Composition (top → bottom):
//   DailyNote          — always present. headline + supporting line, 4 moods.
//   EmptyInvite        — new users only (no saved searches). Separate element.
//   NewWindowCard      — emphasized · bright-and-brief (promoted to top)
//   InWindowCard       — emphasized · warm-and-steady (promoted)
//   StatusStack        — up to 3 quiet rows + "+N more →"

// ── activity identity (emoji + petal tint) ──────────────────
const ACTIVITY = {
  wedding:  { emoji: '💍', tint: 'rgba(249,181,200,0.16)', ring: 'rgba(249,181,200,0.30)' },
  contract: { emoji: '📋', tint: 'rgba(244,193,154,0.16)', ring: 'rgba(244,193,154,0.30)' },
  business: { emoji: '🚀', tint: 'rgba(229,199,125,0.16)', ring: 'rgba(229,199,125,0.30)' },
  travel:   { emoji: '✈️', tint: 'rgba(103,232,199,0.16)', ring: 'rgba(103,232,199,0.30)' },
};

// ── day-quality mood accents (restrained — copy carries the mood) ──
const MOOD = {
  strong: { dot: '#E5C77D', halo: 'rgba(240,216,154,0.55)', phase: 'waxing-gibbous',  dim: false },
  good:   { dot: '#A98DFF', halo: 'rgba(169,141,255,0.45)', phase: 'waxing-crescent', dim: false },
  mixed:  { dot: '#D4B872', halo: 'rgba(212,184,114,0.30)', phase: 'first-quarter',   dim: false },
  closed: { dot: '#7A7195', halo: 'none',                   phase: 'new',             dim: true  },
};

function ActivityPlate({ activity, size = 32 }) {
  const a = ACTIVITY[activity] || ACTIVITY.wedding;
  return (
    <span style={{
      flexShrink: 0, width: size, height: size, borderRadius: 9,
      background: a.tint, border: `1px solid ${a.ring}`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.5,
    }}>{a.emoji}</span>
  );
}

// ── Hero zone — radial gradient + starfield + mood-tinted moon ──
function DailyHero({ mood = 'good', phase, children }) {
  const m = MOOD[mood] || MOOD.good;
  const ph = phase || m.phase;
  return (
    <div style={{
      position: 'relative',
      background: 'radial-gradient(120% 80% at 50% 0%, #1A1433 0%, #0F0A1F 66%)',
      overflow: 'hidden',
      padding: '58px 24px 22px',
      boxSizing: 'border-box',
    }}>
      <Starfield density="heavy"/>
      <div style={{
        position: 'absolute', top: 56, right: 24,
        opacity: m.dim ? 0.55 : 1,
        filter: m.halo === 'none' ? 'none' : `drop-shadow(0 0 13px ${m.halo})`,
      }}>
        <Moon phase={ph} size={62} glow={false}/>
      </div>
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

// ── Daily note — headline + one supporting line ─────────────
//   headline   ≤ 48 chars · supporting ≤ 140 chars
function DailyNote({ mood = 'good', date = 'saturday, may 23', headline, supporting }) {
  const m = MOOD[mood] || MOOD.good;
  return (
    <div>
      {/* eyebrow row: mood dot + date */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 999, background: m.dot,
          boxShadow: mood === 'closed' ? 'none' : `0 0 8px ${m.halo === 'none' ? m.dot : m.halo}`,
          flexShrink: 0,
        }}/>
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
          color: '#B8B0CC', letterSpacing: '0.04em', textTransform: 'lowercase',
        }}>{date}</span>
      </div>

      {/* headline (Fraunces) */}
      <div style={{
        fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500,
        fontSize: 32, lineHeight: '38px', letterSpacing: '-0.02em',
        color: '#F5EFE4', maxWidth: 300, textWrap: 'pretty',
      }}>{headline}</div>

      {/* supporting line (Inter, muted) */}
      <div style={{
        marginTop: 12,
        fontFamily: 'Inter, sans-serif', fontSize: 15, lineHeight: '22px',
        color: '#B8B0CC', maxWidth: 318, textWrap: 'pretty',
      }}>{supporting}</div>
    </div>
  );
}

// ── Empty-state invite — separate element, new users only ───
//   invite ≤ 48 chars
function EmptyInvite({ text = 'Choose a moment of your own', onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '16px 18px', borderRadius: 14,
      background: 'transparent', border: '1px solid #5B4F8A',
      transition: 'background 160ms, border-color 160ms',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,111,232,0.08)'; e.currentTarget.style.borderColor = '#A98DFF'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#5B4F8A'; }}>
      <span style={{
        flexShrink: 0, width: 34, height: 34, borderRadius: 999,
        background: 'rgba(139,111,232,0.14)', border: '1px solid #5B4F8A',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: '#A98DFF',
      }}>
        <Icon name="plus" size={18}/>
      </span>
      <span style={{
        flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 500,
        color: '#F5EFE4',
      }}>{text}</span>
      <span style={{ color: '#A98DFF', display: 'inline-flex' }}>
        <Icon name="chevron-right" size={18}/>
      </span>
    </button>
  );
}

// ── Quiet status row (the deliberately-grey baseline) ───────
//   status text ≤ 42 chars
function SavedRow({ activity = 'wedding', text, last, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 16px',
      background: 'transparent', border: 'none',
      borderBottom: last ? 'none' : '1px solid #2A2247',
      transition: 'background 140ms',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,111,232,0.05)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      <ActivityPlate activity={activity}/>
      <span style={{
        flex: 1, minWidth: 0,
        fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: '19px',
        color: '#D8D2E4', textWrap: 'pretty',
      }}>{text}</span>
      <span style={{ color: '#7A7195', display: 'inline-flex', flexShrink: 0 }}>
        <Icon name="chevron-right" size={16}/>
      </span>
    </button>
  );
}

// "+N more →" overflow affordance (row inside the same container)
function MoreRow({ count, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '12px 16px',
      background: 'transparent', border: 'none', borderTop: '1px solid #2A2247',
      fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
      color: '#A98DFF',
    }}>
      +{count} more
      <Icon name="chevron-right" size={14}/>
    </button>
  );
}

// Container for up to 3 quiet rows + optional overflow.
function StatusStack({ rows = [], moreCount = 0, onMore, onRow }) {
  const visible = rows.slice(0, 3);
  return (
    <div style={{
      background: '#1F1838', border: '1px solid #3A3258', borderRadius: 16,
      overflow: 'hidden',
    }}>
      {visible.map((r, i) => (
        <SavedRow key={i} activity={r.activity} text={r.text}
                  last={i === visible.length - 1 && moreCount <= 0}
                  onClick={() => onRow && onRow(r)}/>
      ))}
      {moreCount > 0 && <MoreRow count={moreCount} onClick={onMore}/>}
    </div>
  );
}

// ── Emphasized · warm-and-steady — "you're inside your window" ──
function InWindowCard({ activity = 'wedding', text, sub, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      position: 'relative', overflow: 'hidden',
      display: 'block',
      padding: '16px 18px', borderRadius: 16,
      background: 'radial-gradient(140% 120% at 0% 0%, rgba(244,193,154,0.12) 0%, rgba(229,199,125,0.04) 40%, rgba(229,199,125,0) 70%), #1F1838',
      border: '1px solid rgba(240,216,154,0.42)',
      boxShadow: '0 6px 26px rgba(229,199,125,0.10), inset 0 0 0 1px rgba(240,216,154,0.06)',
    }}>
      {/* live, steady (no pulse) indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: 999, background: '#F0D89A',
          boxShadow: '0 0 8px rgba(240,216,154,0.6)', flexShrink: 0,
        }}/>
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
          color: '#F0D89A', textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>Happening now</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <ActivityPlate activity={activity} size={38}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500,
            fontSize: 18, lineHeight: '24px', color: '#F5EFE4', textWrap: 'pretty',
          }}>{text}</div>
          {sub && (
            <div style={{
              marginTop: 3,
              fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: '18px',
              color: '#E5C77D',
            }}>{sub}</div>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Emphasized · bright-and-brief — "a stronger window — ___" ──
function NewWindowCard({ activity = 'wedding', text, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      position: 'relative', overflow: 'hidden', display: 'block',
      padding: '15px 18px', borderRadius: 16,
      background: 'radial-gradient(140% 120% at 100% 0%, rgba(169,141,255,0.16) 0%, rgba(139,111,232,0.05) 45%, rgba(139,111,232,0) 72%), #1F1838',
      border: '1px solid rgba(169,141,255,0.55)',
      boxShadow: '0 6px 24px rgba(139,111,232,0.18)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10,
      }}>
        <span style={{ color: '#A98DFF', display: 'inline-flex', fontSize: 12 }}>✦</span>
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
          color: '#A98DFF', textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>New · just found</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ActivityPlate activity={activity} size={32}/>
        <span style={{
          flex: 1, minWidth: 0,
          fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 500,
          lineHeight: '20px', color: '#F5EFE4', textWrap: 'pretty',
        }}>{text}</span>
        <span style={{
          flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
          color: '#A98DFF', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
        }}>See it<Icon name="chevron-right" size={14}/></span>
      </div>
    </button>
  );
}

Object.assign(window, {
  DailyHero, DailyNote, EmptyInvite,
  SavedRow, MoreRow, StatusStack, InWindowCard, NewWindowCard, ActivityPlate,
  ACTIVITY, MOOD,
});
