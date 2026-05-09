'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { motion } from 'framer-motion'
import {
  LightBulbIcon,
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
import { api, FeatureRankingRow, ShapRankingRow, AttentionSummary } from '@/lib/api'

/**
 * Açıklanabilirlik (Explainability) Sayfası
 *
 * Üç bölüm:
 *   1. SHAP global feature ranking - model bazlı bar chart
 *   2. Attention heatmap'leri (BiGRU + Transformer)
 *   3. LIME örnek hasta açıklamaları (iframe)
 */

type ShapModel = 'xgboost' | 'random_forest' | 'logistic_regression'

const SHAP_MODELS: Array<{ id: ShapModel; label: string }> = [
  { id: 'xgboost', label: 'XGBoost' },
  { id: 'random_forest', label: 'Random Forest' },
  { id: 'logistic_regression', label: 'Logistic Regression' },
]

export default function AciklanabilirlikPage() {
  const [shapModel, setShapModel] = useState<ShapModel>('xgboost')
  const [shapData, setShapData] = useState<FeatureRankingRow[]>([])
  // Faz 7: Sepsis-son SHAP global ranking (mean_abs_shap)
  const [shapSonData, setShapSonData] = useState<ShapRankingRow[]>([])
  const [globalRanking, setGlobalRanking] = useState<FeatureRankingRow[]>([])
  const [limeIdx, setLimeIdx] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [loadingShap, setLoadingShap] = useState(false)
  // Faz 7: Attention
  const [attnModel, setAttnModel] = useState<'bigru_attn' | 'transformer'>('bigru_attn')
  const [attnData, setAttnData] = useState<AttentionSummary | null>(null)
  const [loadingAttn, setLoadingAttn] = useState(false)

  // SHAP global ranking yükle (eski fallback)
  useEffect(() => {
    const load = async () => {
      try {
        const rows = await api.artifacts.getFeatureRanking('global')
        setGlobalRanking(rows.slice(0, 15))
      } catch {
        // Sessiz — eski backend yoksa gösterme
      }
    }
    void load()
  }, [])

  // Model değişince Faz-7 SHAP yükle (sepsis-son backend)
  useEffect(() => {
    const load = async () => {
      setLoadingShap(true)
      setShapSonData([])
      try {
        const rows = await api.artifacts.getShapSummary(shapModel)
        setShapSonData(rows.slice(0, 15))
      } catch {
        // Fallback: eski endpoint dene
        try {
          const rows = await api.artifacts.getFeatureRanking(shapModel)
          setShapData(rows.slice(0, 15))
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'SHAP yüklenemedi'
          setError(msg)
        }
      } finally {
        setLoadingShap(false)
      }
    }
    void load()
  }, [shapModel])

  // Attention verisi yükle (sepsis-son backend)
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
            Model kararlarının arkasındaki feature katkıları, attention
            ağırlıkları ve örnek hasta-bazlı LIME açıklamaları.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Global Ranking */}
          <div className="card lg:col-span-1">
            <div className="flex items-center mb-3">
              <ChartBarIcon className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="text-base font-semibold">
                Global Feature Sıralaması
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              3 sklearn modelinin Top-20 SHAP listesinde kaç kez göründüğü.
            </p>
            <div className="space-y-1.5">
              {globalRanking.map((row, i) => (
                <div key={row.feature} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5 text-right">
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium flex-1 truncate">
                    {row.feature}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${(row.importance / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 tabular-nums w-8 text-right">
                    {row.importance.toFixed(0)}/3
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SHAP per-model */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <PuzzlePieceIcon className="w-5 h-5 text-blue-600 mr-1" />
                <h3 className="text-base font-semibold">SHAP Top-15</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  🌍 Global
                </span>
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
            {loadingShap ? (
              <p className="text-sm text-gray-500 py-8 text-center">Yükleniyor…</p>
            ) : shapSonData.length > 0 ? (
              // Faz 7: Sepsis-son backend SHAP (mean_abs_shap)
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={shapSonData.map((r) => ({ feature: r.feature, importance: r.mean_abs_shap }))}
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
            ) : shapData.length > 0 ? (
              // Fallback: eski endpoint
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={shapData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="feature" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v: number) => v.toFixed(4)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="importance" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">
                Bu model için SHAP verisi bulunamadı.
              </p>
            )}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <FigureFrame
                title="SHAP Bar Plot"
                src={api.artifacts.figureUrl(`shap_bar_${shapModel}.png`)}
              />
              <FigureFrame
                title="SHAP Summary Plot"
                src={api.artifacts.figureUrl(`shap_summary_${shapModel}.png`)}
              />
            </div>
          </div>
        </div>

        {/* Attention */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <EyeIcon className="w-5 h-5 text-green-600 mr-1" />
              <h3 className="text-base font-semibold">Attention Heatmap</h3>
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
            24 saatlik pencere boyunca ortalama attention ağırlığı — en yüksek değer kritik timestep'i gösterir.
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
                    iqr_lo: attnData.iqr_lo[i],
                    iqr_hi: attnData.iqr_hi[i],
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
                En yoğun saat(ler): {attnData.top3_hours.map((h) => `S${h}`).join(', ')} · n={attnData.n_samples} pencere
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FigureFrame
                title="BiGRU Attention (24 saat)"
                src={api.artifacts.figureUrl('attention_heatmap_bigru_24h.png')}
              />
              <FigureFrame
                title="Transformer Attention (24 saat)"
                src={api.artifacts.figureUrl('attention_heatmap_transformer_24h.png')}
              />
            </div>
          )}
        </div>

        {/* LIME */}
        <div className="card">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center">
              <LightBulbIcon className="w-5 h-5 text-yellow-500 mr-2" />
              <h3 className="text-base font-semibold">LIME Hasta Açıklamaları</h3>
            </div>
            <div className="flex gap-1.5">
              {[
                { idx: 1, label: '✓ TP', title: 'True Positive — Yüksek risk, doğru tahmin' },
                { idx: 2, label: '✗ FP', title: 'False Positive — Yüksek risk, yanlış tahmin' },
                { idx: 3, label: '! FN', title: 'False Negative — Düşük risk, hasta kötüleşti (kritik)' },
              ].map(({ idx, label, title }) => (
                <button
                  key={idx}
                  type="button"
                  title={title}
                  onClick={() => setLimeIdx(idx)}
                  className={clsx(
                    'px-3 py-1 rounded-md text-xs font-medium border',
                    limeIdx === idx
                      ? 'bg-yellow-500 text-white border-yellow-500'
                      : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {limeIdx === 1 && 'True Positive — XGBoost yüksek risk tahmin etti ve hasta gerçekten septikti.'}
            {limeIdx === 2 && 'False Positive — XGBoost yüksek risk tahmin etti ama hasta septik değildi. Model neden yanıldı?'}
            {limeIdx === 3 && 'False Negative — XGBoost düşük risk gösterdi ama hasta septikti. Kritik kaçırma analizi.'}
          </p>
          <iframe
            src={api.artifacts.limeUrl(limeIdx)}
            className="w-full h-[480px] rounded-lg border border-gray-200 dark:border-gray-700"
            title={`LIME Patient ${limeIdx}`}
          />
        </div>
      </motion.div>
    </DashboardLayout>
  )
}


function FigureFrame({ title, src }: { title: string; src: string }) {
  const [errored, setErrored] = useState(false)
  if (errored) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center text-xs text-gray-500">
        {title || 'Görsel'} yüklenemedi.
      </div>
    )
  }
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white">
      {title && (
        <div className="px-3 py-2 text-xs font-medium border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {title}
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={title}
        className="w-full h-auto"
        onError={() => setErrored(true)}
      />
    </div>
  )
}
