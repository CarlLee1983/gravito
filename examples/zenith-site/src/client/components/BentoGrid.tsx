import { type ClassValue, clsx } from 'clsx'
import { motion } from 'framer-motion'
import React from 'react'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function BentoGrid({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto ',
        className
      )}
    >
      {children}
    </div>
  )
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string
  title?: string | React.ReactNode
  description?: string | React.ReactNode
  header?: React.ReactNode
  icon?: React.ReactNode
}) {
  const [mouseX, setMouseX] = React.useState(0)
  const [mouseY, setMouseY] = React.useState(0)

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect()
    setMouseX(clientX - left)
    setMouseY(clientY - top)
  }

  return (
    <motion.div
      whileHover={{ y: -5 }}
      onMouseMove={handleMouseMove}
      className={cn(
        'row-span-1 rounded-3xl group/bento hover:shadow-xl transition duration-200 shadow-input bg-zenith-surface/40 border border-white/5 p-6 justify-between flex flex-col space-y-4 backdrop-blur-sm relative overflow-hidden',
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover/bento:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mouseX}px ${mouseY}px, rgba(0, 251, 255, 0.05), transparent 40%)`,
        }}
      />
      <div className="relative z-10 h-full flex flex-col justify-between">
        {header}
        <div className="group-hover/bento:translate-x-2 transition duration-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-zenith-pulse/10 text-zenith-accent">{icon}</div>
            <div className="font-heading font-bold text-white text-lg uppercase italic">
              {title}
            </div>
          </div>
          <div className="font-body font-normal text-zinc-400 text-sm leading-relaxed">
            {description}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
