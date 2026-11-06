import {
  ArrowLeftRight,
  BarChart3,
  Gamepad2,
  History,
  LayoutDashboard,
  Settings,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { TranslationKey } from '@/i18n'

export interface NavItem {
  to: string
  label: TranslationKey
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/converter', label: 'nav.converter', icon: ArrowLeftRight },
  { to: '/compare', label: 'nav.compare', icon: BarChart3 },
  { to: '/profiles', label: 'nav.profiles', icon: UserRound },
  { to: '/history', label: 'nav.history', icon: History },
  { to: '/tools', label: 'nav.tools', icon: Wrench },
  { to: '/games', label: 'nav.games', icon: Gamepad2 },
  { to: '/settings', label: 'nav.settings', icon: Settings },
]
