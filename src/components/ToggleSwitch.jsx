import { useState } from 'react'

export default function ToggleSwitch() {
  const [on, setOn] = useState(false)

  return (
    <div style={{
      position: 'fixed',
      top: '21%',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10,
    }}>
      <button
        onClick={() => setOn(v => !v)}
        aria-label="Toggle"
        style={{
          position: 'relative',
          width: 44,
          height: 24,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.18)',
          background: on
            ? 'rgba(220,220,220,0.18)'
            : 'rgba(40,40,40,0.72)',
          cursor: 'pointer',
          padding: 0,
          outline: 'none',
          backdropFilter: 'blur(6px)',
          transition: 'background 0.3s',
        }}
      >
        <span style={{
          position: 'absolute',
          top: 3,
          left: on ? 22 : 3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: on ? '#fff' : 'rgba(160,160,160,0.85)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.55)',
          transition: 'left 0.22s cubic-bezier(0.4,0,0.2,1), background 0.3s',
          display: 'block',
        }} />
      </button>
    </div>
  )
}
