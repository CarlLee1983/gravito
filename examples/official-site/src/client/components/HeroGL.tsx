import { useTexture } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

// --- Background Shader Component ---
const BackgroundShader = () => {
  const { viewport, size } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)

  // Load texture using Suspense-ready hook
  const texture = useTexture('/static/image/hero.jpg')
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTexture: { value: texture },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uTextureResolution: {
        value: new THREE.Vector2(texture.image?.width || 1920, texture.image?.height || 1080),
      },
    }),
    [texture, size.width, size.height]
  )

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = state.clock.getElapsedTime()
    }
  })

  // Vertex Shader
  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `

  // Fragment Shader (Original Logic preserved)
  const fragmentShader = `
    uniform float uTime;
    uniform sampler2D uTexture;
    uniform vec2 uResolution;
    uniform vec2 uTextureResolution;
    varying vec2 vUv;

    void main() {
      vec2 s = uResolution;
      vec2 i = uTextureResolution;
      float screenAspect = s.x / s.y;
      float imageAspect = i.x / i.y;
      
      vec2 newUv = vUv;
      if (screenAspect > imageAspect) {
          float scale = imageAspect / screenAspect;
          newUv.y = vUv.y * scale + (1.0 - scale) * 0.5;
      } else {
          float scale = screenAspect / imageAspect;
          newUv.x = vUv.x * scale + (1.0 - scale) * 0.5;
      }

      vec2 center = vec2(0.5, 0.5);
      vec2 toCenter = newUv - center;
      float dist = length(toCenter);
      float angle = atan(toCenter.y, toCenter.x);

      float innerMask = smoothstep(0.25, 0.1, dist);
      float ringMask = smoothstep(0.15, 0.35, dist) * smoothstep(0.7, 0.5, dist);
      
      float swirl = sin(dist * 20.0 - uTime * 0.6) * 0.015 * innerMask;
      newUv.x += cos(angle) * swirl;
      newUv.y += sin(angle) * swirl;
      
      float ringFlow = uTime * 0.1;
      float shimmer = sin(angle * 5.0 + uTime * 2.0) * 0.002 * ringMask;
      float pulse = sin(dist * 15.0 - uTime * 1.5) * 0.003 * ringMask;
      
      newUv.x += cos(angle) * (shimmer + pulse);
      newUv.y += sin(angle) * (shimmer + pulse);
      newUv.x += cos(angle + 1.57) * 0.005 * ringMask;
      newUv.y += sin(angle + 1.57) * 0.005 * ringMask;

      vec4 color = texture2D(uTexture, newUv);
      float brightness = 1.0 + sin(uTime * 0.5 + angle * 2.0) * 0.05 * ringMask;
      color.rgb *= brightness;
      color.rgb *= (1.0 - smoothstep(0.0, 0.15, dist) * 0.15 * innerMask);

      gl_FragColor = color;
    }
  `

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}

// --- Warp Stars Component ---
const WarpStars = ({ count = 200 }) => {
  const pointsRef = useRef<THREE.Points>(null)

  // Create random points
  const [positions, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10 // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10 // y
      positions[i * 3 + 2] = Math.random() * 10 // z
      sizes[i] = Math.random()
    }
    return [positions, sizes]
  }, [count])

  useFrame((state) => {
    if (!pointsRef.current) return
    const time = state.clock.getElapsedTime()
    // Move points towards camera
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      let z = positions[i * 3 + 2]
      z += 0.1 // Speed
      if (z > 5) z = -5 // Reset loop
      positions[i * 3 + 2] = z
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.8} sizeAttenuation />
    </points>
  )
}

// --- Main HeroGL Component ---
export function HeroGL() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 1], fov: 75 }} // Use perspective for stars, ortho logic handled in shader
        dpr={[1, 2]}
        gl={{ powerPreference: 'high-performance', alpha: true }}
      >
        <BackgroundShader />
        {/* Stars overlay - rendered on top due to render order or Z-placement */}
        <WarpStars />
      </Canvas>
    </div>
  )
}
