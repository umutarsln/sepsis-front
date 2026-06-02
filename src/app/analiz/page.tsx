'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  ChartBarIcon,
  UsersIcon,
  ClockIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import type { ComponentType, SVGProps } from 'react'
import { artifactsAPI, type DatasetSummary } from '@/lib/api'

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

type StatIcon = ComponentType<SVGProps<SVGSVGElement>>

interface SummaryStat {
  name: string
  value: string
  sub: string
  icon: StatIcon
  color: string
}

/**
 * Sayi degerini binlik ayiracli metne cevirir.
 */
function formatNumber(value: number): string {
  return value.toLocaleString('tr-TR')
}

/**
 * Ozet kartlari icin istatistik listesi uretir.
 */
function buildSummaryStats(summary: DatasetSummary): SummaryStat[] {
  return [
    {
      name: 'Toplam Hasta',
      value: formatNumber(summary.cohort.total_patients),
      sub: `${formatNumber(summary.cohort.total_rows)} saatlik kayit`,
      icon: UsersIcon,
      color: 'blue',
    },
    {
      name: 'Sepsis Vakasi',
      value: formatNumber(summary.labels.sepsis_positive_patients),
      sub: `%${summary.labels.sepsis_patient_rate_pct.toFixed(2)} hasta duzeyi`,
      icon: ExclamationCircleIcon,
      color: 'red',
    },
    {
      name: 'Medyan ICU Suresi',
      value: `${summary.length.median.toFixed(0)} saat`,
      sub: `P25–P75: ${summary.length.p25.toFixed(0)}–${summary.length.p75.toFixed(0)} saat`,
      icon: ClockIcon,
      color: 'green',
    },
    {
      name: 'Model Split (Test)',
      value: formatNumber(summary.splits.test_patients),
      sub: `${summary.splits.test_sepsis_patients} sepsis hastasi`,
      icon: ChartBarIcon,
      color: 'purple',
    },
  ]
}

/**
 * Veri analizi sayfasini Faz 2-3 gercek artifact'leriyle doldurur.
 */
export default function AnalizPage() {
  const [summary, setSummary] = useState<DatasetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    /** Backend'den veri seti ozetini ceker. */
    async function loadSummary() {
      try {
        setLoading(true)
        setError(null)
        const data = await artifactsAPI.getDatasetSummary()
        if (!cancelled) setSummary(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Veri ozeti yuklenemedi')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSummary()
    return () => {
      cancelled = true
    }
  }, [])

  /** Set A / Set B dagilimi grafigi icin veri uretir. */
  const setDistribution = useMemo(() => {
    if (!summary) return []
    return [
      { name: 'Set A', value: summary.cohort.set_a_patients },
      { name: 'Set B', value: summary.cohort.set_b_patients },
    ]
  }, [summary])

  /** Sepsis hasta dengesi pasta grafigi icin veri uretir. */
  const sepsisBalance = useMemo(() => {
    if (!summary) return []
    return [
      { name: 'Sepsis (+)', value: summary.labels.sepsis_positive_patients },
      { name: 'Sepsis (-)', value: summary.labels.sepsis_negative_patients },
    ]
  }, [summary])

  /** 18 feature eksiklik grafigi icin sirali veri uretir. */
  const missingChartData = useMemo(() => {
    if (!summary) return []
    return summary.selected_feature_missing.map((row) => ({
      feature: row.feature,
      missing: row.missing_pct,
    }))
  }, [summary])

  /** Her feature satiri icin yeterli dikey alan (Recharts etiket kirpmasini onler). */
  const missingChartHeight = Math.max(480, missingChartData.length * 34 + 48)

  const stats = useMemo(
    () => (summary ? buildSummaryStats(summary) : []),
    [summary],
  )

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Veri Analizi
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            PhysioNet 2019 Challenge — Faz 2 EDA ve Faz 3 preprocessing ozeti
          </p>
        </div>

        <div className="mb-6 card bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <div className="flex gap-3">
            <InformationCircleIcon className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="mb-2">
                <strong>PhysioNet 2019 Challenge</strong> ICU verisi; etiketleme{' '}
                <strong>Sepsis-3</strong> (SOFA artışı + enfeksiyon şüphesi) standardına uygundur.
                Kohort dengesizdir (~%6 sepsis); model eğitimi için train/val/test split dondurulmuştur.
              </p>
              <p>
                Veriler <strong>Faz 2</strong> (<code>eda_summary.json</code>) ve{' '}
                <strong>Faz 3</strong> (<code>splits.json</code>, <code>feature_stats.json</code>)
                artifact&apos;lerinden gelir. Ham satir eksiklik oranlari forward-fill oncesidir.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {loading
            ? Array.from({ length: 4 }, (_, index) => (
                <motion.div
                  key={`sk-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Yukleniyor…</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">—</p>
                    </div>
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <ChartBarIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </motion.div>
              ))
            : stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <motion.div
                    key={stat.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{stat.name}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {stat.value}
                        </p>
                        <p className="text-sm mt-1 text-gray-500">{stat.sub}</p>
                      </div>
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <h3 className="text-lg font-semibold mb-4">Set A / Set B Dagilimi</h3>
            {loading || !summary ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500">Yukleniyor…</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={setDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {setDistribution.map((_, index) => (
                      <Cell key={`set-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <h3 className="text-lg font-semibold mb-4">Sepsis Hasta Dengesi</h3>
            {loading || !summary ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500">Yukleniyor…</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sepsisBalance}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    dataKey="value"
                  >
                    <Cell fill="#ef4444" />
                    <Cell fill="#3b82f6" />
                  </Pie>
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <h3 className="text-lg font-semibold mb-4">Train / Val / Test Split (Hasta)</h3>
            {loading || !summary ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500">Yukleniyor…</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary.split_chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="split" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Legend />
                  <Bar dataKey="patients" fill="#3b82f6" name="Toplam Hasta" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="sepsis_patients" fill="#ef4444" name="Sepsis Hasta" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="card"
          >
            <h3 className="text-lg font-semibold mb-4">ICU Kalis Suresi (Persentil, saat)</h3>
            {loading || !summary ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500">Yukleniyor…</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={summary.icu_length_chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)} saat`} />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 5 }}
                    name="Saat"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="card lg:col-span-2"
          >
            <h3 className="text-lg font-semibold mb-1">
              Secilen 18 Feature — Ham Eksiklik Orani (%)
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Preprocessing sonrasi forward-fill ile doldurulur; oranlar ham PSV uzerinden.
              Gender_0 / Gender_1 one-hot kodlamasidir (ikisi de %0 eksik).
            </p>
            {loading || !summary ? (
              <div className="h-[320px] flex items-center justify-center text-gray-500">Yukleniyor…</div>
            ) : (
              <div className="overflow-x-auto">
                <div style={{ height: missingChartHeight, minWidth: 480 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={missingChartData}
                      layout="vertical"
                      margin={{ left: 4, right: 16, top: 8, bottom: 8 }}
                      barSize={18}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `%${v}`} />
                      <YAxis
                        dataKey="feature"
                        type="category"
                        width={104}
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip formatter={(value: number) => `%${value.toFixed(1)}`} />
                      <Bar dataKey="missing" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="card mb-6"
        >
          <h3 className="text-lg font-semibold mb-1">Lab Değerleri Dağılımı (Faz 2 EDA)</h3>
          <p className="text-xs text-gray-500 mb-4">
            Sepsis (+) ve sepsis (−) hastalar arasında lab kutuları — tez Faz 2 çıktısı.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/thesis/figures/lab_boxplots.png"
            alt="Lab değerleri kutu grafikleri — sepsis vs non-sepsis"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card"
        >
          <h3 className="text-lg font-semibold mb-4">Veri Seti Ozeti</h3>
          {loading || !summary ? (
            <p className="text-gray-500">Yukleniyor…</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Model Feature Sayisi</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {summary.final_feature_count}
                </p>
                <p className="text-xs text-gray-500 mt-1">Faz 3 preprocessing ciktisi</p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">&gt;%80 Eksik Feature (Ham)</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {summary.features_above_80pct_missing}
                </p>
                <p className="text-xs text-gray-500 mt-1">Faz 2 EDA — eleme adayi</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Sepsis Onset (Medyan)</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  +{summary.labels.onset_median_hours.toFixed(0)} saat
                </p>
                <p className="text-xs text-gray-500 mt-1">ICU basvurusundan sonra</p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
