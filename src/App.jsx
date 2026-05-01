import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ImageSegmenter, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import FaceCloud from './components/FaceCloud'
import ControlPanel from './components/ControlPanel'
import HandGesture from './components/HandGesture'

const WASM_URL       = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const MODEL_URL      = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite'
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task'

export default function App() {
  const videoRef = useRef(null)
  const [segmenter,     setSegmenter]     = useState(null)
  const [handLandmarker, setHandLandmarker] = useState(null)
  const [phase, setPhase] = useState('loading')
  const [error, setError] = useState(null)
  const [sizeScale,    setSizeScale]    = useState(1.0)
  const [shape,        setShape]        = useState(0)
  const [handEnabled,  setHandEnabled]  = useState(true)

  // Ref so HandGesture can always read the latest shape without stale closure
  const shapeRef = useRef(0)
  useEffect(() => { shapeRef.current = shape }, [shape])

  useEffect(() => {
    let alive = true
    FilesetResolver.forVisionTasks(WASM_URL).then(v => Promise.all([
      ImageSegmenter.createFromOptions(v, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      }),
      HandLandmarker.createFromOptions(v, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
      }),
    ])).then(([seg, hand]) => {
      if (alive) { setSegmenter(seg); setHandLandmarker(hand); setPhase('ready') }
    }).catch(e => {
      if (alive) { setError(e.message); setPhase('ready') }
    })
    return () => { alive = false }
  }, [])

  async function startCamera() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      })
      videoRef.current.srcObject = stream
      await new Promise(r => videoRef.current.addEventListener('loadeddata', r, { once: true }))
      setPhase('running')
    } catch (e) {
      setError(e.message || 'Camera access denied')
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@100&display=swap" rel="stylesheet" />
      <div style={{
        position: 'absolute', top: 24, left: 28, zIndex: 20,
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 100,
        fontSize: 13,
        letterSpacing: '0.22em',
        color: '#ffffff',
        lineHeight: 1.55,
        textTransform: 'uppercase',
        pointerEvents: 'none',
      }}>
        Digital<br />Replica
      </div>

      <video
        ref={videoRef} autoPlay muted playsInline
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
      />

      {phase === 'running' && (
        <>
          <Canvas
            camera={{ position: [0, 0, 3.5], fov: 50, near: 0.01, far: 100 }}
            gl={{ antialias: false, alpha: false }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <FaceCloud
              videoRef={videoRef}
              segmenter={segmenter}
              sizeScale={sizeScale}
              shape={shape}
            />
            {handEnabled && (
              <HandGesture
                videoRef={videoRef}
                handLandmarker={handLandmarker}
                shapeRef={shapeRef}
                onSize={setSizeScale}
                onShape={setShape}
              />
            )}
          </Canvas>
          <ControlPanel
            sizeVal={sizeScale}
            activeShape={shape}
            onSize={setSizeScale}
            onShape={setShape}
            handEnabled={handEnabled}
            onHandToggle={setHandEnabled}
          />
        </>
      )}

      {phase !== 'running' && (
        <div style={styles.overlay}>
          <span style={styles.label}>
            {phase === 'loading' ? 'Loading models' : error || 'Ready'}
          </span>
          {phase === 'ready' && !error && (
            <button onClick={startCamera} style={styles.btn}>Start Camera</button>
          )}
          {error && (
            <button onClick={startCamera} style={styles.btn}>Retry</button>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  overlay: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 20,
  },
  label: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
    fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase',
  },
  btn: {
    padding: '12px 32px',
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
    fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase',
    cursor: 'pointer',
  },
}
