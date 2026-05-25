'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon,
  ChartBarIcon,
  BeakerIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CpuChipIcon,
  AdjustmentsHorizontalIcon,
  LightBulbIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

/**
 * Sidebar navigasyon bileşeni
 * 
 * Daraltılabilir/genişletilebilir sidebar ile sayfa navigasyonu.
 */

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: (collapsed: boolean) => void
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: HomeIcon,
    description: 'Ana gösterge paneli'
  },
  {
    name: 'Simülatör',
    href: '/simulator',
    icon: AdjustmentsHorizontalIcon,
    description: 'Canlı çoklu model risk tahmini'
  },
  {
    name: 'DL Pencere',
    href: '/dl-pencere',
    icon: ClockIcon,
    description: 'Saatlik seri ile DL tahmin demo'
  },
  {
    name: 'Model Karşılaştırma',
    href: '/modeller',
    icon: CpuChipIcon,
    description: 'Model performans karşılaştırması'
  },
  {
    name: 'Açıklanabilirlik',
    href: '/aciklanabilirlik',
    icon: LightBulbIcon,
    description: 'SHAP, attention, LIME'
  },
  {
    name: 'Veri Analizi',
    href: '/analiz',
    icon: ChartBarIcon,
    description: 'Veri görselleştirme ve istatistikler'
  },
  {
    name: 'Deneyler',
    href: '/deneyler',
    icon: BeakerIcon,
    description: 'ML deneyleri ve sonuçları'
  },
  {
    name: 'Ayarlar',
    href: '/ayarlar',
    icon: Cog6ToothIcon,
    description: 'Sistem ayarları'
  },
]

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()

  const sidebarWidth = collapsed ? 80 : 280

  return (
    <aside
      style={{ width: sidebarWidth }}
      className="fixed left-0 top-0 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40 flex flex-col transition-all duration-300 ease-in-out"
    >
      {/* Logo & Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div>
                <h1 className="font-bold text-gray-900 dark:text-white text-sm">
                  Sepsis AI
                </h1>
                <p className="text-xs text-gray-500">Erken Uyarı</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto"
            >
              <span className="text-white font-bold text-xl">S</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link key={item.name} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={clsx(
                  'flex items-center px-3 py-3 rounded-lg transition-colors cursor-pointer group relative',
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                )}
              >
                <Icon className={clsx(
                  'flex-shrink-0',
                  collapsed ? 'w-6 h-6 mx-auto' : 'w-5 h-5'
                )} />
                
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-3 overflow-hidden"
                    >
                      <div className="font-medium text-sm">{item.name}</div>
                      {!collapsed && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId={`activeTab-${item.href}`}
                    className="absolute left-0 w-1 h-8 bg-blue-600 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onToggleCollapse(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
        >
          {collapsed ? (
            <ChevronRightIcon className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeftIcon className="w-5 h-5 mr-2" />
              <span className="text-sm">Daralt</span>
            </>
          )}
        </motion.button>
      </div>
    </aside>
  )
}

