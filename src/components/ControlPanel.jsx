import { useState } from 'react'

const SHAPES = [
  { id: 0, label: '● Circle' },
  { id: 1, label: '■ Square' },
  { id: 2, label: '○ Ring'   },
]

export default function ControlPanel({ onSize, onShape }) {
  const [sizeVal,    setSizeVal]    = useState(1.0)
  const [activeShape, setActiveShape] = useState(0)

  function handleSize(v) {
    setSizeVal(v)
    onSize(v)
  }

  function handleShape(sh) {
    setActiveShape(sh.id)
    onShape(sh.id)
  }

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 20,
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
          onChange={e => handleSize(parseFloat(e.target.value))}
          style={styles.slider}
        />
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 9, marginTop: 4, letterSpacing: '0.1em' }}>
          {sizeVal.toFixed(2)}
        </div>
      </div>

      {/* Shape */}
      <p style={styles.label}>Shape</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {SHAPES.map(sh => (
          <button key={sh.id} onClick={() => handleShape(sh)} style={{
            ...styles.btn,
            ...(activeShape === sh.id ? styles.btnActive : {}),
            textAlign: 'left',
            padding: '7px 10px',
          }}>
            {sh.label}
          </button>
        ))}
      </div>
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
