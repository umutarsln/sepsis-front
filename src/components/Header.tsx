'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClockIcon,
  FireIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import clsx from 'clsx'

/**
 * Global Header Component
 * 
 * Aktif eğitimleri ve istatistikleri gösterir.
 */

interface ActiveJob {
  job_id: string
  model_type: string
  progress: number
  current_step: string
  started_at: string | null
}

export default function Header() {
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([])
  const [stats, setStats] = useState({
    completed_count: 0,
    running_count: 0,
    failed_count: 0,
    total_count: 0,
    success_rate: 0
  })
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobs, statsData] = await Promise.all([
          api.training.getActiveJobs(),
          api.training.getStats()
        ])
        setActiveJobs(jobs)
        setStats(statsData)
      } catch (error) {
        console.error('Failed to load header data:', error)
      } finally {
        setLoading(false)
      }
    }

    // İlk yükleme
    void fetchData()

    // 3 saniyede bir güncelle
    const interval = setInterval(() => {
      void fetchData()
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => setShowDropdown(false)}
        />
      )}
      
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm"
      >
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Sol taraf: Logo - sadece spacing için */}
            <div className="w-[280px]" />

            {/* Orta: Aktif eğitimler */}
            {activeJobs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
              >
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <ClockIcon className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    {activeJobs.length} Eğitim Devam Ediyor
                  </span>
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full mt-2 right-0 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-40"
                    >
                    <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                      {activeJobs.map((job) => (
                        <div
                          key={job.job_id}
                          className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">
                              {job.model_type.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {job.progress.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {job.current_step}
                          </p>
                          {job.started_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Başlangıç: {new Date(job.started_at).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Sağ: İstatistikler */}
          <div className="flex items-center space-x-6 text-sm">
            {stats.total_count > 0 && (
              <>
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {stats.completed_count}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <FireIcon className="w-5 h-5 text-orange-600" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {stats.running_count}
                  </span>
                </div>
                {stats.failed_count > 0 && (
                  <div className="flex items-center space-x-2">
                    <XCircleIcon className="w-5 h-5 text-red-600" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {stats.failed_count}
                    </span>
                  </div>
                )}
                <div className="text-gray-500 dark:text-gray-400">
                  {stats.success_rate}% başarı
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </motion.header>
    </>
  )
}

