import { motion } from 'framer-motion'
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  HardDrive,
  LayoutDashboard,
  ListTree,
  Settings,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from './utils'

interface SidebarProps {
  className?: string
  collapsed: boolean
  toggleCollapse: () => void
}

export function Sidebar({ className, collapsed, toggleCollapse }: SidebarProps) {
  const location = useLocation()

  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/' },
    { icon: Activity, label: 'Pulse', path: '/pulse' },
    { icon: ListTree, label: 'Queues', path: '/queues' },
    { icon: Clock, label: 'Schedules', path: '/schedules' },
    { icon: HardDrive, label: 'Workers', path: '/workers' },
    // { icon: Activity, label: 'Metrics', path: '/metrics' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ]

  return (
    <div
      className={cn(
        'flex-1 flex flex-col justify-between transition-all duration-300 ease-in-out relative group z-20 overflow-hidden',
        className
      )}
    >
      {/* Nav Items */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item, i) => {
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={i}
              to={item.path}
              className={cn(
                'w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-muted-foreground/60 group/item relative overflow-hidden font-heading',
                isActive
                  ? 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(0,240,255,0.1)] border border-primary/20'
                  : 'hover:bg-white/[0.03] font-medium hover:text-foreground active:scale-95'
              )}
            >
              <item.icon
                size={20}
                className={cn(
                  'transition-all shrink-0',
                  isActive ? 'scale-110 text-primary' : 'group-hover/item:scale-110'
                )}
              />
              <motion.span
                initial={false}
                animate={{
                  opacity: collapsed ? 0 : 1,
                  display: collapsed ? 'none' : 'block',
                }}
                className="font-black whitespace-nowrap tracking-tight uppercase text-[11px]"
              >
                {item.label}
              </motion.span>
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute left-0 w-1 h-5 bg-primary rounded-r-full shadow-[0_0_10px_#00F0FF]"
                />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer / Toggle */}
      <div className="p-4 border-t border-border/50">
        <button
          type="button"
          onClick={toggleCollapse}
          className="w-full flex items-center justify-center h-10 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-90"
        >
          {collapsed ? (
            <ChevronRight size={20} />
          ) : (
            <div className="flex items-center gap-2 px-2">
              <ChevronLeft size={18} />{' '}
              <span className="text-xs font-black uppercase tracking-widest">Collapse Sidebar</span>
            </div>
          )}
        </button>
      </div>
    </div>
  )
}
