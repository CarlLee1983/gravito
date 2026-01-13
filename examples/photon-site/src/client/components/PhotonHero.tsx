import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Text, MeshDistortMaterial, Stars, Grid } from '@react-three/drei'
import * as THREE from 'three'

function CoreEngine() {
  const mesh = useRef<THREE.Mesh>(null!)
  const outerRef = useRef<THREE.Mesh>(null!)
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    mesh.current.rotation.x = Math.cos(time / 4) * 0.2
    mesh.current.rotation.y = Math.sin(time / 4) * 0.3
    outerRef.current.rotation.y = -time * 0.1
  })

  return (
    <group>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <Float speed={2} rotationIntensity={0.5} floatIntensity={2}>
        {/* Inner Octahedron */}
        <mesh ref={mesh}>
          <octahedronGeometry args={[2, 0]} />
          <meshPhysicalMaterial 
            color="#ffffff"
            transmission={1}
            thickness={2}
            roughness={0.1}
            envMapIntensity={1}
            clearcoat={1}
          />
        </mesh>
        
        {/* Outer Wireframe Cage */}
        <mesh ref={outerRef}>
          <sphereGeometry args={[3.2, 16, 16]} />
          <meshBasicMaterial color="#FFB800" wireframe transparent opacity={0.05} />
        </mesh>
      </Float>

      {/* Grid Floor */}
      <Grid 
        infiniteGrid 
        fadeDistance={50} 
        fadeStrength={5} 
        cellSize={1} 
        sectionSize={5} 
        sectionColor="#FFB800" 
        sectionThickness={1} 
        cellColor="#ffffff"
        cellThickness={0.5}
        position={[0, -5, 0]}
      />

      <pointLight position={[10, 10, 10]} intensity={2} color="#ffffff" />
      <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={2} />
    </group>
  )
}

export const PhotonHero = () => {
  return (
    <div className="relative w-full h-screen bg-obsidian overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-60">
        <Canvas camera={{ position: [0, 2, 10], fov: 45 }}>
          <CoreEngine />
        </Canvas>
      </div>
      
      {/* HUD Elements */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-12 left-12 right-12 flex justify-between items-start">
          <div className="text-[8px] font-technical tracking-[0.8em] uppercase text-white/40">
            [ SCAN_MODE: DEEP_REFRACTION ]
          </div>
          <div className="text-[8px] font-technical tracking-[0.8em] uppercase text-photon-gold">
            ● ENGINE_ONLINE_STABLE
          </div>
        </div>
        
        {/* Corner Brackets */}
        <div className="absolute top-8 left-8 w-16 h-16 border-t border-l border-white/10" />
        <div className="absolute top-8 right-8 w-16 h-16 border-t border-r border-white/10" />
        <div className="absolute bottom-8 left-8 w-16 h-16 border-b border-l border-white/10" />
        <div className="absolute bottom-8 right-8 w-16 h-16 border-b border-r border-white/10" />
      </div>

      <div className="relative z-20 flex flex-col items-center justify-center h-full max-w-7xl mx-auto px-12 text-center">
        <h1 className="text-[12rem] md:text-[16rem] text-hero mb-0">
          Pho<span className="italic font-thin opacity-50">ton</span>
        </h1>
        
        <div className="mt-[-2rem] max-w-xl">
          <p className="text-[10px] font-technical tracking-[0.6em] text-gray-500 mb-16 uppercase leading-relaxed">
            Unleashing the absolute potential of Bun. <br/>
            Zero-copy orchestration for the next generation.
          </p>
          
          <div className="flex justify-center gap-16">
            <button className="text-[9px] font-black tracking-[0.5em] uppercase text-white hover:text-photon-gold transition-all flex items-center gap-4 group">
              <span className="w-8 h-px bg-white/20 group-hover:w-12 group-hover:bg-photon-gold transition-all" />
              Initialize_
            </button>
            <button className="text-[9px] font-black tracking-[0.5em] uppercase text-gray-500 hover:text-white transition-all flex items-center gap-4 group">
              Docs_
              <span className="w-8 h-px bg-white/10 group-hover:w-12 group-hover:bg-white transition-all" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="scanline" />
    </div>
  )
}