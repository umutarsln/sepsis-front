'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { 
  PlayIcon,
  ServerIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'

/**
 * Training Configuration Bileşeni
 * 
 * Model eğitimi yapılandırması için form.
 */
export default function TrainingConfig({ 
  datasets, 
  onTrainingConfigured 
}: { 
  datasets: any[]
  onTrainingConfigured?: (jobId: string) => void 
}) {
  const [config, setConfig] = useState({
    dataset_id: '',
    model_type: 'lr',
    horizon: 6,
    metrics: ['auroc', 'auprc', 'sensitivity', 'specificity'],
    test_size: 0.2,
  })
  const [loading, setLoading] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const availableModels = [
    { value: 'lr', label: 'Logistic Regression', color: 'blue' },
    { value: 'xgboost', label: 'XGBoost', color: 'green' },
    { value: 'rf', label: 'Random Forest', color: 'purple' },
    { value: 'svm', label: 'Support Vector Machine', color: 'orange' },
  ]

  const availableMetrics = [
    { value: 'auroc', label: 'AUROC (Area Under ROC)' },
    { value: 'auprc', label: 'AUPRC (Area Under PR)' },
    { value: 'sensitivity', label: 'Sensitivity (Recall)' },
    { value: 'specificity', label: 'Specificity' },
    { value: 'ppv', label: 'PPV (Precision)' },
    { value: 'npv', label: 'NPV' },
    { value: 'f1', label: 'F1 Score' },
    { value: 'ece', label: 'ECE (Calibration Error)' },
    { value: 'brier', label: 'Brier Score' },
    { value: 'far', label: 'FAR (False Alarm Rate)' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!config.dataset_id) {
      toast.error('Lütfen bir veri seti seçin')
      return
    }

    setLoading(true)

    try {
      // Configure training
      const { job_id } = await api.training.configure(config)
      
      toast.success('Eğitim yapılandırması oluşturuldu')
      
      // Callback
      if (onTrainingConfigured) {
        onTrainingConfigured(job_id)
      }
      
    } catch (error: any) {
      console.error('Configuration failed:', error)
      toast.error(error.message || 'Yapılandırma başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Dataset Selection */}
      <div className="card">
        <div className="flex items-center mb-4">
          <ChartBarIcon className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold">Veri Seti Seçimi</h3>
        </div>

        {datasets.length === 0 ? (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Lütfen önce bir veri seti yükleyin
            </p>
          </div>
        ) : (
          <select
            value={config.dataset_id}
            onChange={(e) => setConfig({ ...config, dataset_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
            required
          >
            <option value="">Veri seti seçin...</option>
            {datasets.map((dataset) => (
              <option key={dataset.dataset_id} value={dataset.dataset_id}>
                {dataset.filename} ({dataset.rows?.toLocaleString() || 'N/A'} satır)
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Model Selection */}
      <div className="card">
        <div className="flex items-center mb-4">
          <ServerIcon className="w-5 h-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold">Model Seçimi</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {availableModels.map((model) => (
            <motion.button
              key={model.value}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setConfig({ ...config, model_type: model.value })}
              className={
                config.model_type === model.value
                  ? `p-4 rounded-lg border-2 transition-all border-blue-500 bg-blue-50 dark:bg-blue-900/20`
                  : 'p-4 rounded-lg border-2 transition-all border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }
            >
              <div className="text-center">
                <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                  config.model_type === model.value ? 'bg-blue-500' : 'bg-gray-300'
                }`} />
                <p className="text-sm font-medium">{model.label}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Prediction Horizon */}
      <div className="card">
        <div className="flex items-center mb-4">
          <AdjustmentsHorizontalIcon className="w-5 h-5 text-green-600 mr-2" />
          <h3 className="text-lg font-semibold">Tahmin Ufku</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="2"
              max="12"
              step="2"
              value={config.horizon}
              onChange={(e) => setConfig({ ...config, horizon: parseInt(e.target.value) })}
              className="flex-1"
            />
            <span className="font-mono font-semibold w-16 text-right">
              {config.horizon}h
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Model, sepsis başlangıcından kaç saat önce tahmin yapmalı?
          </p>
        </div>
      </div>

      {/* Metrics Selection */}
      <div className="card">
        <div className="flex items-center mb-4">
          <ChartBarIcon className="w-5 h-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold">Değerlendirme Metrikleri</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableMetrics.map((metric) => (
            <label
              key={metric.value}
              className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={config.metrics.includes(metric.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setConfig({ ...config, metrics: [...config.metrics, metric.value] })
                  } else {
                    setConfig({ ...config, metrics: config.metrics.filter(m => m !== metric.value) })
                  }
                }}
                className="mr-2"
              />
              <span className="text-sm">{metric.label}</span>
            </label>
          ))}
        </div>

        {config.metrics.length === 0 && (
          <p className="text-xs text-red-600 mt-2">
            Lütfen en az bir metrik seçin
          </p>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="card">
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center justify-between w-full mb-4"
        >
          <div className="flex items-center">
            <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold">Gelişmiş Ayarlar</h3>
          </div>
          <span className="text-gray-400">
            {advancedOpen ? '▼' : '▶'}
          </span>
        </button>

        {advancedOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Test Split Ratio ({config.test_size})
              </label>
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.05"
                value={config.test_size}
                onChange={(e) => setConfig({ ...config, test_size: parseFloat(e.target.value) })}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Veri setinin %{(config.test_size * 100).toFixed(0)}'ı test için ayrılacak
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Submit Button */}
      <motion.button
        type="submit"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={loading || !config.dataset_id || config.metrics.length === 0}
        className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PlayIcon className="w-5 h-5 mr-2" />
        {loading ? 'Yapılandırılıyor...' : 'Eğitimi Yapılandır ve Başlat'}
      </motion.button>
    </form>
  )
}

