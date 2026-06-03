'use client'

import { useCallback, useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { motion } from 'framer-motion'
import {
  PuzzlePieceIcon,
  EyeIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import clsx from 'clsx'
import {
  api,
  DemoPatientSummary,
  ShapRankingRow,
  AttentionSummary,
  LimeExplanation,
  LimePatientType,
  WindowPredictionResponse,
  HourlySnapshot,
} from '@/lib/api'
import LimeExplanationPanel from '@/components/LimeExplanationPanel'
import DlWindowExplainPanel from '@/components/DlWindowExplainPanel'

/** Saatlik snapshot'tan pencere tahmini snapshot alanlarini cikarir. */
function toWindowSnapshot(step: HourlySnapshot): Record<string, number> {
  const { hour: _h, ...rest } = step
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(rest)) {
    if (v != null) out[k] = v
  }
  return out
}

/**
 * Açıklanabilirlik (Explainability) Sayfası
 *
 * Üç bölüm:
 *   1. Global SHAP (XGBoost) + model bazlı SHAP bar chart
 *   2. Popülasyon attention özeti (BiGRU + Transformer)
 *   3. DL zaman adımı açıklaması (demo hasta seçilebilir)
 *   4. LIME örnek hasta açıklamaları (TP/FP/FN)
 */

type ShapModel = 'xgboost' | 'random_forest' | 'logistic_regression'

const SHAP_MODELS: Array<{ id: ShapModel; label: string }> = [
  { id: 'xgboost', label: 'XGBoost' },
  { id: 'random_forest', label: 'Random Forest' },
  { id: 'logistic_regression', label: 'Logistic Regression' },
]

export default function AciklanabilirlikPage() {
  const [shapModel, setShapModel] = useState<ShapModel>('xgboost')
  const [shapSonData, setShapSonData] = useState<ShapRankingRow[]>([])
  const [globalRanking, setGlobalRanking] = useState<ShapRankingRow[]>([])
  const [limeType, setLimeType] = useState<LimePatientType>('tp')
  const [limeData, setLimeData] = useState<LimeExplanation[]>([])
  const [loadingLime, setLoadingLime] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingShap, setLoadingShap] = useState(false)
  const [loadingGlobal, setLoadingGlobal] = useState(false)
  const [attnModel, setAttnModel] = useState<'bigru_attn' | 'transformer'>('bigru_attn')
  const [attnData, setAttnData] = useState<AttentionSummary | null>(null)
  const [loadingAttn, setLoadingAttn] = useState(false)
  const [demoPatients, setDemoPatients] = useState<DemoPatientSummary[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [dlSeriesResult, setDlSeriesResult] = useState<WindowPredictionResponse | null>(null)
  const [loadingDlExplain, setLoadingDlExplain] = useState(false)
  const [populationAttention, setPopulationAttention] = useState<
    Partial<Record<'bigru_attn' | 'transformer', AttentionSummary>>
  >({})

  /** XGBoost global SHAP sıralamasını yükler. */
  useEffect(() => {
    const load = async () => {
      setLoadingGlobal(true)
      try {
        const rows = await api.artifacts.getFeatureRanking()
        setGlobalRanking(
          rows.slice(0, 15).map((row, index) => ({
            feature: row.feature,
            mean_abs_shap: row.importance,
            rank: index + 1,
          })),
        )
      } catch {
        setGlobalRanking([])
      } finally {
        setLoadingGlobal(false)
      }
    }
    void load()
  }, [])

  /** Model değişince SHAP global özetini yükler. */
  useEffect(() => {
    const load = async () => {
      setLoadingShap(true)
      setShapSonData([])
      try {
        const rows = await api.artifacts.getShapSummary(shapModel)
        setShapSonData(rows.slice(0, 15))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'SHAP yüklenemedi'
        setError(msg)
      } finally {
        setLoadingShap(false)
      }
    }
    void load()
  }, [shapModel])

  /** Attention verisi yükler. */
  useEffect(() => {
    const load = async () => {
      setLoadingAttn(true)
      try {
        const data = await api.artifacts.getAttention(attnModel)
        setAttnData(data)
      } catch {
        setAttnData(null)
      } finally {
        setLoadingAttn(false)
      }
    }
    void load()
  }, [attnModel])

  /** Seçili ML modeli için LIME örneklerini yükler. */
  useEffect(() => {
    const load = async () => {
      setLoadingLime(true)
      try {
        const rows = await api.artifacts.getLimeExplanations(shapModel)
        setLimeData(rows)
      } catch {
        setLimeData([])
      } finally {
        setLoadingLime(false)
      }
    }
    void load()
  }, [shapModel])

  /** Demo hasta listesini yükler. */
  useEffect(() => {
    void (async () => {
      try {
        const [patients, bigru, transformer] = await Promise.all([
          api.windowDemo.listDemoPatients(),
          api.artifacts.getAttention('bigru_attn').catch(() => null),
          api.artifacts.getAttention('transformer').catch(() => null),
        ])
        setDemoPatients(patients)
        setPopulationAttention({
          ...(bigru ? { bigru_attn: bigru } : {}),
          ...(transformer ? { transformer } : {}),
        })
        if (patients.length) setSelectedPatientId(patients[0].patient_id)
      } catch {
        setDemoPatients([])
      }
    })()
  }, [])

  /** Seçili demo hasta için DL pencere tahmini ve timestep açıklamasını yükler. */
  const loadDlExplain = useCallback(async (patientId: string) => {
    setLoadingDlExplain(true)
    try {
      const win = await api.windowDemo.getPatientWindow(patientId, 24)
      const series = win.series.map(toWindowSnapshot)
      const lastSnap = series[series.length - 1]
      const result = await api.windowDemo.predictWindow({
        snapshot: lastSnap,
        series,
        repeat_hours: 24,
        patientId,
      })
      setDlSeriesResult(result)
    } catch {
      setDlSeriesResult(null)
    } finally {
      setLoadingDlExplain(false)
    }
  }, [])

  useEffect(() => {
    if (selectedPatientId) void loadDlExplain(selectedPatientId)
  }, [selectedPatientId, loadDlExplain])

  const maxGlobalShap = globalRanking[0]?.mean_abs_shap ?? 1

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Açıklanabilirlik
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Global SHAP · örnek LIME (TP/FP/FN) · DL hangi saate baktı?
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Global SHAP — XGBoost */}
          <div className="card lg:col-span-1">
            <div className="flex items-center mb-3">
              <ChartBarIcon className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="text-base font-semibold">Global SHAP (XGBoost)</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Test seti üzerinde ortalama |SHAP| — en etkili 15 özellik.
            </p>
            {loadingGlobal ? (
              <p className="text-sm text-gray-500 py-6 text-center">Yükleniyor…</p>
            ) : globalRanking.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">Veri bulunamadı.</p>
            ) : (
              <div className="space-y-1.5">
                {globalRanking.map((row, i) => (
                  <div key={row.feature} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                    <span className="text-xs font-medium flex-1 truncate">{row.feature}</span>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500"
                          style={{
                            width: `${(row.mean_abs_shap / maxGlobalShap) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums w-12 text-right">
                      {row.mean_abs_shap.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SHAP per-model */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <PuzzlePieceIcon className="w-5 h-5 text-blue-600 mr-1" />
                <h3 className="text-base font-semibold">Model Bazlı SHAP Top-15</h3>
              </div>
              <div className="flex gap-1.5">
                {SHAP_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setShapModel(m.id)}
                    className={clsx(
                      'px-3 py-1 rounded-md text-xs font-medium border',
                      shapModel === m.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Aşağıdaki LIME paneli de aynı model seçimini kullanır.
            </p>
            {loadingShap ? (
              <p className="text-sm text-gray-500 py-8 text-center">Yükleniyor…</p>
            ) : shapSonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={shapSonData.map((r) => ({
                    feature: r.feature,
                    importance: r.mean_abs_shap,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="feature" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(4)}`, 'Mean |SHAP|']}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="importance" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">
                Bu model için SHAP verisi bulunamadı.
              </p>
            )}
          </div>
        </div>

        {/* Popülasyon attention */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <EyeIcon className="w-5 h-5 text-green-600 mr-1" />
              <h3 className="text-base font-semibold">Popülasyon Attention Özeti</h3>
            </div>
            <div className="flex gap-1.5">
              {[
                { id: 'bigru_attn' as const, label: 'BiGRU+Attn' },
                { id: 'transformer' as const, label: 'Transformer' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAttnModel(m.id)}
                  className={clsx(
                    'px-3 py-1 rounded-md text-xs font-medium border',
                    attnModel === m.id
                      ? 'bg-green-600 text-white border-green-600'
                      : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Test seti pozitif örneklerinde ortalama attention — hangi saatler genelde kritik?
          </p>
          {loadingAttn ? (
            <p className="text-sm text-gray-500 py-6 text-center">Yükleniyor…</p>
          ) : attnData ? (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={attnData.mean.map((v, i) => ({
                    hour: `S${i + 1}`,
                    mean: v,
                  }))}
                  margin={{ top: 5, right: 10, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={1} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v: number) => v.toFixed(4)}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="mean" fill="#22c55e" radius={[2, 2, 0, 0]} name="Ort. Attention" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-gray-400 mt-1">
                En yoğun saat(ler): {attnData.top3_hours.map((h) => `S${h}`).join(', ')} · n=
                {attnData.n_samples} pencere
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-6 text-center">Attention verisi bulunamadı.</p>
          )}
        </div>

        {/* DL zaman adımı — hasta seçici */}
        <div className="card mb-4">
          <h3 className="text-sm font-semibold mb-2">DL Demo Hasta Seçimi</h3>
          <div className="flex flex-wrap gap-2">
            {demoPatients.map((p) => (
              <button
                key={p.patient_id}
                type="button"
                onClick={() => setSelectedPatientId(p.patient_id)}
                className={clsx(
                  'text-xs px-2.5 py-1.5 rounded-md border font-mono',
                  selectedPatientId === p.patient_id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800',
                )}
              >
                {p.patient_id}
                <span
                  className={clsx(
                    'ml-1.5 px-1 rounded',
                    p.sepsis ? 'text-red-600' : 'text-green-600',
                  )}
                >
                  {p.sepsis ? 'S+' : 'S−'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <DlWindowExplainPanel
          seriesResult={dlSeriesResult}
          populationAttention={populationAttention}
          loading={loadingDlExplain}
        />

        <LimeExplanationPanel
          explanations={limeData}
          selected={limeType}
          onSelect={setLimeType}
          loading={loadingLime}
          modelLabel={SHAP_MODELS.find((m) => m.id === shapModel)?.label ?? shapModel}
        />
      </motion.div>
    </DashboardLayout>
  )
}
