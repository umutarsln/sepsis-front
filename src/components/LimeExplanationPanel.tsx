'use client'

import clsx from 'clsx'
import { LightBulbIcon } from '@heroicons/react/24/outline'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { LimeExplanation, LimePatientType } from '@/lib/api'

/** TP / FP / FN sekme tanimlari — model adi disaridan gelir. */
function limeTabDescription(type: LimePatientType, modelLabel: string): string {
  switch (type) {
    case 'tp':
      return `${modelLabel} yüksek risk tahmin etti ve hasta gerçekten septikti.`
    case 'fp':
      return `${modelLabel} yüksek risk tahmin etti ama hasta septik değildi.`
    case 'fn':
      return `${modelLabel} düşük risk gösterdi ama hasta septikti — kritik kaçırma.`
  }
}

const LIME_TABS: Array<{
  type: LimePatientType
  label: string
  short: string
  accent: string
}> = [
  {
    type: 'tp',
    label: 'True Positive',
    short: '✓ TP',
    accent: 'bg-emerald-500 border-emerald-500',
  },
  {
    type: 'fp',
    label: 'False Positive',
    short: '✗ FP',
    accent: 'bg-amber-500 border-amber-500',
  },
  {
    type: 'fn',
    label: 'False Negative',
    short: '! FN',
    accent: 'bg-red-500 border-red-500',
  },
]

interface LimeExplanationPanelProps {
  /** Backend'den gelen uc ornek hasta LIME aciklamasi. */
  explanations: LimeExplanation[]
  /** Secili hasta tipi. */
  selected: LimePatientType
  /** Sekme degistiginde cagrilir. */
  onSelect: (type: LimePatientType) => void
  /** Veri yuklenirken gosterilir. */
  loading?: boolean
  /** Ust SHAP model secicisi ile ayni model etiketi. */
  modelLabel: string
}

/**
 * LIME local aciklama paneli — tek hastada hangi feature'larin
 * sepsis skorunu yukari/asagi cektigini gorsellestirir.
 */
export default function LimeExplanationPanel({
  explanations,
  selected,
  onSelect,
  loading = false,
  modelLabel,
}: LimeExplanationPanelProps) {
  const active = explanations.find((row) => row.patient_type === selected)
  const tab = LIME_TABS.find((t) => t.type === selected) ?? LIME_TABS[0]
  const chartData = active ? toChartRows(active.top10_features) : []

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center flex-wrap gap-2">
          <LightBulbIcon className="w-5 h-5 text-yellow-500" />
          <h3 className="text-base font-semibold">LIME Hasta Açıklamaları</h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
            {modelLabel}
          </span>
        </div>
        <div className="flex gap-1.5">
          {LIME_TABS.map((item) => (
            <button
              key={item.type}
              type="button"
              title={item.label}
              onClick={() => onSelect(item.type)}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium border transition-colors',
                selected === item.type
                  ? `${item.accent} text-white`
                  : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              {item.short}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        {limeTabDescription(tab.type, modelLabel)}
      </p>

      {loading ? (
        <p className="text-sm text-gray-500 py-12 text-center">LIME verisi yükleniyor…</p>
      ) : !active ? (
        <p className="text-sm text-gray-500 py-12 text-center">
          Seçilen senaryo için LIME açıklaması bulunamadı.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <MetricCard label="Senaryo" value={active.patient_label} />
            <MetricCard
              label="Tahmin olasılığı"
              value={`${(active.predicted_prob * 100).toFixed(1)}%`}
              tone={active.predicted_prob >= 0.5 ? 'high' : 'low'}
            />
            <MetricCard
              label="Gerçek etiket"
              value={active.true_label === 1 ? 'Sepsis (+)' : 'Sepsis (-)'}
              tone={active.true_label === 1 ? 'high' : 'neutral'}
            />
            <MetricCard label="Test indeksi" value={`#${active.test_index}`} />
          </div>

          <p className="text-xs text-gray-500 mb-2">
            Pozitif çubuk sepsis lehine, negatif çubuk sepsis aleyhine local katkı gösterir.
          </p>

          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <ReferenceLine x={0} stroke="#9ca3af" />
              <XAxis type="number" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
              <YAxis
                type="category"
                dataKey="shortLabel"
                tick={{ fontSize: 10 }}
                width={108}
              />
              <Tooltip
                formatter={(value: number) => [value.toFixed(4), 'LIME ağırlığı']}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as LimeChartRow | undefined
                  return row?.feature ?? ''
                }}
                contentStyle={{ borderRadius: 8, fontSize: 12, maxWidth: 320 }}
              />
              <Bar dataKey="weight" radius={[0, 3, 3, 0]} barSize={14}>
                {chartData.map((row) => (
                  <Cell
                    key={row.feature}
                    fill={row.weight >= 0 ? '#ef4444' : '#3b82f6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-semibold">#</th>
                  <th className="text-left py-2 px-3 font-semibold">Kural / Feature</th>
                  <th className="text-right py-2 px-3 font-semibold">Ağırlık</th>
                  <th className="text-right py-2 px-3 font-semibold">Yön</th>
                </tr>
              </thead>
              <tbody>
                {active.top10_features.map((row, index) => (
                  <tr
                    key={`${row.feature}-${index}`}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <td className="py-2 px-3 text-gray-400">{index + 1}</td>
                    <td className="py-2 px-3 font-medium">{row.feature}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {row.weight >= 0 ? '+' : ''}
                      {row.weight.toFixed(4)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={clsx(
                          'inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold',
                          row.weight >= 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                        )}
                      >
                        {row.weight >= 0 ? 'Sepsis +' : 'Sepsis -'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

interface LimeChartRow {
  feature: string
  shortLabel: string
  weight: number
}

/**
 * LIME feature listesini grafik satirlarina donusturur.
 * Uzun kural metinlerini Y ekseni icin kisaltir.
 */
function toChartRows(features: LimeExplanation['top10_features']): LimeChartRow[] {
  return features.map((row) => ({
    feature: row.feature,
    shortLabel: shortenFeatureLabel(row.feature),
    weight: row.weight,
  }))
}

/**
 * LIME kural metnini grafik etiketi icin kirpar.
 */
function shortenFeatureLabel(label: string): string {
  const trimmed = label.trim()
  if (trimmed.length <= 16) return trimmed
  return `${trimmed.slice(0, 14)}…`
}

/** Ozet metrik karti. */
function MetricCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'high' | 'low' | 'neutral'
}) {
  const toneClass =
    tone === 'high'
      ? 'text-red-600 dark:text-red-400'
      : tone === 'low'
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-gray-900 dark:text-white'

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50/80 dark:bg-gray-800/40">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={clsx('text-sm font-semibold mt-0.5 tabular-nums', toneClass)}>{value}</p>
    </div>
  )
}
