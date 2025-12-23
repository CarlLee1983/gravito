import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function HeroGL() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // --- Scene Setup ---
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    containerRef.current.appendChild(renderer.domElement)

    // --- Texture Loading ---
    const loader = new THREE.TextureLoader()
    const texture = loader.load('/static/image/hero.jpg', (tex) => {
      if (material) {
        material.uniforms.uTextureResolution.value.set(tex.image.width, tex.image.height)
      }
    })

    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter

    // --- Shader Material ---
    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: texture },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uTextureResolution: { value: new THREE.Vector2(1920, 1080) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform sampler2D uTexture;
        uniform vec2 uResolution;
        uniform vec2 uTextureResolution;
        varying vec2 vUv;

        void main() {
          // Object-Fit: Cover
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

          // 中心座標與距離
          vec2 center = vec2(0.5, 0.5);
          vec2 toCenter = newUv - center;
          float dist = length(toCenter);
          float angle = atan(toCenter.y, toCenter.x);

          // --- Mask 分層 ---
          // innerMask: 黑洞中心區域
          float innerMask = smoothstep(0.25, 0.1, dist);
          // ringMask: 外部光環區域 (吸引盤)
          float ringMask = smoothstep(0.15, 0.35, dist) * smoothstep(0.7, 0.5, dist);
          
          // --- 1. 黑洞核心效果 (內圈) ---
          float swirl = sin(dist * 20.0 - uTime * 0.6) * 0.015 * innerMask;
          newUv.x += cos(angle) * swirl;
          newUv.y += sin(angle) * swirl;
          
          // --- 2. 光環流動效果 (外圈) ---
          // 使用極座標旋轉模擬光環流動
          float ringFlow = uTime * 0.1;
          float shimmer = sin(angle * 5.0 + uTime * 2.0) * 0.002 * ringMask;
          
          // 徑向波動 (像能量脈衝)
          float pulse = sin(dist * 15.0 - uTime * 1.5) * 0.003 * ringMask;
          
          newUv.x += cos(angle) * (shimmer + pulse);
          newUv.y += sin(angle) * (shimmer + pulse);
          
          // 微小的切向偏移，產生輕微旋轉感
          newUv.x += cos(angle + 1.57) * 0.005 * ringMask;
          newUv.y += sin(angle + 1.57) * 0.005 * ringMask;

          vec4 color = texture2D(uTexture, newUv);
          
          // 視覺微調：讓光環區域亮度跟隨 uTime 微弱閃爍
          float brightness = 1.0 + sin(uTime * 0.5 + angle * 2.0) * 0.05 * ringMask;
          color.rgb *= brightness;

          // 強化核心深邃感
          color.rgb *= (1.0 - smoothstep(0.0, 0.15, dist) * 0.15 * innerMask);

          gl_FragColor = color;
        }
      `,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // --- Animation ---
    let animationId: number
    const animate = (time: number) => {
      animationId = requestAnimationFrame(animate)
      material.uniforms.uTime.value = time * 0.001
      renderer.render(scene, camera)
    }
    animate(0)

    // --- Resize ---
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      renderer.setSize(width, height)
      material.uniforms.uResolution.value.set(width, height)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
      if (containerRef.current && renderer.domElement.parentNode) {
        containerRef.current.removeChild(renderer.domElement)
      }
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
    />
  )
}
