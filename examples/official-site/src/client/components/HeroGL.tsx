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
        value: new THREE.Vector2(
          (texture.image as HTMLImageElement)?.width || 1920,
          (texture.image as HTMLImageElement)?.height || 1080
        ),
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

// --- Star Field Component (Premium Organic Feel) ---
const StarField = ({ count = 400 }) => {
  const pointsRef = useRef<THREE.Points>(null)

  // Generate attributes
  const [positions, randomness, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const randomness = new Float32Array(count)
    const colors = new Float32Array(count * 3)

    const colorPalette = [
      new THREE.Color('#ffffff'), // White
      new THREE.Color('#a5b4fc'), // Indigo-300
      new THREE.Color('#c4b5fd'), // Violet-300
      new THREE.Color('#67e8f9'), // Cyan-300
    ]

    for (let i = 0; i < count; i++) {
      // Spherical distribution for organic feel
      const r = 10 + Math.random() * 30
      const theta = 2 * Math.PI * Math.random()
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = (Math.random() - 0.5) * 50 // x spread
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50 // y spread
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50 // z depth

      randomness[i] = Math.random()

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)]
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    return [positions, randomness, colors]
  }, [count])

  const starUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: 2.0 }, // Base speed
  }), [])

  useFrame((state) => {
    if (pointsRef.current) {
      // Pulse speed slightly for "breathing" effect
      const material = pointsRef.current.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = state.clock.getElapsedTime()
      material.uniforms.uSpeed.value = 2.0 + Math.sin(state.clock.getElapsedTime() * 0.5) * 0.5

      // Subtle rotation for the whole field
      pointsRef.current.rotation.z = state.clock.getElapsedTime() * 0.02
    }
  })

  // Vertex Shader: Handles movement and wrapping
  const starVertexShader = `
    uniform float uTime;
    uniform float uSpeed;
    attribute float aRandom;
    attribute vec3 aColor;
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vColor = aColor;
      
      vec3 pos = position;
      
      // Move Z towards camera
      // Use randomness to make some stars faster
      float speedCheck = uSpeed * (2.0 + aRandom); 
      pos.z += uTime * speedCheck;
      
      // Wrap around Z for infinite loop (range -25 to 25)
      pos.z = mod(pos.z, 50.0) - 25.0;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size attenuation
      // Make closer stars larger, further stars tiny
      gl_PointSize = (30.0 * aRandom + 10.0) * (1.0 / -mvPosition.z);
      
      // Fade out as they get too close or too far to avoid popping
      // Smoothstep for soft entry/exit
      float dist = length(pos);
      vAlpha = smoothstep(0.0, 5.0, abs(pos.z + 1.0)); // Fade near camera ?
      vAlpha *= smoothstep(25.0, 10.0, abs(pos.z)); // Fade far
    }
  `

  // Fragment Shader: Handles shape (soft glow) and color
  const starFragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      // Create soft circle
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;
      
      // Glow from center
      float glow = 1.0 - (r * 2.0);
      glow = pow(glow, 1.5); 
      
      vec3 finalColor = vColor + vec3(glow * 0.5); // Add white core
      
      gl_FragColor = vec4(finalColor, vAlpha * glow);
    }
  `

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={count}
          array={randomness}
          itemSize={1}
          args={[randomness, 1]}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={count}
          array={colors}
          itemSize={3}
          args={[colors, 3]}
        />
      </bufferGeometry>
      <shaderMaterial
        uniforms={starUniforms}
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
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
        <StarField />
      </Canvas>
    </div>
  )
}
