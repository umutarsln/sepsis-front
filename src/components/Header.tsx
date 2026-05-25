'use client'

import { motion } from 'framer-motion'

/**
 * Global Header — ust navigasyon cubugu.
 *
 * sepsis-son demo backend egitim pipeline'i desteklemediginden
 * /training/* polling yapilmaz.
 */
export default function Header() {
  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm"
    >
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="w-[280px]" />
          <div className="flex-1" />
        </div>
      </div>
    </motion.header>
  )
}
