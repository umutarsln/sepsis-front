'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { motion } from 'framer-motion'
import {
  HeartIcon,
  ClockIcon,
  CheckBadgeIcon,
  ScaleIcon,
  ChartPieIcon,
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
import { api, ClinicalEvalRow, LeadTimeSummary } from '@/lib/api'

/**
 * Klinik Değerlendirme Sayfası
 *
 * Üç bölüm:
 *   1. Lead-time özet kartları (yakalama oranı, median lead, erken alarm).
 *   2. Kalibrasyon (ECE before/after isotonic).
 *   3. Klinik karar eğrisi (DCA) görseli + PR with CI.
 */

export default function KlinikDegerlendirmePage() {
  const [leadTime, setLeadTime] = useState<LeadTimeSummary | null>(null)
  const [clinical, setClinical] = useState<ClinicalEvalRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [lt, cs] = await Promise.all([
          api.artifacts.getLeadTime(),
          api.artifacts.getClinicalSummary(),
        ])
        setLeadTime(lt)
        setClinical(cs)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Yükleme başarısız'
        setError(msg)
      }
    }
    void load()
  }, [])

  const eceData = clinical.map((r) => ({
    model: prettyModel(r.model),
    before: Number(r.ece_before.toFixed(4)),
    after: Number(r.ece_after_isotonic.toFixed(4)),
  }))

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Klinik Değerlendirme
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Lead time, kalibrasyon (ECE), karar eğrisi analizi (DCA) ve klinik
            stabilite raporu.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Lead-time özet kartları */}
        {leadTime && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              icon={CheckBadgeIcon}
              color="green"
              label="Yakalama Oranı"
              value={`${(leadTime.detection_rate * 100).toFixed(1)}%`}
              hint={`${leadTime.n_detected} / ${leadTime.n_positive_patients} pozitif hasta`}
            />
            <SummaryCard
              icon={ClockIcon}
              color="blue"
              label="Median Lead Time"
              value={`${leadTime.median_lead_time_hours.toFixed(1)}h`}
              hint={`Q25–Q75: ${leadTime.q25_lead_time}h–${leadTime.q75_lead_time}h`}
            />
            <SummaryCard
              icon={HeartIcon}
              color="red"
              label="Erken Alarm"
              value={`${(leadTime.early_alarm_rate * 100).toFixed(1)}%`}
              hint={`${leadTime.n_early_alarm} hastada eşik üstü`}
            />
            <SummaryCard
              icon={ScaleIcon}
              color="purple"
              label="Eşik @ Spec85"
              value={leadTime.threshold_at_spec85.toFixed(3)}
              hint={`Versiyon: ${leadTime.version}`}
            />
          </div>
        )}

        {/* Kalibrasyon */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <div className="flex items-center mb-3">
              <ChartPieIcon className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-base font-semibold">
                Kalibrasyon (ECE) — Before vs After Isotonic
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Expected Calibration Error: küçük olan iyi. Isotonic regresyon
              sonrası tüm modellerde ECE neredeyse 0'a iner.
            </p>
            {eceData.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                Kalibrasyon verisi yükleniyor…
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={eceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="model"
                    tick={{ fontSize: 10 }}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => v.toFixed(4)}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="before" fill="#ef4444" name="ECE before" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="after" fill="#10b981" name="ECE after" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <h3 className="text-base font-semibold mb-3">
              Calibration Eğrisi (Before/After)
            </h3>
            <FigureFrame
              title=""
              src={api.artifacts.figureUrl('calibration_before_after.png')}
            />
          </div>
        </div>

        {/* Decision Curve & PR CI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h3 className="text-base font-semibold mb-3">
              Decision Curve Analysis (DCA)
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Modelin "tüm hastaları tedavi et" ve "kimseyi tedavi etme"
              stratejilerine göre net fayda farkı.
            </p>
            <FigureFrame
              title=""
              src={api.artifacts.figureUrl('dca_all_models.png')}
            />
          </div>
          <div className="card">
            <h3 className="text-base font-semibold mb-3">
              PR Eğrileri (95% CI)
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Bootstrap güven aralıklı precision-recall karşılaştırması.
            </p>
            <FigureFrame
              title=""
              src={api.artifacts.figureUrl('pr_curves_with_ci.png')}
            />
          </div>
        </div>

        {/* Klinik özet tablosu */}
        <div className="card">
          <h3 className="text-base font-semibold mb-3">
            Modellerin Klinik Performans Özeti
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-semibold">Model</th>
                  <th className="text-right py-2 px-3 font-semibold">AUROC</th>
                  <th className="text-right py-2 px-3 font-semibold">95% CI</th>
                  <th className="text-right py-2 px-3 font-semibold">AUPRC</th>
                  <th className="text-right py-2 px-3 font-semibold">ECE before</th>
                  <th className="text-right py-2 px-3 font-semibold">ECE after</th>
                </tr>
              </thead>
              <tbody>
                {clinical.map((r) => (
                  <tr
                    key={r.model}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-2 px-3 font-medium">
                      {prettyModel(r.model)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold">
                      {r.auroc_mean.toFixed(4)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-xs text-gray-500">
                      [{r.auroc_lo.toFixed(3)}, {r.auroc_hi.toFixed(3)}]
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {r.auprc_mean.toFixed(4)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-red-600">
                      {r.ece_before.toFixed(4)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-green-600">
                      {r.ece_after_isotonic.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lead Time dağılımı */}
        <div className="card mt-6">
          <h3 className="text-base font-semibold mb-3">Lead Time Dağılımı</h3>
          <p className="text-xs text-gray-500 mb-3">
            Sepsis tanı zamanından kaç saat önce alarm verildiğinin histogramı.
          </p>
          <FigureFrame
            title=""
            src={api.artifacts.figureUrl('lead_time_distributions.png')}
          />
        </div>
      </motion.div>
    </DashboardLayout>
  )
}


/** Model adını insan okunabilir hale getirir. */
function prettyModel(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\bxgboost\b/gi, 'XGBoost')
    .replace(/\bga pso\b/gi, 'GA-PSO')
    .replace(/\bbirnn attn\b/gi, 'BiGRU + Attn')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}


function SummaryCard({
  icon: Icon,
  color,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  color: 'green' | 'blue' | 'red' | 'purple'
  label: string
  value: string
  hint?: string
}) {
  const colorMap = {
    green: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    red: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  } as const
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
          {hint && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              {hint}
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
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
