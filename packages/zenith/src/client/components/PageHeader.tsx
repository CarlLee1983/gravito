import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../utils'

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex justify-between items-end', className)}>
      <div>
        <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Icon size={32} />
          </div>
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-2 text-sm font-bold opacity-60 uppercase tracking-widest pl-[3.75rem]">
            {description}
          </p>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}
