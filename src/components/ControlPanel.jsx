import { useState } from 'react'

const SHAPES = [
  { id: 0, label: '● Circle'  },
  { id: 1, label: '■ Square'  },
  { id: 2, label: '○ Ring'    },
  { id: 3, label: '# Numbers' },
]

const isMobile = () => window.innerWidth < 768

export default function ControlPanel({ sizeVal, activeShape, onSize, onShape, handEnabled, onHandToggle }) {
  const [open, setOpen] = useState(() => !isMobile())

  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 20 }}>

      {/* Toggle button — always visible on mobile */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: isMobile() ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.18)',
          background: 'rgba(8,8,8,0.82)',
          backdropFilter: 'blur(14px)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: 16,
          cursor: 'pointer',
          marginBottom: open ? 8 : 0,
        }}
      >
        {open ? '✕' : '⚙'}
      </button>

      {/* Panel body */}
      {open && (
        <div style={{
          background: 'rgba(8,8,8,0.78)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 10,
          padding: '16px 18px',
          backdropFilter: 'blur(14px)',
          minWidth: 148,
          userSelect: 'none',
        }}>
          {/* Size Slider */}
          <p style={styles.label}>Point Size</p>
          <div style={{ marginBottom: 18 }}>
            <input
              type="range"
              min={0.2}
              max={4.0}
              step={0.05}
              value={sizeVal}
              onChange={e => onSize(parseFloat(e.target.value))}
              style={styles.slider}
            />
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 9, marginTop: 4, letterSpacing: '0.1em' }}>
              {sizeVal.toFixed(2)}
            </div>
          </div>

          {/* Shape */}
          <p style={styles.label}>Shape</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 18 }}>
            {SHAPES.map(sh => (
              <button key={sh.id} onClick={() => onShape(sh.id)} style={{
                ...styles.btn,
                ...(activeShape === sh.id ? styles.btnActive : {}),
                textAlign: 'left',
                padding: '7px 10px',
              }}>
                {sh.label}
              </button>
            ))}
          </div>

          {/* Hand Interaction Toggle */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            paddingTop: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}>
            <span style={{ ...styles.label, margin: 0 }}>Hand Control</span>
            <button
              onClick={() => onHandToggle(v => !v)}
              style={{
                position: 'relative',
                width: 36,
                height: 20,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.18)',
                background: handEnabled ? 'rgba(255,255,255,0.18)' : 'rgba(40,40,40,0.72)',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                transition: 'background 0.25s',
              }}
            >
              <span style={{
                position: 'absolute',
                top: 2,
                left: handEnabled ? 17 : 2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: handEnabled ? '#fff' : 'rgba(160,160,160,0.7)',
                transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1), background 0.25s',
                display: 'block',
              }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  label: {
    margin: '0 0 8px',
    fontSize: 9,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.28)',
    fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
  },
  slider: {
    width: '100%',
    accentColor: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    background: 'transparent',
  },
  btn: {
    padding: '7px 0',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.38)',
    borderRadius: 5,
    cursor: 'pointer',
    fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
    fontSize: 10,
    letterSpacing: '0.1em',
    transition: 'border-color 0.15s, color 0.15s, background 0.15s',
  },
  btnActive: {
    borderColor: 'rgba(255,255,255,0.5)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
  },
}
