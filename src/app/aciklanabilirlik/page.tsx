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
import { api, FeatureRankingRow } from '@/lib/api'

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
  const [globalRanking, setGlobalRanking] = useState<FeatureRankingRow[]>([])
  const [limeIdx, setLimeIdx] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [loadingShap, setLoadingShap] = useState(false)

  // SHAP global ranking yükle
  useEffect(() => {
    const load = async () => {
      try {
        const rows = await api.artifacts.getFeatureRanking('global')
        setGlobalRanking(rows.slice(0, 15))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Yükleme hatası'
        setError(msg)
      }
    }
    void load()
  }, [])

  // Model değişince SHAP yükle
  useEffect(() => {
    const load = async () => {
      setLoadingShap(true)
      try {
        const rows = await api.artifacts.getFeatureRanking(shapModel)
        setShapData(rows.slice(0, 15))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'SHAP yüklenemedi'
        setError(msg)
        setShapData([])
      } finally {
        setLoadingShap(false)
      }
    }
    void load()
  }, [shapModel])

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
              <div className="flex items-center">
                <PuzzlePieceIcon className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-base font-semibold">SHAP Top-15</h3>
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
              <p className="text-sm text-gray-500 py-8 text-center">
                Yükleniyor…
              </p>
            ) : shapData.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                Bu model için SHAP verisi bulunamadı.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={shapData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    dataKey="feature"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(v: number) => v.toFixed(4)}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="importance" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <div className="flex items-center mb-3">
              <EyeIcon className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="text-base font-semibold">
                BiGRU + Attention Heatmap
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              24 saatlik pencere boyunca attention ağırlıkları (h=6, w=24).
            </p>
            <FigureFrame
              title=""
              src={api.artifacts.figureUrl('attention_heatmap_rnn.png')}
            />
          </div>
          <div className="card">
            <div className="flex items-center mb-3">
              <EyeIcon className="w-5 h-5 text-orange-500 mr-2" />
              <h3 className="text-base font-semibold">
                Transformer Attention Heatmap
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              CLS token'ın diğer zaman adımlarına dikkat dağılımı.
            </p>
            <FigureFrame
              title=""
              src={api.artifacts.figureUrl('attention_heatmap_transformer.png')}
            />
          </div>
        </div>

        {/* LIME */}
        <div className="card">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center">
              <LightBulbIcon className="w-5 h-5 text-yellow-500 mr-2" />
              <h3 className="text-base font-semibold">LIME Hasta Açıklamaları</h3>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLimeIdx(i)}
                  className={clsx(
                    'px-3 py-1 rounded-md text-xs font-medium border',
                    limeIdx === i
                      ? 'bg-yellow-500 text-white border-yellow-500'
                      : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                  )}
                >
                  Hasta {i}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Önceden üretilmiş LIME açıklamaları — her hastanın tahmininde lokal
            olarak en etkili feature'lar.
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
