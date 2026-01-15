
import React, { useEffect, useRef } from 'react'

interface Props {
    className?: string
}

export const ConstellationCanvas: React.FC<Props> = ({ className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number
        let particles: Particle[] = []

        // Configuration
        const particleCount = 100 // Density
        const connectionDistance = 150
        const mouseDistance = 200

        // Colors - Dynamic based on computed styles later if needed, but hardcoded for performance/simplicity first
        // We want a subtle, high-tech look.
        const particleColor = 'rgba(255, 184, 0, 0.3)' // Photon Gold subtle
        const lineColor = 'rgba(209, 213, 219, 0.1)' // Text Main subtle

        let w = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth
        let h = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight

        class Particle {
            x: number
            y: number
            vx: number
            vy: number
            size: number

            constructor() {
                this.x = Math.random() * w
                this.y = Math.random() * h
                this.vx = (Math.random() - 0.5) * 0.5 // Slow movement
                this.vy = (Math.random() - 0.5) * 0.5
                this.size = Math.random() * 2 + 1
            }

            update() {
                this.x += this.vx
                this.y += this.vy

                // Bounce
                if (this.x < 0 || this.x > w) this.vx *= -1
                if (this.y < 0 || this.y > h) this.vy *= -1
            }

            draw() {
                if (!ctx) return
                ctx.beginPath()
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
                ctx.fillStyle = particleColor
                ctx.fill()
            }
        }

        const init = () => {
            particles = []
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle())
            }
        }

        // Mouse interaction
        let mouse = { x: -9999, y: -9999 }

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            mouse.x = e.clientX - rect.left
            mouse.y = e.clientY - rect.top
        }

        const handleResize = () => {
            w = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth
            h = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight
            init()
        }

        window.addEventListener('resize', handleResize)
        window.addEventListener('mousemove', handleMouseMove)

        const animate = () => {
            ctx.clearRect(0, 0, w, h)

            // Update and draw particles
            particles.forEach(p => {
                p.update()
                p.draw()
            })

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i]

                // Connect to mouse
                const dxMouse = p1.x - mouse.x
                const dyMouse = p1.y - mouse.y
                const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse)

                if (distMouse < mouseDistance) {
                    ctx.beginPath()
                    ctx.strokeStyle = `rgba(255, 184, 0, ${0.2 * (1 - distMouse / mouseDistance)})` // Gold glow near mouse
                    ctx.lineWidth = 1
                    ctx.moveTo(p1.x, p1.y)
                    ctx.lineTo(mouse.x, mouse.y)
                    ctx.stroke()
                }

                // Connect to other particles
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j]
                    const dx = p1.x - p2.x
                    const dy = p1.y - p2.y
                    const dist = Math.sqrt(dx * dx + dy * dy)

                    if (dist < connectionDistance) {
                        ctx.beginPath()
                        ctx.strokeStyle = `rgba(150, 150, 150, ${0.1 * (1 - dist / connectionDistance)})`
                        ctx.lineWidth = 0.5
                        ctx.moveTo(p1.x, p1.y)
                        ctx.lineTo(p2.x, p2.y)
                        ctx.stroke()
                    }
                }
            }

            animationFrameId = requestAnimationFrame(animate)
        }

        init()
        animate()

        return () => {
            cancelAnimationFrame(animationFrameId)
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('mousemove', handleMouseMove)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 pointer-events-none z-0 ${className}`}
        />
    )
}
