'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import clsx from 'clsx'

/**
 * Training Monitor Bileşeni
 * 
 * Model eğitimi ilerlemesini izler.
 */
export default function TrainingMonitor({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Polling ile durum güncelle
  useEffect(() => {
    if (!jobId) return

    const pollStatus = async () => {
      try {
        const [statusData, logsData] = await Promise.all([
          api.training.getStatus(jobId),
          api.training.getLogs(jobId),
        ])
        
        setStatus(statusData)
        setLogs(logsData.logs)
        
        // Eğer tamamlandı veya başarısız, durdurmak istersek
        // if (statusData.status === 'completed' || statusData.status === 'failed') {
        //   // Polling'i durdur
        // }
      } catch (error) {
        console.error('Failed to fetch status:', error)
      }
    }

    // İlk yükleme
    void pollStatus()

    // Her 2 saniyede bir güncelle
    const interval = setInterval(pollStatus, 2000)

    return () => clearInterval(interval)
  }, [jobId])

  // Status renk fonksiyonu
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'running':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
      case 'failed':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700'
    }
  }

  // Geçen süre hesapla
  const getElapsedTime = () => {
    if (!status?.start_time) return null
    
    const start = new Date(status.start_time)
    const now = status.end_time ? new Date(status.end_time) : new Date()
    const elapsed = now.getTime() - start.getTime()
    
    const seconds = Math.floor(elapsed / 1000) % 60
    const minutes = Math.floor(elapsed / 1000 / 60) % 60
    const hours = Math.floor(elapsed / 1000 / 60 / 60)
    
    if (hours > 0) {
      return `${hours}s ${minutes}d ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}d ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  if (!status) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Eğitim Durumu</h3>
          <span className={clsx(
            'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
            getStatusColor(status.status)
          )}>
            {status.status === 'completed' && '✓ Tamamlandı'}
            {status.status === 'running' && '⟳ Çalışıyor'}
            {status.status === 'failed' && '✗ Başarısız'}
            {status.status === 'pending' && '⏸ Bekliyor'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">İlerleme</span>
            <span className="text-sm font-bold">{status.progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${status.progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Current Step */}
        <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          {status.status === 'running' && (
            <ClockIcon className="w-5 h-5 text-blue-600 animate-spin mt-0.5" />
          )}
          {status.status === 'pending' && (
            <ClockIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
          )}
          {status.status === 'completed' && (
            <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
          )}
          {status.status === 'failed' && (
            <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">{status.current_step}</p>
            {status.status === 'pending' && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                ⏳ Eğitim başlatılıyor, lütfen bekleyin...
              </p>
            )}
            {status.start_time && (
              <p className="text-xs text-gray-500 mt-1">
                Geçen süre: {getElapsedTime()}
              </p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {status.error_message && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Hata:</strong> {status.error_message}
            </p>
          </div>
        )}
      </div>

      {/* Steps Progress */}
      {status.status === 'running' && (
        <div className="card">
          <h4 className="text-md font-semibold mb-4">Adımlar</h4>
          <div className="space-y-3">
            {[
              { name: 'Veri yükleniyor', progress: status.progress >= 20 ? 100 : status.progress > 0 ? 50 : 0 },
              { name: 'Preprocessing', progress: status.progress >= 40 ? 100 : status.progress > 20 ? 50 : 0 },
              { name: 'Model eğitiliyor', progress: status.progress >= 80 ? 100 : status.progress > 40 ? 50 : 0 },
              { name: 'Değerlendirme', progress: status.progress >= 100 ? 100 : status.progress > 80 ? 50 : 0 },
            ].map((step, idx) => (
              <div key={idx} className="flex items-center space-x-3">
                <div className="w-32 text-sm">{step.name}</div>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-full bg-green-600 rounded-full transition-all duration-300"
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
                <span className="text-xs w-12 text-right">{step.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="card">
          <h4 className="text-md font-semibold mb-4">Loglar</h4>
          <div className="bg-gray-900 text-green-400 font-mono text-xs p-4 rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

