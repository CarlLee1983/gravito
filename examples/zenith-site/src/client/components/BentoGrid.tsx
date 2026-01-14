import { type ClassValue, clsx } from 'clsx'
import { motion } from 'framer-motion'
import type React from 'react'
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
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={cn(
        'row-span-1 rounded-3xl group/bento hover:shadow-xl transition duration-200 shadow-input bg-zenith-surface/40 border border-white/5 p-6 justify-between flex flex-col space-y-4 backdrop-blur-sm',
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-2 transition duration-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-zenith-pulse/10 text-zenith-accent">{icon}</div>
          <div className="font-bold text-white text-lg">{title}</div>
        </div>
        <div className="font-normal text-gray-400 text-sm">{description}</div>
      </div>
    </motion.div>
  )
}
