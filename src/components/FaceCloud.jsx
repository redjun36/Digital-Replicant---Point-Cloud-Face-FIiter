import { useRef, useMemo, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'

const COLS   = 58
const ROWS   = 78
const MAX_N  = COLS * ROWS
const WORLD_W = 3.2
const WORLD_H = 2.6

// ── Shaders ──────────────────────────────────────────────────────────────────
const vert = /* glsl */`
uniform float uAlpha;
uniform float uSizeScale;
attribute float aSize;
attribute float aDigit;
varying float vAlpha;
varying float vDigit;

void main() {
  vAlpha = uAlpha;
  vDigit = aDigit;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uSizeScale * (16.0 / -mv.z);
  gl_Position  = projectionMatrix * mv;
}
`

const frag = /* glsl */`
uniform float uShape;
uniform sampler2D uDigitTex;
varying float vAlpha;
varying float vDigit;

void main() {
  vec2 pc = gl_PointCoord;
  vec2 uv = pc - 0.5;
  float d = length(uv);

  float isCircle = 1.0 - step(0.5, uShape);
  float isSquare = step(0.5, uShape) * (1.0 - step(1.5, uShape));
  float isRing   = step(1.5, uShape) * (1.0 - step(2.5, uShape));
  float isNumber = step(2.5, uShape);

  if (isCircle > 0.5 && d > 0.5) discard;
  if (isRing   > 0.5 && (d > 0.5 || d < 0.27)) discard;

  if (isNumber > 0.5) {
    float digit = floor(vDigit + 0.5);
    float u = (pc.x + digit) / 10.0;
    float a = texture2D(uDigitTex, vec2(u, pc.y)).r * vAlpha;
    if (a < 0.05) discard;
    gl_FragColor = vec4(1.0, 1.0, 1.0, a);
    return;
  }

  float circleA = smoothstep(0.5, 0.38, d);
  float squareA = 0.88;
  float ringA   = smoothstep(0.5, 0.45, d) * smoothstep(0.27, 0.32, d);

  float a = (isCircle * circleA + isSquare * squareA + isRing * ringA) * vAlpha;
  gl_FragColor = vec4(1.0, 1.0, 1.0, a);
}
`

function makeDigitTexture() {
  const W = 200, H = 20
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 15px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < 10; i++) ctx.fillText(String(i), i * 20 + 10, 10)
  return new THREE.CanvasTexture(c)
}

export default function FaceCloud({ videoRef, segmenter, sizeScale = 1.0, shape = 0 }) {
  const groupRef = useRef()

  const sCtx = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 640; c.height = 480
    return c.getContext('2d', { willReadFrequently: true })
  }, [])

  const posArr  = useMemo(() => new Float32Array(MAX_N * 3), [])
  const sizArr  = useMemo(() => new Float32Array(MAX_N), [])
  const digArr  = useMemo(() => new Float32Array(MAX_N), [])

  const homeX = useMemo(() => {
    const a = new Float32Array(MAX_N)
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        a[r * COLS + c] = ((COLS - 1 - c) / (COLS - 1) - 0.5) * WORLD_W
    return a
  }, [])

  const homeY = useMemo(() => {
    const a = new Float32Array(MAX_N)
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        a[r * COLS + c] = (0.5 - r / (ROWS - 1)) * WORLD_H
    return a
  }, [])

  const radialFade = useMemo(() => {
    const a = new Float32Array(MAX_N)
    for (let i = 0; i < MAX_N; i++) {
      const wx = homeX[i], wy = homeY[i]
      const dist = Math.hypot(wx, wy)
      a[i] = Math.max(0, 1 - Math.pow(Math.max(0, dist - 0.8) / 0.5, 2))
    }
    return a
  }, [homeX, homeY])

  const digitTex = useMemo(() => makeDigitTexture(), [])

  const homeZ  = useRef(new Float32Array(MAX_N))
  const offsets = useRef(Array.from({ length: MAX_N }, () => ({ x: 0, y: 0, z: 0 })))
  const svx     = useRef(new Float32Array(MAX_N))
  const svy     = useRef(new Float32Array(MAX_N))
  const lastDigitSwap = useRef(0)

  const rt    = useRef({ lastVidTime: -1, hasPerson: false, fAlpha: 0 })
  const mouse = useRef({ ndcX: 0, ndcY: 0, wx: 0, wy: 0, drag: false })

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    g.setAttribute('aSize',    new THREE.BufferAttribute(sizArr, 1))
    g.setAttribute('aDigit',   new THREE.BufferAttribute(digArr, 1))
    g.setDrawRange(0, MAX_N)
    return g
  }, [posArr, sizArr, digArr])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uAlpha:     { value: 0 },
      uSizeScale: { value: 1.0 },
      uShape:     { value: 0.0 },
      uDigitTex:  { value: digitTex },
    },
    vertexShader:   vert,
    fragmentShader: frag,
    transparent:    true,
    depthWrite:     false,
  }), [digitTex])

  function toWorld(cx, cy) {
    const halfH  = Math.tan(25 * Math.PI / 180) * 3.5
    const aspect = window.innerWidth / window.innerHeight
    return {
      x:  ((cx / window.innerWidth)  * 2 - 1) * halfH * aspect,
      y: -((cy / window.innerHeight) * 2 - 1) * halfH,
    }
  }

  const returnToHome = useCallback(() => {
    svx.current.fill(0)
    svy.current.fill(0)
    for (let i = 0; i < MAX_N; i++) {
      const o = offsets.current[i]
      if (Math.abs(o.x) + Math.abs(o.y) + Math.abs(o.z) < 0.004) continue
      gsap.to(o, {
        x: 0, y: 0, z: 0,
        duration: 0.8 + Math.random() * 0.6,
        ease: 'elastic.out(1, 0.4)',
        delay: Math.random() * 0.1,
        overwrite: true,
      })
    }
  }, [])

  useEffect(() => {
    const onMove = (e) => {
      mouse.current.ndcX = (e.clientX / window.innerWidth)  * 2 - 1
      mouse.current.ndcY = -((e.clientY / window.innerHeight) * 2 - 1)
      const w = toWorld(e.clientX, e.clientY)
      mouse.current.wx = w.x; mouse.current.wy = w.y
    }
    const onDown = () => { mouse.current.drag = true }
    const onUp   = () => { mouse.current.drag = false; returnToHome() }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup',   onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup',   onUp)
    }
  }, [returnToHome])

  useEffect(() => () => offsets.current.forEach(o => gsap.killTweensOf(o)), [])

  useFrame(() => {
    const video = videoRef.current
    if (!video || !segmenter || video.readyState < 2) return
    const s = rt.current

    mat.uniforms.uSizeScale.value = sizeScale
    mat.uniforms.uShape.value     = shape

    // --- Segmentation ---
    if (video.currentTime !== s.lastVidTime) {
      s.lastVidTime = video.currentTime

      const result = segmenter.segmentForVideo(video, performance.now())

      if (result.confidenceMasks?.length > 0) {
        s.hasPerson = true
        const mask    = result.confidenceMasks[0]
        const maskArr = mask.getAsFloat32Array()
        const maskW   = mask.width
        const maskH   = mask.height

        sCtx.drawImage(video, 0, 0, 640, 480)
        let img = null
        try { img = sCtx.getImageData(0, 0, 640, 480) } catch {}

        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            const i = row * COLS + col
            const mx   = Math.min(Math.floor(col * maskW / COLS), maskW - 1)
            const my   = Math.min(Math.floor(row * maskH / ROWS), maskH - 1)
            const conf = maskArr[my * maskW + mx]
            const rFade = radialFade[i]

            if (conf > 0.42 && rFade > 0.01) {
              let lum = 0.5
              if (img) {
                const vx  = Math.min(Math.floor(col * 640 / COLS), 639)
                const vy  = Math.min(Math.floor(row * 480 / ROWS), 479)
                const pi  = (vy * 640 + vx) * 4
                lum = (0.299 * img.data[pi] + 0.587 * img.data[pi + 1] + 0.114 * img.data[pi + 2]) / 255
              }

              const lumC = Math.pow(lum, 0.45)
              const sizeBase = 0.05 + lumC * 2.2
              sizArr[i]        = sizeBase * rFade
              homeZ.current[i] = (lum - 0.5) * 0.9
            } else {
              sizArr[i] = 0
            }
          }
        }

        mask.close()
        geo.attributes.aSize.needsUpdate = true
      } else {
        s.hasPerson = false
      }
    }

    // --- Number digit shuffle ---
    if (shape === 3) {
      const now = performance.now()
      if (now - lastDigitSwap.current > 80) {
        lastDigitSwap.current = now
        for (let i = 0; i < MAX_N; i++) {
          if (sizArr[i] > 0.01) digArr[i] = Math.floor(Math.random() * 10)
        }
        geo.attributes.aDigit.needsUpdate = true
      }
    }

    // --- Alpha ---
    s.fAlpha = THREE.MathUtils.clamp(s.fAlpha + (s.hasPerson ? 0.04 : -0.04), 0, 1)
    mat.uniforms.uAlpha.value = s.fAlpha

    // --- Drag scatter ---
    if (mouse.current.drag) {
      const RADIUS = 0.5, STR = 0.022
      const { wx, wy } = mouse.current
      const vx = svx.current, vy = svy.current

      for (let i = 0; i < MAX_N; i++) {
        if (sizArr[i] < 0.01) continue
        const o  = offsets.current[i]
        const dx = homeX[i] + o.x - wx
        const dy = homeY[i] + o.y - wy
        const d  = Math.hypot(dx, dy)

        if (d < RADIUS && d > 0.001) {
          const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.2
          const f     = (1 - d / RADIUS) * STR
          vx[i] += Math.cos(angle) * f
          vy[i] += Math.sin(angle) * f
        }
        vx[i] *= 0.87; vy[i] *= 0.87
        o.x += vx[i];  o.y += vy[i]
        const mag = Math.hypot(o.x, o.y)
        if (mag > 1.2) { o.x *= 1.2 / mag; o.y *= 1.2 / mag }
      }
    }

    // --- Write positions ---
    for (let i = 0; i < MAX_N; i++) {
      const ii = i * 3, o = offsets.current[i]
      posArr[ii]     = homeX[i]         + o.x
      posArr[ii + 1] = homeY[i]         + o.y
      posArr[ii + 2] = homeZ.current[i] + o.z
    }
    geo.attributes.position.needsUpdate = true

    // --- Gaze ---
    if (groupRef.current) {
      const { ndcX, ndcY } = mouse.current
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, ndcY * -0.25, 0.04)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, ndcX *  0.25, 0.04)
    }
  })

  return (
    <group ref={groupRef}>
      <points geometry={geo} material={mat} />
    </group>
  )
}
