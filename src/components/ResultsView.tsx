'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircleIcon,
  DocumentArrowDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'

/**
 * Results View Bileşeni
 * 
 * Model eğitim sonuçlarını ve görselleştirmeleri gösterir.
 */
export default function ResultsView({ jobId }: { jobId: string }) {
  const [results, setResults] = useState<any>(null)
  const [visualizations, setVisualizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true)
      try {
        // Önce job status'u kontrol et
        const status = await api.training.getStatus(jobId)
        
        if (status.status !== 'completed') {
          console.log('Job henüz tamamlanmadı:', status.status)
          setLoading(false)
          return
        }
        
        // Sadece completed ise results yükle
        const [resultsData, vizData] = await Promise.all([
          api.results.getResults(jobId),
          api.results.getVisualizations(jobId),
        ])
        
        setResults(resultsData)
        setVisualizations(vizData)
      } catch (error) {
        console.error('Failed to load results:', error)
      } finally {
        setLoading(false)
      }
    }

    if (jobId) {
      void loadResults()
    }
  }, [jobId])

  // Download functions
  const downloadCSV = () => {
    const csv = [
      ['Model', ...Object.keys(results.metrics)],
      [results.model_type, ...Object.values(results.metrics).map(v => String(v))],
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `metrics_${jobId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Sonuçlar yükleniyor...</p>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="text-center py-12">
        <div className="inline-block p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium">
            ⏳ Eğitim henüz tamamlanmadı
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
            Lütfen "Eğitim İzleme" tab'ına geçerek ilerlemeyi takip edin.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <div className="card bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
        <div className="flex items-center">
          <CheckCircleIcon className="w-6 h-6 text-green-600 mr-3" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 dark:text-green-100">
              Eğitim Başarıyla Tamamlandı!
            </h3>
            <p className="text-sm text-green-800 dark:text-green-200 mt-1">
              Model: {results.model_type.toUpperCase()} | Job ID: {jobId}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Performans Metrikleri</h3>
          <button
            onClick={downloadCSV}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
            CSV İndir
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                  Metrik
                </th>
                <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                  Değer
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(results.metrics).map(([metric, value]) => (
                <tr
                  key={metric}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <td className="py-3 px-4 text-sm font-medium">{metric.toUpperCase()}</td>
                  <td className="py-3 px-4 text-sm text-right font-mono">
                    {typeof value === 'number' ? value.toFixed(4) : String(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visualizations Grid */}
      {visualizations.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Görselleştirmeler</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visualizations.map((viz, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="cursor-pointer"
                onClick={() => setSelectedImage(viz.image_base64)}
              >
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors">
                  <div className="aspect-video flex items-center justify-center bg-white dark:bg-gray-800">
                    <img
                      src={`data:image/png;base64,${viz.image_base64}`}
                      alt={viz.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-sm">{viz.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {viz.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative max-w-5xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>
            <img
              src={`data:image/png;base64,${selectedImage}`}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain"
            />
          </motion.div>
        </div>
      )}

      {/* Model Info */}
      {results.model_path && results.model_path !== 'N/A' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Model Dosyası</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
            {results.model_path}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Model dosyası sunucuda kaydedildi
          </p>
        </div>
      )}
    </div>
  )
}

