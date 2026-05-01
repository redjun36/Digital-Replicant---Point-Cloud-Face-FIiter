import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const SHAPES_COUNT = 4
const SIZE_MIN = 0.2
const SIZE_MAX = 4.0

export default function HandGesture({ videoRef, handLandmarker, shapeRef, onSize, onShape }) {
  const s = useRef({
    lastVidTime: -1,
    smoothSize: 1.0,
    prevIndexX: null,
    velX: 0,
    swipeCooldown: 0,
    lastSizeEmit: 0,
  })

  useFrame(() => {
    const video = videoRef.current
    if (!video || !handLandmarker || video.readyState < 2) return
    if (video.currentTime === s.current.lastVidTime) return
    s.current.lastVidTime = video.currentTime

    const st = s.current
    if (st.swipeCooldown > 0) st.swipeCooldown--

    const result = handLandmarker.detectForVideo(video, performance.now())

    if (!result.landmarks || result.landmarks.length === 0) {
      st.prevIndexX = null
      st.velX = 0
      return
    }

    const hand  = result.landmarks[0]
    const thumb = hand[4]   // thumb tip
    const index = hand[8]   // index tip

    // --- Pinch distance → size ---
    const pinch = Math.hypot(thumb.x - index.x, thumb.y - index.y)
    const t = THREE.MathUtils.clamp((pinch - 0.04) / 0.31, 0, 1)
    const targetSize = SIZE_MIN + t * (SIZE_MAX - SIZE_MIN)
    st.smoothSize = THREE.MathUtils.lerp(st.smoothSize, targetSize, 0.1)

    const now = performance.now()
    if (now - st.lastSizeEmit > 80) {
      st.lastSizeEmit = now
      onSize(parseFloat(st.smoothSize.toFixed(2)))
    }

    // --- Horizontal velocity → swipe → shape ---
    const ix = index.x
    if (st.prevIndexX !== null) {
      const dx = ix - st.prevIndexX
      st.velX = st.velX * 0.55 + dx * 0.45

      if (st.swipeCooldown === 0 && Math.abs(st.velX) > 0.038) {
        // Camera is mirrored: landmark x+ = screen left, landmark x- = screen right
        const dir = st.velX > 0 ? -1 : 1
        const next = (shapeRef.current + dir + SHAPES_COUNT) % SHAPES_COUNT
        onShape(next)
        st.velX = 0
        st.swipeCooldown = 25
      }
    }
    st.prevIndexX = ix
  })

  return null
}
