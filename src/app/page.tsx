'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import RiskChart from '@/components/RiskChart'
import { ExclamationTriangleIcon, ArrowRightIcon, BoltIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import {
  api,
  PatientPreset,
  SnapshotModelResult,
  SnapshotPredictionResponse,
  TopFeatureContribution,
  LeadTimeSummary,
} from '@/lib/api'
import clsx from 'clsx'
import ModelMetricBadges from '@/components/ModelMetricBadges'

/**
 * Ana Dashboard
 *
 * Mock hasta verisi yerine gerçek `/patients/presets` ve `/predict/snapshot`
 * endpoint'lerinden beslenir. Her preset için 3 sklearn modeli paralel
 * tahmin yapar; en yüksek skor görsel olarak gösterilir.
 */

interface PresetState {
  preset: PatientPreset
  result: SnapshotPredictionResponse | null
  loading: boolean
  error: string | null
}

const RISK_LEVEL_LABEL: Record<string, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
}

const RISK_LEVEL_COLOR: Record<string, string> = {
  low: 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-300',
  medium: 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300',
  high: 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-300',
  critical: 'text-red-800 bg-red-100 dark:bg-red-900/30 border-red-500',
}

export default function Dashboard() {
  const [states, setStates] = useState<PresetState[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [explainModelId, setExplainModelId] = useState('xgboost')
  const [leadTime, setLeadTime] = useState<LeadTimeSummary | null>(null)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)

  // İlk yüklemede tüm presetler için canlı tahmin başlat
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [presets, lead] = await Promise.all([
          api.simulator.getPresets(),
          api.artifacts.getLeadTime().catch(() => null),
        ])
        setLeadTime(lead)
        const initial: PresetState[] = presets.map((p) => ({
          preset: p,
          result: null,
          loading: true,
          error: null,
        }))
        setStates(initial)

        // Her preset için paralel tahmin
        await Promise.all(
          presets.map(async (p, idx) => {
            try {
              const r = await api.simulator.predictSnapshot(p.features, p.gender)
              setStates((prev) => {
                const next = [...prev]
                next[idx] = { preset: p, result: r, loading: false, error: null }
                return next
              })
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Tahmin başarısız'
              setStates((prev) => {
                const next = [...prev]
                next[idx] = { preset: p, result: null, loading: false, error: msg }
                return next
              })
            }
          }),
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Yükleme başarısız'
        setBootstrapError(msg)
      }
    }
    void bootstrap()
  }, [])

  const selected = states[selectedIdx]
  const alarmCount = useMemo(
    () =>
      states.filter((s) => {
        if (!s.result) return false
        const max = Math.max(...s.result.results.map((r) => r.risk_score))
        return max >= 0.5
      }).length,
    [states],
  )

  if (bootstrapError) {
    return (
      <DashboardLayout>
        <div className="card text-center py-12">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-2">API'ya bağlanılamadı</h2>
          <p className="text-sm text-gray-500">{bootstrapError}</p>
          <p className="text-xs text-gray-400 mt-2">
            Backend'i başlatmak için: <code>uvicorn api.main:app --reload</code>
          </p>
        </div>
      </DashboardLayout>
    )
  }

  if (states.length === 0) {
    return (
      <DashboardLayout>
        <div className="text-center py-24 text-gray-500">Yükleniyor…</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              Sepsis Erken Uyarı Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Üç örnek hasta profilinin canlı multi-model risk değerlendirmesi.
              Test metrikleri: AUROC (sıralama) ve AUPRC (seyrek pozitiflerde ayırım).
              Slider üzerinden değer değiştirmek için{' '}
              <Link
                href="/simulator"
                className="text-blue-600 hover:underline inline-flex items-center"
              >
                Simülatör
                <ArrowRightIcon className="w-3 h-3 ml-1" />
              </Link>
            </p>
          </div>
          {leadTime && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <BoltIcon className="w-5 h-5 text-blue-600" />
              <div className="text-xs">
                <div className="font-semibold text-blue-900 dark:text-blue-200">
                  Klinik özet (V5 XGBoost)
                </div>
                <div className="text-blue-700 dark:text-blue-300">
                  Yakalama: {(leadTime.detection_rate * 100).toFixed(1)}% · Lead time:
                  ~{leadTime.median_lead_time_hours.toFixed(0)}h ·
                  Erken alarm: {(leadTime.early_alarm_rate * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alarm banner */}
        {alarmCount > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg"
          >
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  {alarmCount} hasta profilinde yüksek sepsis riski tespit edildi
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Modellerden en az biri eşik değerin üstünde skor verdi.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol: Hasta listesi */}
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Aktif Hasta Profilleri</h2>
              <div className="space-y-3">
                {states.map((s, idx) => {
                  const max = s.result
                    ? Math.max(...s.result.results.map((r) => r.risk_score))
                    : 0
                  const band = s.result
                    ? s.result.results.reduce((acc, r) =>
                        r.risk_score > acc.risk_score ? r : acc,
                      ).risk_level
                    : s.preset.risk_band
                  const isActive = idx === selectedIdx
                  return (
                    <button
                      key={s.preset.preset_id}
                      type="button"
                      onClick={() => setSelectedIdx(idx)}
                      className={clsx(
                        'w-full text-left p-4 rounded-lg border-2 transition-all',
                        isActive
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">{s.preset.label}</h3>
                        <span
                          className={clsx(
                            'text-xs px-2 py-0.5 rounded-full border',
                            RISK_LEVEL_COLOR[band] ?? RISK_LEVEL_COLOR.low,
                          )}
                        >
                          {RISK_LEVEL_LABEL[band] ?? band}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {s.preset.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-gray-500">En yüksek model</span>
                        <span className="text-base font-bold tabular-nums">
                          {s.loading ? '…' : `${(max * 100).toFixed(1)}%`}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sağ: Detaylar */}
          <div className="lg:col-span-2 space-y-6">
            {selected && (
              <>
                <div className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="text-xl font-semibold">{selected.preset.label}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {selected.preset.description}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Metric label="Yaş" value={`${selected.preset.features.Age ?? '?'}`} />
                    <Metric
                      label="Cinsiyet"
                      value={selected.preset.gender === 'M' ? 'Erkek' : 'Kadın'}
                    />
                    <Metric
                      label="Nabız"
                      value={`${selected.preset.features.HR ?? '?'} bpm`}
                    />
                    <Metric
                      label="Ateş"
                      value={`${selected.preset.features.Temp?.toFixed(1) ?? '?'}°C`}
                    />
                    <Metric
                      label="MAP"
                      value={`${selected.preset.features.MAP ?? '?'} mmHg`}
                    />
                    <Metric
                      label="Solunum"
                      value={`${selected.preset.features.Resp ?? '?'} /dk`}
                    />
                    <Metric
                      label="WBC"
                      value={`${selected.preset.features.WBC?.toFixed(1) ?? '?'} K/µL`}
                    />
                    <Metric
                      label="Laktat≈Cr"
                      value={`${selected.preset.features.Creatinine?.toFixed(1) ?? '?'} mg/dL`}
                    />
                  </div>
                </div>

                {/* Model risk skorları */}
                <ModelResultsCard state={selected} />

                {/* Risk grafiği — modeller arası karşılaştırma */}
                {selected.result && selected.result.results.length > 0 && (
                  <div className="card">
                    <h3 className="text-lg font-semibold mb-4">
                      Modeller Arası Risk Karşılaştırması
                    </h3>
                    <RiskChart
                      riskScores={modelsToRiskScores(selected.result.results)}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Y-ekseni: pozitif sınıf olasılığı (%). X-ekseni: model
                      adının ilk harfleri. Aynı snapshot tüm modellere paralel
                      verilir; ufuk h=6 saattir.
                    </p>
                  </div>
                )}

                {/* Top feature katkısı */}
                {selected.result && selected.result.top_features.length > 0 && (
                  <TopFeaturesCard
                    features={
                      selected.result.top_features_by_model[explainModelId] ??
                      selected.result.top_features
                    }
                    modelOptions={selected.result.results.map((r) => ({
                      id: r.model_id,
                      label: r.label,
                    }))}
                    selectedModelId={explainModelId}
                    onModelChange={setExplainModelId}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  )
}


function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-gray-500">{label}</span>
      <p className="font-medium">{value}</p>
    </div>
  )
}


function ModelResultsCard({ state }: { state: PresetState }) {
  if (state.loading) {
    return (
      <div className="card text-center py-8 text-sm text-gray-500">
        Modeller hesaplanıyor…
      </div>
    )
  }
  if (state.error) {
    return (
      <div className="card text-sm text-red-600">
        Tahmin başarısız: {state.error}
      </div>
    )
  }
  if (!state.result) return null

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Model Risk Skorları (h=6)</h3>
      <div className="space-y-3">
        {state.result.results.map((r) => (
          <ResultRow key={r.model_id} r={r} />
        ))}
      </div>
    </div>
  )
}


function ResultRow({ r }: { r: SnapshotModelResult }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 flex-shrink-0">
        <div className="text-sm font-medium">{r.label}</div>
        <div className="text-[10px] text-gray-500">Test seti (h=6)</div>
        <ModelMetricBadges auroc={r.auroc} auprc={r.auprc} className="text-[10px] text-gray-500" />
      </div>
      <div className="flex-1">
        <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${Math.max(r.risk_score * 100, 2)}%`,
              backgroundColor:
                r.risk_level === 'low'
                  ? '#10b981'
                  : r.risk_level === 'medium'
                  ? '#f59e0b'
                  : '#ef4444',
            }}
          />
        </div>
      </div>
      <div className="w-16 text-right">
        <span className="text-sm font-bold tabular-nums">
          {(r.risk_score * 100).toFixed(1)}%
        </span>
      </div>
      <span
        className={clsx(
          'text-[10px] uppercase tracking-wide font-semibold w-20 text-right',
          r.risk_level === 'low' && 'text-green-600',
          r.risk_level === 'medium' && 'text-yellow-600',
          r.risk_level === 'high' && 'text-red-600',
          r.risk_level === 'critical' && 'text-red-800',
        )}
      >
        {RISK_LEVEL_LABEL[r.risk_level] ?? r.risk_level}
        {r.alert && ' · ALARM'}
      </span>
    </div>
  )
}


function TopFeaturesCard({
  features,
  modelOptions,
  selectedModelId,
  onModelChange,
}: {
  features: TopFeatureContribution[]
  modelOptions: Array<{ id: string; label: string }>
  selectedModelId: string
  onModelChange: (modelId: string) => void
}) {
  const max = Math.max(...features.map((f) => f.importance), 0.0001)
  const selectedLabel =
    modelOptions.find((m) => m.id === selectedModelId)?.label ?? selectedModelId
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h3 className="text-lg font-semibold">En Önemli 10 Faktör</h3>
        {modelOptions.length > 1 && (
          <select
            value={selectedModelId}
            onChange={(e) => onModelChange(e.target.value)}
            className="text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
            aria-label="SHAP modeli seç"
          >
            {modelOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="space-y-2">
        {features.map((f, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{f.feature}</span>
              <span className="text-gray-500 tabular-nums">
                {f.raw_value.toFixed(1)}
              </span>
            </div>
            <div className="h-2 mt-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                style={{ width: `${(f.importance / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        {selectedLabel} SHAP — bu hastaya özgü top-10 katkı (mutlak SHAP değerine göre).
      </p>
    </div>
  )
}


/** SnapshotModelResult listesini RiskChart'ın beklediği `Record<number, number>` formatına çevirir. */
function modelsToRiskScores(
  results: SnapshotModelResult[],
): Record<number, number> {
  const out: Record<number, number> = {}
  results.forEach((r, i) => {
    out[i + 1] = r.risk_score
  })
  return out
}
