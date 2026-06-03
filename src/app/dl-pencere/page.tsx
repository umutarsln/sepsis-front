'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { motion } from 'framer-motion'
import {
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import clsx from 'clsx'
import {
  api,
  DemoPatientSummary,
  HourlySnapshot,
  PatientWindowResponse,
  WindowPredictionResponse,
  AttentionSummary,
} from '@/lib/api'
import DlWindowExplainPanel from '@/components/DlWindowExplainPanel'

/** Saatlik snapshot'tan API snapshot alanlarini cikarir (hour haric). */
function toSnapshot(step: HourlySnapshot): Record<string, number> {
  const { hour: _h, ...rest } = step
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(rest)) {
    if (v != null) out[k] = v
  }
  return out
}

/** Sparkline icin secilebilir vital/lab ozellikleri. */
type SparkFeature = 'HR' | 'MAP' | 'O2Sat' | 'Creatinine' | 'WBC'

const SPARK_FEATURES: SparkFeature[] = ['HR', 'MAP', 'O2Sat', 'Creatinine', 'WBC']

/** Faz 4.8 — 10 demo hasta uzerinde repeat vs seri AUROC ozeti. */
const REPEAT_VS_SERIES_SUMMARY = [
  { model: 'LSTM', repeatAuroc: 0.84, seriesAuroc: 0.8, meanDelta: 0.179 },
  { model: 'GRU', repeatAuroc: 0.84, seriesAuroc: 0.92, meanDelta: 0.108 },
  { model: 'BiGRU+Attn', repeatAuroc: 0.88, seriesAuroc: 1.0, meanDelta: 0.146 },
  { model: 'Transformer', repeatAuroc: 0.68, seriesAuroc: 0.84, meanDelta: 0.244 },
]

/** Faz 6 — tam test seti DL benchmark (AUROC + AUPRC, h=6, w=24). */
const FAZ6_DL_BENCHMARK = [
  { model: 'LSTM', auroc: 0.826, auprc: 0.276 },
  { model: 'GRU', auroc: 0.841, auprc: 0.29 },
  { model: 'BiGRU+Attn', auroc: 0.829, auprc: 0.283 },
  { model: 'Transformer', auroc: 0.813, auprc: 0.263 },
]

type SepsisFilter = 'all' | 'sepsis' | 'non_sepsis'

/**
 * DL Pencere Demo — gercek saatlik seri vs snapshot tekrari karsilastirmasi.
 */
export default function DlPencerePage() {
  const [patients, setPatients] = useState<DemoPatientSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sepsisFilter, setSepsisFilter] = useState<SepsisFilter>('all')
  const [windowData, setWindowData] = useState<PatientWindowResponse | null>(null)
  const [repeatResult, setRepeatResult] = useState<WindowPredictionResponse | null>(null)
  const [seriesResult, setSeriesResult] = useState<WindowPredictionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sparkFeature, setSparkFeature] = useState<SparkFeature>('HR')
  const [populationAttention, setPopulationAttention] = useState<
    Partial<Record<'bigru_attn' | 'transformer', AttentionSummary>>
  >({})

  useEffect(() => {
    void (async () => {
      try {
        const [bigru, transformer] = await Promise.all([
          api.artifacts.getAttention('bigru_attn').catch(() => null),
          api.artifacts.getAttention('transformer').catch(() => null),
        ])
        setPopulationAttention({
          ...(bigru ? { bigru_attn: bigru } : {}),
          ...(transformer ? { transformer } : {}),
        })
      } catch {
        setPopulationAttention({})
      }
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const list = await api.windowDemo.listDemoPatients()
        setPatients(list)
        if (list.length) setSelectedId(list[0].patient_id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Demo hastalar yuklenemedi')
      }
    })()
  }, [])

  const runPredictions = useCallback(async (pid: string) => {
    setLoading(true)
    setError(null)
    try {
      const win = await api.windowDemo.getPatientWindow(pid, 24)
      setWindowData(win)
      const series = win.series.map(toSnapshot)
      const lastSnap = series[series.length - 1]
      const [rep, ser] = await Promise.all([
        api.windowDemo.predictWindow({ snapshot: lastSnap, repeat_hours: 24, patientId: pid }),
        api.windowDemo.predictWindow({ snapshot: lastSnap, series, repeat_hours: 24, patientId: pid }),
      ])
      setRepeatResult(rep)
      setSeriesResult(ser)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tahmin hatasi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) void runPredictions(selectedId)
  }, [selectedId, runPredictions])

  const filteredPatients = useMemo(() => {
    if (sepsisFilter === 'sepsis') return patients.filter((p) => p.sepsis)
    if (sepsisFilter === 'non_sepsis') return patients.filter((p) => !p.sepsis)
    return patients
  }, [patients, sepsisFilter])

  const sparkData = useMemo(() => {
    if (!windowData) return []
    return windowData.series.map((s) => ({
      hour: s.hour,
      HR: s.HR,
      MAP: s.MAP,
      O2Sat: s.O2Sat,
      Creatinine: s.Creatinine,
      WBC: s.WBC,
    }))
  }, [windowData])

  const compareRows = useMemo(() => {
    if (!repeatResult || !seriesResult) return []
    return repeatResult.models.map((rm) => {
      const sm = seriesResult.models.find((m) => m.model_id === rm.model_id)
      return {
        model: rm.model_name,
        repeat: rm.risk_score * 100,
        series: (sm?.risk_score ?? 0) * 100,
        delta: ((sm?.risk_score ?? 0) - rm.risk_score) * 100,
      }
    })
  }, [repeatResult, seriesResult])

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            DL Pencere Demo
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Test setinden 10 hasta — son 24 saatin gerçek serisi vs snapshot tekrarı (DL modelleri).
            Tam kohort metrikleri (AUROC + AUPRC) aşağıda; pozitif oranı düşük olduğundan AUPRC
            klinik ayırım için AUROC ile birlikte raporlanır.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Hasta secici */}
          <div className="xl:col-span-3 card">
            <div className="flex items-center mb-3">
              <UserGroupIcon className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="font-semibold">Demo Hastalar</h3>
            </div>
            <div className="flex gap-1 mb-3">
              {(
                [
                  { id: 'all' as const, label: 'Tümü' },
                  { id: 'sepsis' as const, label: 'Sepsis' },
                  { id: 'non_sepsis' as const, label: 'Non-sepsis' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSepsisFilter(f.id)}
                  className={clsx(
                    'text-xs px-2 py-1 rounded border flex-1',
                    sepsisFilter === f.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-300 dark:border-gray-600',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {filteredPatients.map((p) => (
                <button
                  key={p.patient_id}
                  type="button"
                  onClick={() => setSelectedId(p.patient_id)}
                  className={clsx(
                    'w-full text-left rounded-lg border p-3 text-sm transition-colors',
                    selectedId === p.patient_id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-medium">{p.patient_id}</span>
                    <span
                      className={clsx(
                        'text-xs px-2 py-0.5 rounded-full',
                        p.sepsis
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
                      )}
                    >
                      {p.sepsis ? 'Sepsis' : 'Non-sepsis'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {p.n_hours} saat · pencere {p.window_hours}h
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sparkline */}
          <div className="xl:col-span-5 card">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center">
                <ClockIcon className="w-5 h-5 text-emerald-600 mr-2" />
                <h3 className="font-semibold">Son 24 Saat</h3>
              </div>
              <div className="flex gap-1 flex-wrap">
                {SPARK_FEATURES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSparkFeature(f)}
                    className={clsx(
                      'text-xs px-2 py-1 rounded border',
                      sparkFeature === f
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                        : 'border-gray-300 dark:border-gray-600',
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {loading && !windowData ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" /> Yukleniyor…
              </div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} label={{ value: 'Saat', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Line
                      type="monotone"
                      dataKey={sparkFeature}
                      stroke="#059669"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {windowData && (
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                <p>
                  Hasta <span className="font-mono">{windowData.patient_id}</span> · bitiş saati{' '}
                  {windowData.end_hour}
                </p>
                <p>
                  Sepsis etiketi (h=6 ufuk):{' '}
                  <span className="font-semibold">{windowData.horizon_label_end}</span>
                  {windowData.sepsis && (
                    <span className="ml-1 text-red-600 dark:text-red-400">· sepsis vakası</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Karsilastirma */}
          <div className="xl:col-span-4 card">
            <div className="flex items-center mb-3">
              <ChartBarIcon className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="font-semibold">Repeat vs Gercek Seri</h3>
              {loading && <ArrowPathIcon className="w-4 h-4 ml-2 animate-spin text-gray-400" />}
            </div>
            {compareRows.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">Hasta secin</p>
            ) : (
              <div className="space-y-3">
                {compareRows.map((row) => (
                  <div
                    key={row.model}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                  >
                    <div className="text-sm font-medium mb-2">{row.model}</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-gray-500">Repeat</div>
                        <div className="font-bold tabular-nums">{row.repeat.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Seri</div>
                        <div className="font-bold tabular-nums text-emerald-600">
                          {row.series.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Δ</div>
                        <div
                          className={clsx(
                            'font-bold tabular-nums',
                            row.delta >= 0 ? 'text-red-600' : 'text-green-600',
                          )}
                        >
                          {row.delta >= 0 ? '+' : ''}
                          {row.delta.toFixed(1)}pp
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 border-t pt-3 dark:border-gray-700">
              Snapshot tekrarı (repeat) son anı 24 kez kopyalar; gerçek seri temporal
              değişimi korur. Tek hasta Δ değerleri yukarıda; popülasyon özeti aşağıda.
            </div>
          </div>
        </div>

        <div className="card mt-6">
          <h3 className="font-semibold text-sm mb-2">
            Faz 6 — DL Test Seti Benchmark (AUROC & AUPRC)
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Kaynak: Faz 6 raporu — tam test kohortu, h=6, 24 saat pencere. AUPRC sepsis pozitifleri
            seyrekken (&lt;3%) daha bilgilendiricidir.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="py-2 pr-3">Model</th>
                  <th className="py-2 pr-3 text-right">AUROC</th>
                  <th className="py-2 text-right">AUPRC</th>
                </tr>
              </thead>
              <tbody>
                {FAZ6_DL_BENCHMARK.map((row) => (
                  <tr
                    key={row.model}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-2 pr-3 font-medium">{row.model}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.auroc.toFixed(3)}</td>
                    <td className="py-2 text-right tabular-nums text-indigo-600 font-semibold">
                      {row.auprc.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card mt-6">
          <h3 className="font-semibold text-sm mb-2">
            Faz 4.8 — Repeat vs Gerçek Seri (10 demo hasta, AUROC)
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Kaynak: <code>adim_4_8/repeat_vs_series_eval.md</code> — repeat modu yanlıltıcı
            olabilir; gerçek seri genelde daha iyi ayırım sağlar.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="py-2 pr-3">Model</th>
                  <th className="py-2 pr-3 text-right">Repeat AUROC</th>
                  <th className="py-2 pr-3 text-right">Seri AUROC</th>
                  <th className="py-2 text-right">Ort. |Δ|</th>
                </tr>
              </thead>
              <tbody>
                {REPEAT_VS_SERIES_SUMMARY.map((row) => (
                  <tr
                    key={row.model}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-2 pr-3 font-medium">{row.model}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {row.repeatAuroc.toFixed(2)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-emerald-600 font-semibold">
                      {row.seriesAuroc.toFixed(2)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{row.meanDelta.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DlWindowExplainPanel
          seriesResult={seriesResult}
          populationAttention={populationAttention}
          loading={loading}
        />
      </motion.div>
    </DashboardLayout>
  )
}
