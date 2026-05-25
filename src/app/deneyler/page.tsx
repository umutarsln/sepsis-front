'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { motion } from 'framer-motion'
import {
  BeakerIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  ChartBarIcon,
  InformationCircleIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { artifactsAPI, type ExperimentRow } from '@/lib/api'

type PhaseFilter = 'all' | 'Faz 4' | 'Faz 5' | 'Faz 6'

/**
 * Deneyler sayfasini Faz 4-6 gercek egitim loglariyla doldurur.
 */
export default function DeneylerPage() {
  const [experiments, setExperiments] = useState<ExperimentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null)
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all')

  useEffect(() => {
    let cancelled = false

    /** Backend'den deney listesini ceker. */
    async function loadExperiments() {
      try {
        setLoading(true)
        setError(null)
        const rows = await artifactsAPI.getExperiments()
        if (!cancelled) setExperiments(rows)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Deneyler yuklenemedi')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadExperiments()
    return () => {
      cancelled = true
    }
  }, [])

  /** Faz filtresine gore gorunur deneyleri dondurur. */
  const filtered = useMemo(() => {
    if (phaseFilter === 'all') return experiments
    return experiments.filter((e) => e.phase === phaseFilter)
  }, [experiments, phaseFilter])

  /** En yuksek test AUROC degerini hesaplar. */
  const bestAuroc = useMemo(() => {
    const values = experiments
      .map((e) => e.metrics.test_auroc)
      .filter((v): v is number => v != null)
    return values.length ? Math.max(...values) : null
  }, [experiments])

  /** Final benchmark kosu sayisini dondurur. */
  const finalCount = useMemo(
    () => experiments.filter((e) => e.is_final).length,
    [experiments],
  )

  /** Durum rozeti renk sinifini dondurur. */
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

  /** Metrik anahtarlarini okunabilir etikete cevirir. */
  const metricLabel = (key: string) => {
    const labels: Record<string, string> = {
      test_auroc: 'Test AUROC',
      val_auroc: 'Val AUROC',
      auprc: 'AUPRC',
      f1: 'F1',
      sens_at_spec85: 'Sens@Spec85',
      brier: 'Brier',
      threshold: 'Esik',
    }
    return labels[key] ?? key
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Deneyler
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Faz 4–6 egitim kosulari — hiperparametreler, tier karsilastirmasi ve iterasyon gecmisi
          </p>
        </div>

        <div className="mb-6 card bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <div className="flex gap-3">
            <InformationCircleIcon className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                Modeller sayfasindan farki
              </p>
              <p>
                <strong>Modeller</strong> final benchmark tablosudur (9 model, tek test seti, lead-time dahil).
                <strong> Deneyler</strong> ise egitim surecini gosterir: XGB grid aramasi, DL quick/standard/thorough
                tier&apos;lari ve hangi kosunun Faz 6 tablosuna girdigi. Ayni mimari farkli config ile kac AUROC
                verdi sorusunun cevabi burada.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Kosu</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {loading ? '…' : experiments.length}
                </p>
              </div>
              <BeakerIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Final Benchmark</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {loading ? '…' : finalCount}
                </p>
              </div>
              <StarIcon className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">DL Tier Kosulari</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  {loading ? '…' : experiments.filter((e) => e.phase === 'Faz 5').length}
                </p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-indigo-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">En Iyi Test AUROC</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {loading ? '…' : bestAuroc != null ? bestAuroc.toFixed(3) : '-'}
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {(['all', 'Faz 4', 'Faz 5', 'Faz 6'] as PhaseFilter[]).map((phase) => (
            <button
              key={phase}
              type="button"
              onClick={() => setPhaseFilter(phase)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                phaseFilter === phase
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
              )}
            >
              {phase === 'all' ? 'Tumu' : phase}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Deney
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Faz / Tier
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Model
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Test AUROC
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    AUPRC
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    F1
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      Deneyler yukleniyor…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      Bu filtrede deney bulunamadi.
                    </td>
                  </tr>
                )}
                {filtered.map((exp, index) => (
                  <motion.tr
                    key={exp.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => setSelectedExperiment(exp.id)}
                    className={clsx(
                      'border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors',
                      'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                      selectedExperiment === exp.id && 'bg-blue-50 dark:bg-blue-900/20',
                    )}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-2">
                        {exp.is_final && (
                          <StarIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" title="Final benchmark" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {exp.name}
                          </p>
                          <p className="text-xs text-gray-500">{exp.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">{exp.phase}</span>
                      {exp.tier && (
                        <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                          {exp.tier}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <CpuChipIcon className="w-4 h-4 mr-1 text-gray-400" />
                        <span className="text-sm">{exp.model}</span>
                        <span className="ml-1 text-xs text-gray-400">({exp.model_family})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-purple-600">
                      {exp.metrics.test_auroc?.toFixed(3) ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      {exp.metrics.auprc?.toFixed(3) ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      {exp.metrics.f1?.toFixed(3) ?? '-'}
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

        {selectedExperiment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 card"
          >
            {(() => {
              const exp = experiments.find((e) => e.id === selectedExperiment)!
              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Deney Detaylari: {exp.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          getStatusColor(exp.status),
                        )}>
                          Tamamlandi
                        </span>
                        {exp.is_final && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-amber-700 bg-amber-100 dark:bg-amber-900/30">
                            Final benchmark (Modeller tablosu)
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedExperiment(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      x
                    </button>
                  </div>

                  {exp.notes && (
                    <p className="mb-4 text-sm text-gray-600 dark:text-gray-400 italic">
                      {exp.notes}
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">
                        Hiperparametreler
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(exp.params).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{key}</span>
                            <span className="font-mono font-medium">
                              {value === null ? '-' : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">
                        Performans Metrikleri
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(exp.metrics)
                          .filter(([, value]) => value != null)
                          .map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">
                                {metricLabel(key)}
                              </span>
                              <span className="font-mono font-medium">
                                {typeof value === 'number' ? value.toFixed(3) : value}
                              </span>
                            </div>
                          ))}
                        {exp.duration && (
                          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center">
                              <ClockIcon className="w-4 h-4 mr-1" />
                              Sure
                            </span>
                            <span>{exp.duration}</span>
                          </div>
                        )}
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
