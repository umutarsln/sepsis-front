'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { EyeIcon } from '@heroicons/react/24/outline'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AttentionSummary, WindowModelResult, WindowPredictionResponse } from '@/lib/api'

const DL_MODELS: Array<{ id: string; label: string }> = [
  { id: 'lstm', label: 'LSTM' },
  { id: 'gru', label: 'GRU' },
  { id: 'bigru_attn', label: 'BiGRU+Attn' },
  { id: 'transformer', label: 'Transformer' },
]

interface DlWindowExplainPanelProps {
  /** Gercek seri uzerinden yapilan pencere tahmini (tercih edilen). */
  seriesResult: WindowPredictionResponse | null
  /** Populasyon ort. attention (Faz 7 artifact). */
  populationAttention: Partial<Record<'bigru_attn' | 'transformer', AttentionSummary>>
  loading?: boolean
}

/**
 * DL pencere tahminleri icin timestep aciklanabilirlik paneli.
 * BiGRU attention; LSTM/GRU/Transformer gradient saliency gosterir.
 */
export default function DlWindowExplainPanel({
  seriesResult,
  populationAttention,
  loading = false,
}: DlWindowExplainPanelProps) {
  const [selectedModel, setSelectedModel] = useState('bigru_attn')

  const activeModel = useMemo(
    () => seriesResult?.models.find((m) => m.model_id === selectedModel) ?? null,
    [seriesResult, selectedModel],
  )

  const chartData = useMemo(() => {
    if (!activeModel?.attention_weights?.length) return []
    const pop =
      selectedModel === 'bigru_attn'
        ? populationAttention.bigru_attn?.mean
        : selectedModel === 'transformer'
          ? populationAttention.transformer?.mean
          : undefined

    return activeModel.attention_weights.map((value, index) => ({
      hour: `S${index + 1}`,
      patient: value,
      population: pop?.[index] ?? null,
    }))
  }, [activeModel, populationAttention, selectedModel])

  const methodLabel = methodBadge(activeModel)

  return (
    <div className="card mt-6 mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <EyeIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold">DL Zaman Adımı Açıklaması</h3>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {DL_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedModel(m.id)}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium border',
                selectedModel === m.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Seçili hastanın <strong>gerçek 24 saatlik seri</strong> tahminine göre hangi
        zaman adımlarının risk skorunu etkilediği. BiGRU+Attn için model attention
        ağırlığı; LSTM, GRU ve Transformer için gradient saliency (
        |∂risk/∂girdi|) kullanılır.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500 py-10 text-center">Açıklama yükleniyor…</p>
      ) : !seriesResult ? (
        <p className="text-sm text-gray-500 py-10 text-center">Önce bir demo hasta seçin.</p>
      ) : !activeModel ? (
        <p className="text-sm text-gray-500 py-10 text-center">Model sonucu bulunamadı.</p>
      ) : chartData.length === 0 ? (
        <div className="text-sm text-gray-500 py-10 text-center space-y-2 px-4">
          <p>{explainUnavailableMessage(selectedModel, activeModel)}</p>
          {isGradientModel(selectedModel) && (
            <p className="text-xs text-gray-400 max-w-lg mx-auto">
              Geliştirme sunucusunda LSTM/GRU/Transformer gradient açıklaması macOS’ta
              varsayılan kapalıdır (<code className="text-[10px]">ENABLE_GRADIENT_SALIENCY=1</code>).
              BiGRU+Attn sekmesi attention ile çalışmaya devam eder.
            </p>
          )}
        </div>
      ) : (
        <>
          <ModelSummaryRow model={activeModel} methodLabel={methodLabel} />

          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={1} angle={-45} textAnchor="end" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: number, name: string) => [v.toFixed(4), name === 'patient' ? 'Bu hasta' : 'Pop. ort.']}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="patient" fill="#6366f1" name="Bu hasta" radius={[2, 2, 0, 0]} />
              {hasPopulationOverlay(selectedModel, populationAttention) && (
                <Line
                  type="monotone"
                  dataKey="population"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="Test seti ort. (Faz 7)"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          <p className="text-[11px] text-gray-400 mt-2">
            {importanceFootnote(activeModel)}
          </p>
        </>
      )}
    </div>
  )
}

/** Model ozet satiri: risk + yontem rozeti. */
function ModelSummaryRow({
  model,
  methodLabel,
}: {
  model: WindowModelResult
  methodLabel: { text: string; className: string } | null
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <MiniStat label="Model" value={model.model_name} />
      <MiniStat label="Risk (seri)" value={`${(model.risk_score * 100).toFixed(1)}%`} />
      <MiniStat label="Alarm" value={model.alert ? 'Evet' : 'Hayır'} />
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50/80 dark:bg-gray-800/40">
        <p className="text-[10px] uppercase tracking-wide text-gray-500">Yöntem</p>
        {methodLabel ? (
          <span className={clsx('inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', methodLabel.className)}>
            {methodLabel.text}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </div>
    </div>
  )
}

/** Mini istatistik karti. */
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50/80 dark:bg-gray-800/40">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold mt-0.5 tabular-nums">{value}</p>
    </div>
  )
}

/** importance_method alanina gore rozet metni uretir. */
function methodBadge(model: WindowModelResult | null) {
  if (!model?.importance_method) return null
  if (model.importance_method === 'attention') {
    return {
      text: 'Attention ağırlığı',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    }
  }
  return {
    text: 'Gradient saliency',
    className: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  }
}

/** Populasyon ort. cizgisi gosterilecek mi kontrol eder. */
function hasPopulationOverlay(
  modelId: string,
  populationAttention: Partial<Record<'bigru_attn' | 'transformer', AttentionSummary>>,
): boolean {
  if (modelId === 'bigru_attn') return Boolean(populationAttention.bigru_attn?.mean?.length)
  if (modelId === 'transformer') return Boolean(populationAttention.transformer?.mean?.length)
  return false
}

/** Gradient saliency gerektiren DL modeli mi kontrol eder. */
function isGradientModel(modelId: string): boolean {
  return modelId === 'lstm' || modelId === 'gru' || modelId === 'transformer'
}

/**
 * Aciklama grafigi bos oldugunda kullaniciya model bazli mesaj dondurur.
 */
function explainUnavailableMessage(
  modelId: string,
  model: WindowModelResult | null,
): string {
  if (modelId === 'bigru_attn') {
    return 'BiGRU attention ağırlıkları alınamadı. DL modeli yüklenmemiş veya tahmin başarısız olmuş olabilir.'
  }
  if (isGradientModel(modelId) && model && model.risk_score > 0) {
    return 'Gradient saliency bu ortamda devre dışı; risk skoru hesaplandı ancak zaman adımı açıklaması üretilemedi.'
  }
  if (isGradientModel(modelId)) {
    return 'Bu model için gradient saliency açıklaması üretilemedi.'
  }
  return 'Bu model için açıklama üretilemedi.'
}

/** Alt bilgi notu metnini dondurur. */
function importanceFootnote(model: WindowModelResult): string {
  if (model.importance_method === 'attention') {
    return 'Turuncu cizgi: Faz 7 test seti pozitif orneklerinde hesaplanan ortalama attention (referans).'
  }
  if (model.importance_method === 'gradient') {
    return 'Gradient saliency: risk skorunun her saate olan duyarlılığı (LSTM/GRU son timestep okuma; Transformer CLS).'
  }
  return ''
}
