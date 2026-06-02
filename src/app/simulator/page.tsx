'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FeatureSlider from '@/components/FeatureSlider'
import { motion } from 'framer-motion'
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  BoltIcon,
  CpuChipIcon,
  HeartIcon,
  InformationCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import clsx from 'clsx'
import ModelMetricBadges from '@/components/ModelMetricBadges'

import {
  api,
  ModelDescriptor,
  PatientPreset,
  SnapshotPredictionResponse,
  SnapshotExplainResponse,
  ShapContribution,
  FeatureStats,
} from '@/lib/api'

/**
 * Sepsis Simülatörü
 *
 * Üç kolonlu interaktif sayfa:
 *   1. Sol  : preset seçimi + canlı/display-only model checkbox listesi.
 *   2. Orta : 16 feature için klinik aralık göstergeli slider'lar.
 *   3. Sağ  : Multi-model risk skorları (bar chart) + top-5 katkı feature.
 *
 * Slider hareketi 350ms debounce ile `/predict/snapshot` çağırır; sonuçlar
 * canlı güncellenir.
 */

const SLIDER_FEATURES: Array<{
  key: string
  label: string
  step?: number
}> = [
  { key: 'HR', label: 'Nabız', step: 1 },
  { key: 'O2Sat', label: 'SpO₂', step: 1 },
  { key: 'Temp', label: 'Vücut Isısı', step: 0.1 },
  { key: 'MAP', label: 'Ortalama Arteryel Basınç', step: 1 },
  { key: 'Resp', label: 'Solunum Hızı', step: 1 },
  { key: 'WBC', label: 'WBC', step: 0.1 },
  { key: 'BUN', label: 'BUN', step: 1 },
  { key: 'Creatinine', label: 'Kreatinin', step: 0.1 },
  { key: 'Glucose', label: 'Glukoz', step: 1 },
  { key: 'Platelets', label: 'Trombosit', step: 5 },
  { key: 'Hgb', label: 'Hemoglobin', step: 0.1 },
  { key: 'Hct', label: 'Hematokrit', step: 0.5 },
  { key: 'Chloride', label: 'Klorür', step: 1 },
  { key: 'Age', label: 'Yaş', step: 1 },
  { key: 'HospAdmTime', label: 'Hastane Yatış Süresi', step: 1 },
  { key: 'ICULOS', label: 'YBÜ Yatış Süresi', step: 1 },
]

const RISK_BAND_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#7f1d1d',
}

/** Preset risk band etiketleri — sol panel rozet metni. */
const RISK_BAND_LABELS: Record<string, string> = {
  low: 'DÜŞÜK',
  medium: 'ORTA',
  high: 'YÜKSEK',
  critical: 'KRİTİK',
}

/** Preset risk band Tailwind rozet siniflari. */
const RISK_BAND_BADGE: Record<string, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  critical: 'bg-rose-200 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200',
}

export default function SimulatorPage() {
  const [presets, setPresets] = useState<PatientPreset[]>([])
  const [activePresetId, setActivePresetId] = useState<string | null>(null)

  const [models, setModels] = useState<ModelDescriptor[]>([])
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([])

  const [stats, setStats] = useState<FeatureStats | null>(null)
  const [features, setFeatures] = useState<Record<string, number>>({})
  const [gender, setGender] = useState<string>('M')

  const [prediction, setPrediction] = useState<SnapshotPredictionResponse | null>(null)
  const [predicting, setPredicting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Faz 7: SHAP local explain state
  const [shapByModel, setShapByModel] = useState<Record<string, ShapContribution[]> | null>(null)
  const [explainModelId, setExplainModelId] = useState('xgboost')
  const [explaining, setExplaining] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** "Açıkla" butonuna basıldığında tum ML modelleri icin SHAP top-10 hesaplar. */
  const runExplain = useCallback(async () => {
    if (Object.keys(features).length === 0) return
    setExplaining(true)
    setShapByModel(null)
    try {
      const res: SnapshotExplainResponse = await api.simulator.explainSnapshot(features, gender)
      setShapByModel(res.shap_by_model ?? (res.shap_top10 ? { xgboost: res.shap_top10 } : null))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'SHAP hatası'
      setError(msg)
    } finally {
      setExplaining(false)
    }
  }, [features, gender])

  const shapTop10 =
    shapByModel?.[explainModelId] ??
    (explainModelId === 'xgboost' ? shapByModel?.xgboost : null) ??
    null

  const explainModelLabel =
    models.find((m) => m.model_id === explainModelId)?.model_name ?? explainModelId

  // İlk yükleme: presetler + modeller + feature_stats
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [presetList, modelList, featStats] = await Promise.all([
          api.simulator.getPresets(),
          api.simulator.getModelDescriptors(),
          api.simulator.getFeatureStats(),
        ])
        setPresets(presetList)
        setModels(modelList)
        setStats(featStats)

        const liveModels = modelList.filter((m) => m.is_live).map((m) => m.model_id)
        setSelectedModelIds(liveModels)

        if (presetList.length > 0) {
          const defaultPreset =
            presetList.find((p) => p.preset_id === 'sinir_durum') ?? presetList[0]
          applyPreset(defaultPreset)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Yükleme başarısız'
        setError(msg)
      }
    }
    void bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Bir preset seçildiğinde slider değerlerini günceller. */
  const applyPreset = (preset: PatientPreset) => {
    setActivePresetId(preset.preset_id)
    setFeatures({ ...preset.features })
    setGender(preset.gender)
  }

  /** Tek slider değeri değiştiğinde state'i günceller; debounce tahmin tetikler. */
  const handleSliderChange = useCallback((key: string, value: number) => {
    setActivePresetId(null)
    setFeatures((prev) => ({ ...prev, [key]: value }))
  }, [])

  /** Snapshot tahmini yapar; debounce'lu. */
  const runPrediction = useCallback(async () => {
    if (Object.keys(features).length === 0) return
    if (selectedModelIds.length === 0) return

    setPredicting(true)
    setError(null)
    try {
      const liveIds = models.filter((m) => m.is_live).map((m) => m.model_id)
      const ids = selectedModelIds.filter((id) => liveIds.includes(id))
      if (ids.length === 0) {
        setError('En az bir canlı model seçmelisiniz.')
        setPrediction(null)
        return
      }
      const res = await api.simulator.predictSnapshot(features, gender, ids)
      setPrediction(res)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Tahmin başarısız'
      setError(msg)
    } finally {
      setPredicting(false)
    }
  }, [features, gender, selectedModelIds, models])

  // Debounce: features veya selectedModelIds değişince 350ms bekle.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void runPrediction()
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [features, selectedModelIds, gender, runPrediction])

  const chartData = useMemo(() => {
    if (!prediction) return []
    // Tam yüzde (yuvarlama yok): küçük olasılıklar 0.5 gibi yanıltıcı bar uzunluğu vermesin.
    return prediction.results.map((r) => ({
      label: r.label,
      risk: r.risk_score * 100,
      band: r.risk_level,
      auroc: r.auroc,
      auprc: r.auprc,
    }))
  }, [prediction])

  if (!stats) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <ArrowPathIcon className="w-8 h-8 text-blue-600 mx-auto animate-spin" />
            <div className="mt-3 text-sm text-gray-500">
              Simülatör yükleniyor (modeller, presetler, klinik aralıklar)…
            </div>
          </div>
        </div>
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
              Sepsis Simülatörü
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Hazır hasta profilleri üzerine slider'larla değer değiştirin —
              canlı modeller anlık olarak risk skorunu yeniden hesaplar.
              Model listesinde test AUROC ve AUPRC (h=6) birlikte gösterilir.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {predicting && (
              <span className="text-xs text-blue-600 inline-flex items-center">
                <ArrowPathIcon className="w-4 h-4 animate-spin mr-1" /> Hesaplanıyor…
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (presets.length) {
                  const defaultPreset =
                    presets.find((p) => p.preset_id === 'sinir_durum') ?? presets[0]
                  applyPreset(defaultPreset)
                }
              }}
              className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center"
            >
              <ArrowPathIcon className="w-4 h-4 mr-1.5" /> Sıfırla
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Sol Panel: Preset + Model seçimi */}
          <div className="xl:col-span-3 space-y-6">
            <div className="card">
              <div className="flex items-center mb-3">
                <UserIcon className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-base font-semibold">Hasta Profili</h3>
              </div>
              <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                {presets.map((p) => {
                  const active = activePresetId === p.preset_id
                  return (
                    <button
                      key={p.preset_id}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={clsx(
                        'w-full text-left rounded-lg border p-3 transition-colors',
                        active
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{p.label}</span>
                        <span
                          className={clsx(
                            'text-[10px] px-2 py-0.5 rounded-full shrink-0 font-semibold tracking-wide',
                            RISK_BAND_BADGE[p.risk_band] ?? RISK_BAND_BADGE.medium,
                          )}
                        >
                          {RISK_BAND_LABELS[p.risk_band] ?? p.risk_band.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {p.description}
                      </p>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                {presets.length} profil · düşükten yükseğe sıralı
              </p>

              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Cinsiyet
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('M')}
                    className={clsx(
                      'flex-1 px-3 py-1.5 rounded-md text-sm border',
                      gender === 'M'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-300 dark:border-gray-700',
                    )}
                  >
                    Erkek
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('F')}
                    className={clsx(
                      'flex-1 px-3 py-1.5 rounded-md text-sm border',
                      gender === 'F'
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/30'
                        : 'border-gray-300 dark:border-gray-700',
                    )}
                  >
                    Kadın
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center mb-3">
                <CpuChipIcon className="w-5 h-5 text-purple-600 mr-2" />
                <h3 className="text-base font-semibold">Modeller</h3>
              </div>
              <div className="space-y-2">
                {models.map((m) => {
                  const checked = selectedModelIds.includes(m.model_id)
                  return (
                    <label
                      key={m.model_id}
                      className={clsx(
                        'flex items-start gap-2 p-2 rounded-md border cursor-pointer transition-colors',
                        m.is_live
                          ? checked
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                          : 'border-dashed border-gray-300 dark:border-gray-600 opacity-60 cursor-not-allowed',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!m.is_live}
                        onChange={(e) => {
                          if (!m.is_live) return
                          setSelectedModelIds((prev) =>
                            e.target.checked
                              ? [...prev, m.model_id]
                              : prev.filter((id) => id !== m.model_id),
                          )
                        }}
                        className="mt-0.5 h-4 w-4 text-blue-600 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{m.label}</span>
                          <span className="text-[10px] tabular-nums text-gray-500 block text-right">
                            <ModelMetricBadges auroc={m.auroc} auprc={m.auprc} />
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {m.category}
                          {!m.is_live && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">
                              · vitrin
                            </span>
                          )}
                        </div>
                        {m.note && (
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {m.note}
                          </div>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Orta Panel: Slider Grid */}
          <div className="xl:col-span-5">
            <div className="card">
              <div className="flex items-center mb-4">
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-base font-semibold">Klinik Değerler</h3>
                <span className="ml-2 text-xs text-gray-500">
                  · Yeşil bant = referans aralığı
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {SLIDER_FEATURES.map((sf) => {
                  const range = stats.clinical_ranges[sf.key]
                  const val = features[sf.key] ?? range?.normal_low ?? 0
                  if (!range) return null
                  return (
                    <FeatureSlider
                      key={sf.key}
                      feature={sf.key}
                      label={sf.label}
                      value={val}
                      range={range}
                      step={sf.step}
                      onChange={(v) => handleSliderChange(sf.key, v)}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sağ Panel: Sonuçlar */}
          <div className="xl:col-span-4 space-y-4">
            <div className="card">
              <div className="flex items-center mb-3">
                <BoltIcon className="w-5 h-5 text-orange-500 mr-2" />
                <h3 className="text-base font-semibold">Risk Skorları</h3>
              </div>

              {!prediction || prediction.results.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                  Slider'ları hareket ettirin — sonuçlar burada görünecek.
                </p>
              ) : (
                <>
                  {/* Bar chart */}
                  <div className="h-40 -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                        <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={120} />
                        <Tooltip
                          formatter={(v: number, name: string) => {
                            if (name === 'Risk') return [`${Number(v).toFixed(2)}%`, 'Risk']
                            return [Number(v).toFixed(3), name]
                          }}
                          contentStyle={{ borderRadius: 8, fontSize: 12 }}
                        />
                        <Bar dataKey="risk" radius={[0, 4, 4, 0]}>
                          {chartData.map((entry, i) => (
                            <Cell key={i} fill={RISK_BAND_COLORS[entry.band] ?? '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Detay listesi */}
                  <div className="mt-4 space-y-2">
                    {prediction.results.map((r) => (
                      <div
                        key={r.model_id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-800/50"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{r.label}</div>
                          <div className="text-[11px] text-gray-500">
                            <ModelMetricBadges
                              auroc={r.auroc}
                              auprc={r.auprc}
                              className="text-[11px] text-gray-500"
                            />
                            <span className="block mt-0.5 tabular-nums">eşik {r.threshold}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className="text-lg font-bold tabular-nums"
                            style={{ color: RISK_BAND_COLORS[r.risk_level] }}
                          >
                            {r.risk_score < 0.01
                              ? `${(r.risk_score * 100).toFixed(2)}%`
                              : `${(r.risk_score * 100).toFixed(1)}%`}
                          </div>
                          <div
                            className="text-[10px] uppercase tracking-wide font-semibold"
                            style={{ color: RISK_BAND_COLORS[r.risk_level] }}
                          >
                            {r.risk_level}
                            {r.alert && ' · ALARM'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center">
                  <HeartIcon className="w-5 h-5 text-red-500 mr-2" />
                  <h3 className="text-base font-semibold">Top 10 Etkili Faktör</h3>
                  {shapTop10 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      🎯 Local SHAP
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {shapByModel && Object.keys(shapByModel).length > 1 && (
                    <select
                      value={explainModelId}
                      onChange={(e) => setExplainModelId(e.target.value)}
                      className="text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
                      aria-label="SHAP modeli seç"
                    >
                      {Object.keys(shapByModel).map((modelId) => {
                        const label =
                          models.find((m) => m.model_id === modelId)?.model_name ?? modelId
                        return (
                          <option key={modelId} value={modelId}>
                            {label}
                          </option>
                        )
                      })}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => void runExplain()}
                    disabled={explaining || !prediction}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    {explaining ? (
                      <><ArrowPathIcon className="w-3 h-3 animate-spin" /> Hesaplanıyor…</>
                    ) : 'Açıkla'}
                  </button>
                </div>
              </div>

              {shapTop10 ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-gray-400 mb-1">
                    {explainModelLabel} SHAP — bu hastaya özgü top-10 etki (normalize %)
                  </p>
                  {shapTop10.map((f, i) => (
                    <div key={i} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{f.feature}</span>
                        <span className={`tabular-nums font-semibold ${f.shap_value >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {f.shap_value >= 0 ? '+' : ''}{f.shap_value.toFixed(3)}
                          <span className="text-gray-400 font-normal ml-1">({f.pct_contribution.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${f.shap_value >= 0 ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'}`}
                          style={{ width: `${Math.min(f.pct_contribution, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 py-4 text-center">
                  "Açıkla" butonuna basın — bu hasta için tüm ML modellerinin SHAP değerleri hesaplanır.
                </p>
              )}
            </div>

            <div className="px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs flex items-start gap-2">
              <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                Tüm skorlar ham <code>predict_proba</code> (sepsis=1) çıktısıdır; ağaç
                modelleri (RF, GB) ile XGBoost arasında kalibrasyon farkı normaldir
                — XGBoost çok düşük yüzde verirken RF yüksek verebilir. Grafikte
                tam yüzde kullanılır; küçük değerler listede iki ondalık gösterilir.
                LR ve GaussianNB, örnek veriyle eğitilmiş ek katmandır. DL
                (BiGRU+Attn, Transformer) snapshot ile uyumsuz olduğundan vitrin
                amaçlıdır.
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  )
}
