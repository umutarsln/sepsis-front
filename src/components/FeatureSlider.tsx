'use client'

import { ChangeEvent } from 'react'
import clsx from 'clsx'

/**
 * Tek bir feature için klinik aralık göstergeli slider.
 *
 * Slider track'inin üstünde "normal aralık" yeşil bant olarak gösterilir;
 * mevcut değer rozette anlık olarak güncellenir.
 */

export interface FeatureSliderRange {
  min: number
  max: number
  normal_low: number
  normal_high: number
  unit: string
}

interface FeatureSliderProps {
  feature: string
  label: string
  value: number
  range: FeatureSliderRange
  step?: number
  onChange: (next: number) => void
}

/**
 * Klinik makul slider — değer normal aralık içinde mi yoksa dışında mı,
 * görsel olarak da gösterir.
 *
 * @param props - feature anahtarı, etiket, mevcut değer, klinik aralık ve onChange handler
 */
export default function FeatureSlider({
  feature,
  label,
  value,
  range,
  step,
  onChange,
}: FeatureSliderProps) {
  const span = range.max - range.min || 1
  const normalLowPct = ((range.normal_low - range.min) / span) * 100
  const normalWidthPct = ((range.normal_high - range.normal_low) / span) * 100

  const inNormal = value >= range.normal_low && value <= range.normal_high
  const isExtreme =
    value < range.normal_low - (range.normal_high - range.normal_low) * 0.5 ||
    value > range.normal_high + (range.normal_high - range.normal_low) * 0.5

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value))
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={`slider-${feature}`}
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          <span className="ml-2 text-xs text-gray-400">
            ({range.normal_low}–{range.normal_high} {range.unit})
          </span>
        </label>
        <span
          className={clsx(
            'inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md tabular-nums',
            inNormal
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : isExtreme
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
          )}
        >
          {value.toFixed(step && step < 1 ? 1 : 0)} {range.unit}
        </span>
      </div>

      <div className="relative h-6">
        {/* Normal aralık şeridi (yeşil) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-green-200 dark:bg-green-700/40"
          style={{ left: `${normalLowPct}%`, width: `${normalWidthPct}%` }}
        />
        <input
          id={`slider-${feature}`}
          type="range"
          min={range.min}
          max={range.max}
          step={step ?? 1}
          value={value}
          onChange={handleChange}
          className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer
                     [&::-webkit-slider-runnable-track]:h-2
                     [&::-webkit-slider-runnable-track]:rounded-full
                     [&::-webkit-slider-runnable-track]:bg-gray-200
                     [&::-webkit-slider-runnable-track]:dark:bg-gray-700
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-blue-600
                     [&::-webkit-slider-thumb]:border-2
                     [&::-webkit-slider-thumb]:border-white
                     [&::-webkit-slider-thumb]:shadow-md
                     [&::-webkit-slider-thumb]:-mt-1
                     [&::-moz-range-thumb]:w-4
                     [&::-moz-range-thumb]:h-4
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-blue-600
                     [&::-moz-range-thumb]:border-2
                     [&::-moz-range-thumb]:border-white"
        />
      </div>
    </div>
  )
}
