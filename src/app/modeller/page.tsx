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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { ClockIcon, BoltIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { api, Faz6ComparisonRow, HorizonComparisonRow } from '@/lib/api'

/**
 * Model Karşılaştırma Sayfası
 *
 * sepsis-son Faz 6 ciktisi: 5 ML snapshot + 4 DL/Transformer (h=6, w=24).
 */

const FAMILY_COLORS: Record<string, string> = {
  ML: '#3b82f6',
  DL: '#8b5cf6',
  Transformer: '#f59e0b',
}

const FAMILY_LABEL: Record<string, string> = {
  ML: 'Snapshot ML',
  DL: 'Derin Öğrenme',
  Transformer: 'Transformer',
}

/** Kisa model adi (grafik eksenleri icin). */
function shortModelName(row: Faz6ComparisonRow): string {
  const map: Record<string, string> = {
    logistic_regression: 'LogReg',
    random_forest: 'RF',
    xgboost: 'XGB',
    gradient_boosting: 'GB',
    gaussian_nb: 'GNB',
    lstm: 'LSTM',
    gru: 'GRU',
    bigru_attn: 'BiGRU',
    transformer: 'Trans.',
  }
  return map[row.model_id] ?? row.model_name
}

export default function ModellerPage() {
  const [comparisonRows, setComparisonRows] = useState<Faz6ComparisonRow[]>([])
  const [horizonRows, setHorizonRows] = useState<HorizonComparisonRow[]>([])
  const [artifactError, setArtifactError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [rows, horizon] = await Promise.all([
          api.artifacts.getFaz6Comparison(),
          api.artifacts.getHorizonComparison().catch(() => []),
        ])
        setComparisonRows(rows)
        setHorizonRows(horizon)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Yükleme hatası'
        setArtifactError(msg)
      }
    }
    void load()
  }, [])

  /** Kart + grafikler icin siralanmis model listesi (aile, sonra AUROC). */
  const models = useMemo(() => {
    const familyOrder: Record<string, number> = { ML: 0, DL: 1, Transformer: 2 }
    return [...comparisonRows]
      .sort((a, b) => {
        const fa = familyOrder[a.family] ?? 9
        const fb = familyOrder[b.family] ?? 9
        if (fa !== fb) return fa - fb
        return b.auroc - a.auroc
      })
      .map((r) => ({
        ...r,
        color: FAMILY_COLORS[r.family] ?? '#6b7280',
        typeLabel: FAMILY_LABEL[r.family] ?? r.family,
        shortName: shortModelName(r),
      }))
  }, [comparisonRows])

  const bestAurocModel = useMemo(
    () => [...comparisonRows].sort((a, b) => b.auroc - a.auroc)[0] ?? null,
    [comparisonRows],
  )

  const bestAuprcModel = useMemo(
    () => [...comparisonRows].sort((a, b) => b.auprc - a.auprc)[0] ?? null,
    [comparisonRows],
  )

  const bestMlLeadModel = useMemo(
    () =>
      [...comparisonRows]
        .filter((r) => r.family === 'ML' && r.median_lead_h != null)
        .sort((a, b) => (b.median_lead_h ?? 0) - (a.median_lead_h ?? 0))[0] ?? null,
    [comparisonRows],
  )

  const dlRows = useMemo(() => models.filter((m) => m.family !== 'ML'), [models])

  /** Radar grafigi — AUROC/AUPRC/Sens@85/F1 (top 4). */
  const radarData = useMemo(() => {
    const top = models.slice(0, 4)
    if (top.length === 0) return []
    const metrics = [
      { key: 'auroc' as const, label: 'AUROC' },
      { key: 'auprc' as const, label: 'AUPRC' },
      { key: 'sens_spec85' as const, label: 'Sens@85' },
      { key: 'f1' as const, label: 'F1' },
    ]
    return metrics.map((m) => {
      const row: Record<string, number | string> = { metric: m.label }
      top.forEach((mdl) => {
        row[mdl.model_name] = Math.round(mdl[m.key] * 100)
      })
      return row
    })
  }, [models])

  const radarKeys = useMemo(() => models.slice(0, 4).map((m) => m.model_name), [models])

  /** AUROC cubuk grafigi — tum 9 model. */
  const aurocBarData = useMemo(
    () =>
      models.map((m) => ({
        name: m.shortName,
        auroc: Number(m.auroc.toFixed(4)),
        fill: m.color,
      })),
    [models],
  )

  /** AUPRC cubuk grafigi — tum 9 model (seyrek pozitif gorevi). */
  const auprcBarData = useMemo(
    () =>
      models.map((m) => ({
        name: m.shortName,
        auprc: Number(m.auprc.toFixed(4)),
        fill: m.color,
      })),
    [models],
  )

  /** Lead-time cubuk grafigi — ML modelleri icin medyan saat. */
  const leadTimeBarData = useMemo(
    () =>
      models
        .filter((m) => m.median_lead_h != null)
        .map((m) => ({
          name: m.shortName,
          hours: m.median_lead_h as number,
          fill: m.color,
        })),
    [models],
  )

  const bestModel = bestAurocModel

  const dlBestAuprc = useMemo(
    () => [...dlRows].sort((a, b) => b.auprc - a.auprc)[0] ?? null,
    [dlRows],
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
            Model Karşılaştırma
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            PhysioNet 2019 test seti — Faz 6: 5 ML snapshot (h=6) + 4 DL pencere modeli
            (LSTM, GRU, BiGRU+Attention, Transformer; h=6, w=24). Düşük pozitif oranında
            AUPRC, AUROC ile birlikte değerlendirilmelidir.
          </p>
        </div>

        <div className="space-y-6">
          {artifactError && (
            <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 text-sm">
              Veri yüklenemedi: {artifactError}
            </div>
          )}

          {models.length === 0 && !artifactError && (
            <p className="text-sm text-gray-500 py-8 text-center">Karşılaştırma verisi yükleniyor…</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card text-sm">
              <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-1">ML Snapshot (5)</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Tek anlik 18 feature → Lojistik Reg., RF, XGBoost, Gradyan Artirma, Gaussian NB.
                Metrik: AUROC, AUPRC, F1, Sens@Spec=0.85, medyan lead-time.
              </p>
            </div>
            <div className="card text-sm">
              <h3 className="font-semibold text-purple-700 dark:text-purple-300 mb-1">DL Pencere (3)</h3>
              <p className="text-gray-600 dark:text-gray-400">
                24 saat × 18 feature serisi → LSTM, GRU, BiGRU+Attention. Ayni test seti,
                pencere bazli tahmin.
              </p>
            </div>
            <div className="card text-sm">
              <h3 className="font-semibold text-amber-700 dark:text-amber-300 mb-1">Transformer (1)</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Temporal Transformer — self-attention ile uzun bagimlilik. Faz 6 raporundaki
                9-modelli tablo ile karsilastirilir.
              </p>
            </div>
          </div>

          {horizonRows.length > 0 && (
            <div className="card overflow-x-auto">
              <h3 className="text-lg font-semibold mb-2">
                Snapshot ML — Ufuk Karşılaştırması (Faz 4.7)
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                h=6 satırında XGB/RF Faz 4.6 Optuna; LR/GB/GNB Faz 4 baseline.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3">Model</th>
                    <th className="text-right py-2 px-3">h=0 AUROC</th>
                    <th className="text-right py-2 px-3">h=6 AUROC</th>
                    <th className="text-right py-2 px-3">h=24 AUROC</th>
                    <th className="text-right py-2 px-3">h=0 AUPRC</th>
                    <th className="text-right py-2 px-3">h=6 AUPRC</th>
                    <th className="text-right py-2 px-3">h=24 AUPRC</th>
                  </tr>
                </thead>
                <tbody>
                  {horizonRows.map((row) => (
                    <tr
                      key={row.model_id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-2 px-3 font-medium">{row.model_name}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{row.h0_auroc.toFixed(3)}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-indigo-700 dark:text-indigo-300">
                        {row.h6_auroc.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{row.h24_auroc.toFixed(3)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{row.h0_auprc.toFixed(3)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{row.h6_auprc.toFixed(3)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-emerald-700 dark:text-emerald-300">
                        {row.h24_auprc.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {models.map((model, index) => (
              <motion.div
                key={model.model_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: model.color }} />
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {model.typeLabel}
                  </span>
                </div>
                <h3 className="font-semibold text-base mb-2">{model.model_name}</h3>
                <div className="space-y-2 text-sm">
                  <MetricRow label="AUROC" value={model.auroc.toFixed(3)} />
                  <MetricRow label="AUPRC" value={model.auprc.toFixed(3)} />
                  <MetricRow label="Sens@Spec85" value={model.sens_spec85.toFixed(3)} />
                  <MetricRow label="F1" value={model.f1.toFixed(3)} />
                </div>
                {model.median_lead_h != null && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center text-xs text-gray-500">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    Medyan lead-time: {model.median_lead_h.toFixed(0)}h
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {radarKeys.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Top 4 Model — Radar (AUROC, AUPRC, Sens, F1)</h3>
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
            </div>
          )}

          {aurocBarData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">AUROC Karşılaştırması (9 Model)</h3>
              <p className="text-xs text-gray-500 mb-3">
                Kaynak: <code>adim_6/ciktilar/version_comparison_summary.csv</code>
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={aurocBarData} margin={{ bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0.65, 0.88]} tickFormatter={(v) => v.toFixed(2)} />
                  <Tooltip formatter={(v: number) => v.toFixed(4)} />
                  <Bar dataKey="auroc" name="AUROC" radius={[4, 4, 0, 0]}>
                    {aurocBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {auprcBarData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">AUPRC Karşılaştırması (9 Model)</h3>
              <p className="text-xs text-gray-500 mb-3">
                Precision–recall eğrisi altı alan; sepsis pozitifleri seyrekken (&lt;3%) klinik
                ayırım için AUROC&apos;dan daha bilgilendirici olabilir.
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={auprcBarData} margin={{ bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 0.35]} tickFormatter={(v) => v.toFixed(2)} />
                  <Tooltip formatter={(v: number) => v.toFixed(4)} />
                  <Bar dataKey="auprc" name="AUPRC" radius={[4, 4, 0, 0]}>
                    {auprcBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {leadTimeBarData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Medyan Lead-Time (Saat) — ML Modelleri</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={leadTimeBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" />
                  <YAxis unit="h" />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)} saat`} />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {leadTimeBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {models.length > 0 && (
            <div className="card overflow-x-auto">
              <h3 className="text-lg font-semibold mb-4">Tam Metrik Tablosu</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3">Aile</th>
                    <th className="text-left py-2 px-3">Model</th>
                    <th className="text-right py-2 px-3">AUROC</th>
                    <th className="text-right py-2 px-3">AUPRC</th>
                    <th className="text-right py-2 px-3">F1</th>
                    <th className="text-right py-2 px-3">Sens@85</th>
                    <th className="text-right py-2 px-3">Lead med. (h)</th>
                    <th className="text-right py-2 px-3">Lead ort. (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((r) => (
                    <tr
                      key={r.model_id}
                      className={clsx(
                        'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                        (r.model_id === bestAurocModel?.model_id ||
                          r.model_id === bestAuprcModel?.model_id) &&
                          'bg-purple-50/50 dark:bg-purple-900/10',
                      )}
                    >
                      <td className="py-2 px-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: `${r.color}22`,
                            color: r.color,
                          }}
                        >
                          {r.typeLabel}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium">{r.model_name}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold">
                        {r.auroc.toFixed(4)}
                        {r.model_id === bestAurocModel?.model_id && (
                          <span className="ml-1 text-[10px] text-purple-600">↑ AUROC</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-indigo-700 dark:text-indigo-300">
                        {r.auprc.toFixed(4)}
                        {r.model_id === bestAuprcModel?.model_id && (
                          <span className="ml-1 text-[10px] text-indigo-600">↑ AUPRC</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{r.f1.toFixed(3)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{r.sens_spec85.toFixed(3)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {r.median_lead_h != null ? r.median_lead_h.toFixed(0) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {r.mean_lead_h != null ? r.mean_lead_h.toFixed(1) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {bestModel && (
            <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-700">
              <div className="flex items-center mb-3">
                <BoltIcon className="w-6 h-6 text-purple-600 mr-2" />
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                  Öne Çıkan Modeller
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                <div className="p-3 rounded-lg bg-white/60 dark:bg-gray-900/40">
                  <p className="text-xs text-gray-500 mb-1">En yüksek AUROC</p>
                  <p className="font-semibold">
                    {bestModel.model_name}{' '}
                    <span className="text-purple-600 tabular-nums">
                      ({bestModel.auroc.toFixed(3)})
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    AUPRC {bestModel.auprc.toFixed(3)} ·{' '}
                    {FAMILY_LABEL[bestModel.family] ?? bestModel.family}
                  </p>
                </div>
                {bestAuprcModel && bestAuprcModel.model_id !== bestModel.model_id && (
                  <div className="p-3 rounded-lg bg-white/60 dark:bg-gray-900/40">
                    <p className="text-xs text-gray-500 mb-1">En yüksek AUPRC</p>
                    <p className="font-semibold">
                      {bestAuprcModel.model_name}{' '}
                      <span className="text-indigo-600 tabular-nums">
                        ({bestAuprcModel.auprc.toFixed(3)})
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      AUROC {bestAuprcModel.auroc.toFixed(3)} · seyrek pozitif ayırımı
                    </p>
                  </div>
                )}
                {bestMlLeadModel && (
                  <div className="p-3 rounded-lg bg-white/60 dark:bg-gray-900/40">
                    <p className="text-xs text-gray-500 mb-1">En iyi ML lead-time (medyan)</p>
                    <p className="font-semibold">
                      {bestMlLeadModel.model_name}{' '}
                      <span className="text-blue-600 tabular-nums">
                        ({bestMlLeadModel.median_lead_h?.toFixed(0)} saat)
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Snapshot ML · erken uyarı süresi</p>
                  </div>
                )}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
                DL ailesinde en yüksek AUPRC{' '}
                <strong>{dlBestAuprc?.model_name ?? '—'}</strong>
                {dlBestAuprc && (
                  <span className="tabular-nums text-indigo-600">
                    {' '}
                    ({dlBestAuprc.auprc.toFixed(3)})
                  </span>
                )}
                ; ML snapshot bandında XGBoost ~0.18 AUPRC, ~0.82 AUROC.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBlock label="AUROC" value={bestModel.auroc.toFixed(3)} />
                <StatBlock label="AUPRC" value={bestModel.auprc.toFixed(3)} highlight />
                <StatBlock label="Sens@Spec85" value={`${(bestModel.sens_spec85 * 100).toFixed(1)}%`} />
                <StatBlock label="F1" value={bestModel.f1.toFixed(3)} />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function StatBlock({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="text-center">
      <p
        className={clsx(
          'text-2xl font-bold tabular-nums',
          highlight ? 'text-indigo-600' : 'text-purple-600',
        )}
      >
        {value}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  )
}
