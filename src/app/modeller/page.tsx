'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { motion } from 'framer-motion'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { 
  CpuChipIcon, 
  ClockIcon, 
  BoltIcon,
  ChartBarIcon,
  AdjustmentsHorizontalIcon,
  PlayCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import DataUpload from '@/components/DataUpload'
import TrainingConfig from '@/components/TrainingConfig'
import TrainingMonitor from '@/components/TrainingMonitor'
import ResultsView from '@/components/ResultsView'
import { api, VersionComparisonRow, DLSummaryRow } from '@/lib/api'
import clsx from 'clsx'

/**
 * Model Karşılaştırma Sayfası
 * 
 * Farklı modellerin performans karşılaştırması ve eğitim.
 */

type TabType = 'comparison' | 'upload' | 'configure' | 'monitor' | 'results'

export default function ModellerPage() {
  // Tab management
  const [activeTab, setActiveTab] = useState<TabType>('comparison')
  
  // State
  const [datasets, setDatasets] = useState<any[]>([])
  const [selectedDataset, setSelectedDataset] = useState<any>(null)
  const [trainingJobId, setTrainingJobId] = useState<string | null>(null)

  // Artifact verileri
  const [versionRows, setVersionRows] = useState<VersionComparisonRow[]>([])
  const [dlRows, setDlRows] = useState<DLSummaryRow[]>([])
  const [artifactError, setArtifactError] = useState<string | null>(null)

  // Load datasets + artifact verileri
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [data, vRows, dRows] = await Promise.all([
          api.dataset.list().catch(() => []),
          api.artifacts.getVersionComparison(),
          api.artifacts.getDlSummary(),
        ])
        setDatasets(data)
        setVersionRows(vRows)
        setDlRows(dRows)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Yükleme hatası'
        setArtifactError(msg)
      }
    }
    void loadAll()
  }, [])

  // Session persistence: Restore training job on mount
  useEffect(() => {
    const savedJobId = localStorage.getItem('active_training_job')
    if (savedJobId) {
      // Check if job is still active
      api.training.getStatus(savedJobId).then((status) => {
        if (status.status === 'running') {
          setTrainingJobId(savedJobId)
          setActiveTab('monitor')
        } else if (status.status === 'completed') {
          setTrainingJobId(savedJobId)
          setActiveTab('results')
        } else {
          // Job is done or failed, clear localStorage
          localStorage.removeItem('active_training_job')
        }
      }).catch(() => {
        // Job not found, clear localStorage
        localStorage.removeItem('active_training_job')
      })
    }
  }, [])

  // Handlers
  const handleDatasetUploaded = (dataset: any) => {
    setSelectedDataset(dataset)
    setActiveTab('configure')
  }

  const handleTrainingConfigured = (jobId: string) => {
    localStorage.setItem('active_training_job', jobId)
    setTrainingJobId(jobId)
    setActiveTab('monitor')
  }

  /**
   * Artifact verisinden ekrana çıkacak özet model kartlarını üretir.
   *
   * - V5 GridSearch + V6 Ensemble + en iyi DL modelleri seçilir.
   */
  const models = useMemo(() => {
    const palette = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#0ea5e9']
    const items: Array<{
      name: string
      type: string
      auroc: number
      auprc: number
      sensitivity: number
      specificity: number
      ppv: number
      sensAtSpec85: number
      trainTime: string
      params: string
      color: string
    }> = []

    // V5 GridSearch — tüm sklearn aileleri
    const v5 = versionRows.filter((r) => r.group === 'v5_temporal_cap200k_gridsearch')
    v5.forEach((r) => {
      items.push({
        name: r.model.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        type: 'Sklearn (V5)',
        auroc: r.test_auroc ?? 0,
        auprc: r.test_auprc ?? 0,
        sensitivity: r.test_sensitivity ?? 0,
        specificity: r.test_specificity ?? 0,
        ppv: r.test_ppv ?? 0,
        sensAtSpec85: r.sens_at_target_spec ?? 0,
        trainTime: r.train_seconds ? `${(r.train_seconds / 60).toFixed(1)} dk` : '—',
        params: r.n_features ? `${r.n_features}f` : '—',
        color: palette[items.length % palette.length],
      })
    })

    // V6 Ensemble
    const ensemble = versionRows.find((r) => r.model === 'ensemble_v6')
    if (ensemble) {
      items.push({
        name: 'V6 Ensemble',
        type: 'XGB + Transformer',
        auroc: ensemble.test_auroc ?? 0,
        auprc: ensemble.test_auprc ?? 0,
        sensitivity: ensemble.test_sensitivity ?? 0,
        specificity: ensemble.test_specificity ?? 0,
        ppv: ensemble.test_ppv ?? 0,
        sensAtSpec85: ensemble.sens_at_target_spec ?? 0,
        trainTime: '—',
        params: '—',
        color: palette[items.length % palette.length],
      })
    }

    // DL: en yüksek AUROC senaryosunu temsil olarak seç
    const dlBest = [...dlRows]
      .sort((a, b) => b.test_auroc - a.test_auroc)
      .slice(0, 2)
    dlBest.forEach((r) => {
      items.push({
        name: r.model === 'bigru_attn' ? 'BiGRU + Attention' : 'Transformer',
        type: `${r.scenario} · DL`,
        auroc: r.test_auroc,
        auprc: r.test_auprc,
        sensitivity: r.sens_at_spec85,
        specificity: 0.85,
        ppv: 0,
        sensAtSpec85: r.sens_at_spec85,
        trainTime: `${(r.train_seconds / 60).toFixed(1)} dk`,
        params: '~140K',
        color: palette[items.length % palette.length],
      })
    })

    return items
  }, [versionRows, dlRows])

  /**
   * Radar grafiği için en iyi 4 modelin AUROC/AUPRC/Sens/PPV/Spec değerlerini
   * 0–100 ölçeğine taşır.
   */
  const radarData = useMemo(() => {
    if (models.length === 0) return []
    const top = [...models].sort((a, b) => b.auroc - a.auroc).slice(0, 4)
    const metrics: Array<{ key: keyof typeof top[number]; label: string }> = [
      { key: 'auroc', label: 'AUROC' },
      { key: 'auprc', label: 'AUPRC' },
      { key: 'sensitivity', label: 'Sens' },
      { key: 'specificity', label: 'Spec' },
      { key: 'sensAtSpec85', label: 'Sens@Spec85' },
    ]
    return metrics.map((m) => {
      const row: Record<string, number | string> = { metric: m.label }
      top.forEach((mdl) => {
        row[mdl.name] = Math.round((mdl[m.key] as number) * 100)
      })
      return row
    })
  }, [models])

  const radarKeys = useMemo(
    () => [...models].sort((a, b) => b.auroc - a.auroc).slice(0, 4).map((m) => m.name),
    [models],
  )

  /**
   * Horizon performance — V1..V5 versiyonlarının AUROC karşılaştırması
   * (h6 sabit; ama versiyonlar farklı feature engineering aşamalarını temsil
   * ediyor).
   */
  const horizonPerformance = useMemo(() => {
    const groups = [
      { id: 'v1_flat_cap200k_fixed', label: 'V1 Flat' },
      { id: 'v2_flat_full_fixed', label: 'V2 Full' },
      { id: 'v3_flat_cap200k_gridsearch', label: 'V3 Grid' },
      { id: 'v4_temporal_cap200k_fixed', label: 'V4 Temp' },
      { id: 'v5_temporal_cap200k_gridsearch', label: 'V5 Best' },
    ]
    return groups.map((g) => {
      const rows = versionRows.filter((r) => r.group === g.id)
      const xgb = rows.find((r) => r.model === 'xgboost')?.test_auroc ?? 0
      const rf = rows.find((r) => r.model === 'random_forest')?.test_auroc ?? 0
      const lr = rows.find((r) => r.model === 'logistic_regression')?.test_auroc ?? 0
      return {
        horizon: g.label,
        xgb: Number(xgb.toFixed(4)),
        rf: Number(rf.toFixed(4)),
        lr: Number(lr.toFixed(4)),
      }
    })
  }, [versionRows])

  const bestModel = useMemo(() => {
    if (models.length === 0) return null
    return [...models].sort((a, b) => b.auroc - a.auroc)[0]
  }, [models])

  // Tab configuration
  const tabs = [
    { id: 'comparison' as const, label: 'Model Karşılaştırma', icon: ChartBarIcon },
    { id: 'upload' as const, label: 'Veri Yükleme', icon: BoltIcon },
    { id: 'configure' as const, label: 'Eğitim Yapılandırma', icon: AdjustmentsHorizontalIcon },
    { id: 'monitor' as const, label: 'Eğitim İzleme', icon: PlayCircleIcon },
    { id: 'results' as const, label: 'Sonuçlar', icon: CheckCircleIcon },
  ]

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
            Model Karşılaştırma
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Model eğitimi ve performans karşılaştırması
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors',
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            {/* Model Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {models.map((model, index) => (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: model.color }}
                    />
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {model.type}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2">{model.name}</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">AUROC</span>
                      <span className="font-semibold tabular-nums">{model.auroc.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">AUPRC</span>
                      <span className="font-semibold tabular-nums">{model.auprc.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Sens@Spec85</span>
                      <span className="font-semibold tabular-nums">{model.sensAtSpec85.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        {model.trainTime}
                      </div>
                      <div className="flex items-center">
                        <CpuChipIcon className="w-4 h-4 mr-1" />
                        {model.params}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Radar Chart - artifact verisi */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">
                Genel Performans Karşılaştırması (Top 4)
              </h3>
              {radarKeys.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  Artifact yükleniyor…
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    {radarKeys.map((name, i) => {
                      const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b']
                      return (
                        <Radar
                          key={name}
                          name={name}
                          dataKey={name}
                          stroke={colors[i % 4]}
                          fill={colors[i % 4]}
                          fillOpacity={0.3}
                        />
                      )
                    })}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Versiyon AUROC ilerlemesi - artifact verisi */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">
                Versiyon Bazlı AUROC İlerlemesi (h=6)
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                V1 (flat 200K) → V2 (full) → V3 (GridSearch) → V4 (temporal FE) →
                V5 (temporal + GridSearch). Veri kaynağı: <code>version_comparison.csv</code>.
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={horizonPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="horizon" />
                  <YAxis domain={[0.6, 0.85]} tickFormatter={(v) => v.toFixed(2)} />
                  <Tooltip formatter={(v: number) => v.toFixed(4)} />
                  <Legend />
                  <Line type="monotone" dataKey="lr" stroke="#3b82f6" strokeWidth={2} name="Logistic Regression" />
                  <Line type="monotone" dataKey="xgb" stroke="#10b981" strokeWidth={2} name="XGBoost" />
                  <Line type="monotone" dataKey="rf" stroke="#8b5cf6" strokeWidth={2} name="Random Forest" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* DL Senaryo Karşılaştırması - artifact verisi */}
            {dlRows.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">
                  Derin Öğrenme Senaryoları (h=6, w=24)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-3 font-semibold">Senaryo</th>
                        <th className="text-left py-2 px-3 font-semibold">Model</th>
                        <th className="text-right py-2 px-3 font-semibold">AUROC</th>
                        <th className="text-right py-2 px-3 font-semibold">95% CI</th>
                        <th className="text-right py-2 px-3 font-semibold">AUPRC</th>
                        <th className="text-right py-2 px-3 font-semibold">F1</th>
                        <th className="text-right py-2 px-3 font-semibold">Sens@Spec85</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dlRows.map((r, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="py-2 px-3">
                            <span className="font-mono text-xs">{r.scenario}</span>
                            <span className="ml-2 text-xs text-gray-500">{r.label}</span>
                          </td>
                          <td className="py-2 px-3 font-medium">
                            {r.model === 'bigru_attn' ? 'BiGRU + Attn' : 'Transformer'}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums font-semibold">
                            {r.test_auroc.toFixed(4)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-xs text-gray-500">
                            [{r.auroc_lo.toFixed(3)}, {r.auroc_hi.toFixed(3)}]
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {r.test_auprc.toFixed(4)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {r.test_f1.toFixed(3)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {r.sens_at_spec85.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* En iyi model paneli */}
            {bestModel && (
              <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-700">
                <div className="flex items-center mb-3">
                  <BoltIcon className="w-6 h-6 text-purple-600 mr-2" />
                  <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                    En İyi Performans: {bestModel.name}
                  </h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
                  Gerçek test seti üzerinde en yüksek AUROC'a sahip model. Versiyon
                  zinciri (V1→V5) boyunca AUROC 0.63'ten {bestModel.auroc.toFixed(2)}'e
                  yükselmiş. Veri kaynağı: <code>version_comparison.csv</code>.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 tabular-nums">
                      {bestModel.auroc.toFixed(3)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">AUROC</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 tabular-nums">
                      {bestModel.auprc.toFixed(3)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">AUPRC</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 tabular-nums">
                      {(bestModel.sensitivity * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Duyarlılık</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 tabular-nums">
                      {(bestModel.sensAtSpec85 * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Sens @ Spec85
                    </p>
                  </div>
                </div>
              </div>
            )}

            {artifactError && (
              <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 text-sm">
                Artifact yüklenemedi: {artifactError}
              </div>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <DataUpload onDatasetUploaded={handleDatasetUploaded} />
        )}

        {activeTab === 'configure' && (
          <TrainingConfig 
            datasets={datasets} 
            onTrainingConfigured={handleTrainingConfigured}
          />
        )}

        {activeTab === 'monitor' && trainingJobId && (
          <TrainingMonitor jobId={trainingJobId} />
        )}

        {activeTab === 'monitor' && !trainingJobId && (
          <div className="text-center py-12">
            <div className="inline-block p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-blue-800 dark:text-blue-200 font-medium">
                📋 Henüz eğitim başlatılmadı
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                Lütfen "Eğitim Yapılandırma" tab'ından eğitimi başlatın.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'results' && trainingJobId && (
          <ResultsView jobId={trainingJobId} />
        )}

        {activeTab === 'results' && !trainingJobId && (
          <div className="text-center py-12">
            <div className="inline-block p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-blue-800 dark:text-blue-200 font-medium">
                📋 Henüz eğitim tamamlanmadı
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                Lütfen önce bir eğitim başlatın ve tamamlanmasını bekleyin.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  )
}
