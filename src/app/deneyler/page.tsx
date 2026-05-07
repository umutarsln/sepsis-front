'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { motion } from 'framer-motion'
import { 
  BeakerIcon, 
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

/**
 * Deneyler Sayfası
 * 
 * MLflow tarzı deney izleme ve sonuçları.
 */

export default function DeneylerPage() {
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null)

  // Mock deney verileri
  const experiments = [
    {
      id: 'exp_001',
      name: 'GRU-128-2Layer-Focal',
      status: 'completed',
      model: 'GRU',
      params: {
        hidden_size: 128,
        num_layers: 2,
        dropout: 0.3,
        loss: 'focal',
        lr: 0.001,
        batch_size: 64,
      },
      metrics: {
        train_auroc: 0.892,
        val_auroc: 0.847,
        test_auroc: 0.850,
        train_loss: 0.234,
        val_loss: 0.298,
        epochs_trained: 45,
      },
      duration: '6h 23m',
      created_at: '2024-01-10 14:23',
    },
    {
      id: 'exp_002',
      name: 'GRU-256-3Layer-WeightedBCE',
      status: 'completed',
      model: 'GRU',
      params: {
        hidden_size: 256,
        num_layers: 3,
        dropout: 0.4,
        loss: 'weighted_bce',
        lr: 0.0005,
        batch_size: 32,
      },
      metrics: {
        train_auroc: 0.905,
        val_auroc: 0.841,
        test_auroc: 0.838,
        train_loss: 0.198,
        val_loss: 0.312,
        epochs_trained: 52,
      },
      duration: '8h 45m',
      created_at: '2024-01-11 09:15',
    },
    {
      id: 'exp_003',
      name: 'LSTM-128-2Layer-Focal',
      status: 'completed',
      model: 'LSTM',
      params: {
        hidden_size: 128,
        num_layers: 2,
        dropout: 0.3,
        loss: 'focal',
        lr: 0.001,
        batch_size: 64,
      },
      metrics: {
        train_auroc: 0.887,
        val_auroc: 0.839,
        test_auroc: 0.842,
        train_loss: 0.245,
        val_loss: 0.305,
        epochs_trained: 48,
      },
      duration: '7h 12m',
      created_at: '2024-01-12 11:30',
    },
    {
      id: 'exp_004',
      name: 'Transformer-4Layer-8Head',
      status: 'running',
      model: 'Transformer',
      params: {
        d_model: 128,
        nhead: 8,
        num_layers: 4,
        dropout: 0.2,
        loss: 'focal',
        lr: 0.0001,
        batch_size: 32,
      },
      metrics: {
        train_auroc: 0.823,
        val_auroc: 0.801,
        test_auroc: null,
        train_loss: 0.312,
        val_loss: 0.356,
        epochs_trained: 12,
      },
      duration: '3h 45m (devam ediyor)',
      created_at: '2024-01-13 08:00',
    },
    {
      id: 'exp_005',
      name: 'XGBoost-Optimized',
      status: 'completed',
      model: 'XGBoost',
      params: {
        n_estimators: 150,
        max_depth: 8,
        learning_rate: 0.05,
        subsample: 0.8,
        colsample_bytree: 0.8,
      },
      metrics: {
        train_auroc: 0.895,
        val_auroc: 0.832,
        test_auroc: 0.829,
        train_loss: null,
        val_loss: null,
        epochs_trained: null,
      },
      duration: '25m',
      created_at: '2024-01-13 16:45',
    },
  ]

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

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Deneyler
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            ML deneyleri ve performans izleme
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Deney</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {experiments.length}
                </p>
              </div>
              <BeakerIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tamamlanan</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {experiments.filter(e => e.status === 'completed').length}
                </p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Çalışıyor</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {experiments.filter(e => e.status === 'running').length}
                </p>
              </div>
              <ArrowTrendingUpIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">En İyi AUROC</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  0.850
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Experiments Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Deney Adı
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Model
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Durum
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Train AUROC
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Val AUROC
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Test AUROC
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Süre
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody>
                {experiments.map((exp, index) => (
                  <motion.tr
                    key={exp.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedExperiment(exp.id)}
                    className={clsx(
                      'border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors',
                      'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                      selectedExperiment === exp.id && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {exp.name}
                        </p>
                        <p className="text-xs text-gray-500">{exp.id}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <CpuChipIcon className="w-4 h-4 mr-1 text-gray-400" />
                        <span className="text-sm">{exp.model}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        getStatusColor(exp.status)
                      )}>
                        {exp.status === 'completed' && '✓ Tamamlandı'}
                        {exp.status === 'running' && '⟳ Çalışıyor'}
                        {exp.status === 'failed' && '✗ Başarısız'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      {exp.metrics.train_auroc?.toFixed(3) || '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-semibold">
                      {exp.metrics.val_auroc?.toFixed(3) || '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-purple-600">
                      {exp.metrics.test_auroc?.toFixed(3) || '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      <div className="flex items-center justify-end">
                        <ClockIcon className="w-4 h-4 mr-1 text-gray-400" />
                        {exp.duration}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-gray-500">
                      {exp.created_at}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Experiment Details */}
        {selectedExperiment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 card"
          >
            {(() => {
              const exp = experiments.find(e => e.id === selectedExperiment)!
              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Deney Detayları: {exp.name}</h3>
                    <button
                      onClick={() => setSelectedExperiment(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Parameters */}
                    <div>
                      <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">
                        Hiperparametreler
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(exp.params).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{key}</span>
                            <span className="font-mono font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div>
                      <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">
                        Performans Metrikleri
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(exp.metrics)
                          .filter(([_, value]) => value !== null)
                          .map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">{key}</span>
                              <span className="font-mono font-medium">
                                {typeof value === 'number' ? value.toFixed(3) : value}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  )
}

