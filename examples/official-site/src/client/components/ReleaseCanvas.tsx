import React, { useEffect, useRef } from 'react'

export const ReleaseCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let width: number
        let height: number
        let animationFrameId: number
        let particles: Particle[] = []

        const particleCount = 60
        const brandColor = 'rgba(0, 240, 255, 0.4)'
        const secondaryColor = 'rgba(147, 51, 234, 0.3)'

        let mouse = { x: 0, y: 0, active: false }

        class Particle {
            x: number
            y: number
            size: number
            speedX: number
            speedY: number
            opacity: number
            baseX: number
            baseY: number
            density: number

            constructor() {
                this.x = Math.random() * width
                this.y = Math.random() * height
                this.baseX = this.x
                this.baseY = this.y
                this.size = Math.random() * 2 + 1
                this.speedX = (Math.random() - 0.5) * 0.3
                this.speedY = (Math.random() - 0.5) * 0.3
                this.opacity = Math.random() * 0.5 + 0.1
                this.density = (Math.random() * 30) + 1
            }

            update() {
                // Mouse interaction (gravity/repulsion)
                if (mouse.active) {
                    let dx = mouse.x - this.x
                    let dy = mouse.y - this.y
                    let distance = Math.sqrt(dx * dx + dy * dy)
                    let forceDirectionX = dx / distance
                    let forceDirectionY = dy / distance
                    let maxDistance = 150
                    let force = (maxDistance - distance) / maxDistance
                    if (distance < maxDistance) {
                        this.x -= forceDirectionX * force * 5
                        this.y -= forceDirectionY * force * 5
                    }
                }

                this.x += this.speedX
                this.y += this.speedY

                if (this.x > width) this.x = 0
                else if (this.x < 0) this.x = width
                if (this.y > height) this.y = 0
                else if (this.y < 0) this.y = height
            }

            draw() {
                if (!ctx) return
                ctx.beginPath()
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(0, 240, 255, ${this.opacity})`
                ctx.fill()
            }
        }

        const init = () => {
            width = canvas.width = window.innerWidth
            height = canvas.height = window.innerHeight
            particles = []
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle())
            }
        }

        const connect = () => {
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    const dx = particles[a].x - particles[b].x
                    const dy = particles[a].y - particles[b].y
                    const distance = Math.sqrt(dx * dx + dy * dy)

                    if (distance < 150) {
                        const opacity = 1 - distance / 150
                        ctx.strokeStyle = `rgba(0, 240, 255, ${opacity * 0.1})`
                        ctx.lineWidth = 0.5
                        ctx.beginPath()
                        ctx.moveTo(particles[a].x, particles[a].y)
                        ctx.lineTo(particles[b].x, particles[b].y)
                        ctx.stroke()
                    }
                }
            }
        }

        const animate = (time: number) => {
            ctx.clearRect(0, 0, width, height)

            // Central Singular Pulse
            const pulseSize = (Math.sin(time / 1000) + 1) * 100 + 200
            const pulseGradient = ctx.createRadialGradient(
                width / 2, height / 2, 0,
                width / 2, height / 2, pulseSize
            )
            pulseGradient.addColorStop(0, 'rgba(0, 240, 255, 0.05)')
            pulseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
            ctx.fillStyle = pulseGradient
            ctx.fillRect(0, 0, width, height)

            for (let i = 0; i < particles.length; i++) {
                particles[i].update()
                particles[i].draw()
            }
            connect()
            animationFrameId = requestAnimationFrame(animate)
        }

        init()
        animationFrameId = requestAnimationFrame(animate)

        const handleResize = () => {
            init()
        }

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX
            mouse.y = e.clientY
            mouse.active = true
        }

        const handleMouseLeave = () => {
            mouse.active = false
        }

        window.addEventListener('resize', handleResize)
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseleave', handleMouseLeave)

        return () => {
            window.removeEventListener('resize', handleResize)
            cancelAnimationFrame(animationFrameId)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-[-1] opacity-60"
        />
    )
}
