import {
  ArrowLeftRight,
  BarChart3,
  Gamepad2,
  History,
  LayoutDashboard,
  RectangleHorizontal,
  Settings,
  Trophy,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { TranslationKey } from '@/i18n'

export interface NavItem {
  to: string
  label: TranslationKey
  icon: LucideIcon
  group: 'main' | 'library'
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'nav.dashboard', icon: LayoutDashboard, group: 'main' },
  { to: '/converter', label: 'nav.converter', icon: ArrowLeftRight, group: 'main' },
  { to: '/compare', label: 'nav.compare', icon: BarChart3, group: 'main' },
  { to: '/tournaments', label: 'nav.tournaments', icon: Trophy, group: 'main' },
  { to: '/mousepad', label: 'nav.mousepad', icon: RectangleHorizontal, group: 'main' },
  { to: '/tools', label: 'nav.tools', icon: Wrench, group: 'main' },
  { to: '/profiles', label: 'nav.profiles', icon: UserRound, group: 'library' },
  { to: '/history', label: 'nav.history', icon: History, group: 'library' },
  { to: '/games', label: 'nav.games', icon: Gamepad2, group: 'library' },
  { to: '/settings', label: 'nav.settings', icon: Settings, group: 'library' },
]
