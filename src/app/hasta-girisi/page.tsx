'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { 
  UserIcon, 
  BeakerIcon, 
  HeartIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'

/**
 * Hasta Girişi Sayfası
 * 
 * Yeni hasta verisi girişi ve risk tahmini.
 */

export default function HastaGirisiPage() {
  const [loading, setLoading] = useState(false)
  const [predictions, setPredictions] = useState<any[]>([])
  const [availableModels, setAvailableModels] = useState<any[]>([])
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  // Load available models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await api.models.list()
        setAvailableModels(models)
      } catch (error) {
        console.error('Failed to load models:', error)
      }
    }
    void loadModels()
  }, [])

  // Form state
  const [demographics, setDemographics] = useState({
    age: '',
    gender: 'Erkek',
    icu_type: 'Medical ICU',
  })

  const [vitals, setVitals] = useState({
    heart_rate: '',
    respiratory_rate: '',
    temperature: '',
    sbp: '',
    dbp: '',
    spo2: '',
  })

  const [labs, setLabs] = useState({
    wbc: '',
    lactate: '',
    creatinine: '',
    bilirubin: '',
    platelets: '',
    glucose: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedModels.length === 0) {
      toast.error('Lütfen en az bir model seçin!')
      return
    }
    
    setLoading(true)

    try {
      // Mock patient data - TODO: gerçek form verisinden oluştur
      const patientData = {
        patient_id: `p${Date.now()}`,
        timestamps: ['2024-01-01T10:00:00'],
        features: {
          'HR': [parseFloat(vitals.heart_rate) || 80],
          'Resp': [parseFloat(vitals.respiratory_rate) || 18],
          'Temp': [parseFloat(vitals.temperature) || 37.0],
          'WBC': [parseFloat(labs.wbc) || 8.0],
          'Lactate': [parseFloat(labs.lactate) || 1.0],
        }
      }

      // Multi-model prediction API call
      const results = await fetch('/api/predict/multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_data: patientData,
          model_ids: selectedModels
        })
      })

      const data = await results.json()
      setPredictions(data)
      setLoading(false)
      toast.success(`${data.length} model ile tahmin yapıldı!`)
    } catch (error) {
      console.error('Prediction failed:', error)
      toast.error('Tahmin başarısız!')
      setLoading(false)
    }
  }

  const handleReset = () => {
    setDemographics({ age: '', gender: 'Erkek', icu_type: 'Medical ICU' })
    setVitals({
      heart_rate: '',
      respiratory_rate: '',
      temperature: '',
      sbp: '',
      dbp: '',
      spo2: '',
    })
    setLabs({
      wbc: '',
      lactate: '',
      creatinine: '',
      bilirubin: '',
      platelets: '',
      glucose: '',
    })
    setPredictions([])
    setSelectedModels([])
    toast.success('Form sıfırlandı')
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Hasta Girişi
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Yeni hasta verisi girin ve sepsis risk tahmini alın
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Panel: Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Model Seçimi */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700"
              >
                <div className="flex items-center mb-4">
                  <CpuChipIcon className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold">Model Seçimi</h3>
                </div>
                
                {availableModels.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Henüz eğitilmiş model yok. Önce modeller tabından eğitim yapın.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableModels.map((model) => (
                      <label key={model.model_id} className="flex items-center p-3 bg-white dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedModels.includes(model.model_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedModels([...selectedModels, model.model_id])
                            } else {
                              setSelectedModels(selectedModels.filter(id => id !== model.model_id))
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {model.model_type.toUpperCase()} - {model.horizon}h horizon
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            AUROC: {model.metrics?.auroc?.toFixed(3) || 'N/A'} | 
                            Created: {new Date(model.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Demografik Bilgiler */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="card"
              >
                <div className="flex items-center mb-4">
                  <UserIcon className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold">Demografik Bilgiler</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Yaş
                    </label>
                    <input
                      type="number"
                      value={demographics.age}
                      onChange={(e) => setDemographics({ ...demographics, age: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      placeholder="Örn: 65"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cinsiyet
                    </label>
                    <select
                      value={demographics.gender}
                      onChange={(e) => setDemographics({ ...demographics, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    >
                      <option>Erkek</option>
                      <option>Kadın</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ICU Tipi
                    </label>
                    <select
                      value={demographics.icu_type}
                      onChange={(e) => setDemographics({ ...demographics, icu_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    >
                      <option>Medical ICU</option>
                      <option>Surgical ICU</option>
                      <option>Cardiac Surgery</option>
                      <option>Trauma ICU</option>
                    </select>
                  </div>
                </div>
              </motion.div>

              {/* Vital Signs */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="card"
              >
                <div className="flex items-center mb-4">
                  <HeartIcon className="w-5 h-5 text-red-600 mr-2" />
                  <h3 className="text-lg font-semibold">Vital Signs</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nabız (bpm)
                    </label>
                    <input
                      type="number"
                      value={vitals.heart_rate}
                      onChange={(e) => setVitals({ ...vitals, heart_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      placeholder="60-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Solunum (/dk)
                    </label>
                    <input
                      type="number"
                      value={vitals.respiratory_rate}
                      onChange={(e) => setVitals({ ...vitals, respiratory_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      placeholder="12-20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ateş (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={vitals.temperature}
                      onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      placeholder="36-38"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      SBP (mmHg)
                    </label>
                    <input
                      type="number"
                      value={vitals.sbp}
                      onChange={(e) => setVitals({ ...vitals, sbp: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      placeholder="90-140"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      DBP (mmHg)
                    </label>
                    <input
                      type="number"
                      value={vitals.dbp}
                      onChange={(e) => setVitals({ ...vitals, dbp: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      placeholder="60-90"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      SpO2 (%)
                    </label>
                    <input
                      type="number"
                      value={vitals.spo2}
                      onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      placeholder="90-100"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Laboratory Values */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="card"
              >
                <div className="flex items-center mb-4">
                  <BeakerIcon className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold">Laboratuvar Değerleri</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      WBC (K/µL)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={labs.wbc}
                      onChange={(e) => setLabs({ ...labs, wbc: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      placeholder="4-11"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Laktat (mmol/L)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={labs.lactate}
                      onChange={(e) => setLabs({ ...labs, lactate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      placeholder="0.5-2.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kreatinin (mg/dL)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={labs.creatinine}
                      onChange={(e) => setLabs({ ...labs, creatinine: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      placeholder="0.6-1.2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bilirubin (mg/dL)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={labs.bilirubin}
                      onChange={(e) => setLabs({ ...labs, bilirubin: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      placeholder="0.2-1.2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Platelet (K/µL)
                    </label>
                    <input
                      type="number"
                      value={labs.platelets}
                      onChange={(e) => setLabs({ ...labs, platelets: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      placeholder="150-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Glukoz (mg/dL)
                    </label>
                    <input
                      type="number"
                      value={labs.glucose}
                      onChange={(e) => setLabs({ ...labs, glucose: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      placeholder="70-110"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                      Hesaplanıyor...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                      Risk Tahmini Yap
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleReset}
                  className="btn-secondary"
                >
                  Sıfırla
                </motion.button>
              </div>
            </form>
          </div>

          {/* Sağ Panel: Karşılaştırmalı Sonuçlar */}
          <div className="lg:col-span-1">
            {predictions.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                {predictions.map((pred, idx) => (
                  <div key={idx} className="card sticky top-6">
                    <h3 className="text-lg font-semibold mb-2">
                      {pred.model_type.toUpperCase()}
                    </h3>
                    {pred.metrics?.auroc && (
                      <p className="text-xs text-gray-500 mb-3">
                        AUROC: {pred.metrics.auroc.toFixed(3)}
                      </p>
                    )}

                    {/* Risk Level */}
                    <div className={`p-4 rounded-lg mb-4 ${
                      pred.prediction.risk_level === 'low' 
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : pred.prediction.risk_level === 'medium'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20'
                        : 'bg-red-50 dark:bg-red-900/20'
                    }`}>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Risk Seviyesi
                      </p>
                      <p className="text-2xl font-bold capitalize">
                        {pred.prediction.risk_level === 'low' && '🟢 Düşük'}
                        {pred.prediction.risk_level === 'medium' && '🟡 Orta'}
                        {pred.prediction.risk_level === 'high' && '🔴 Yüksek'}
                      </p>
                    </div>

                    {/* Risk Scores */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Ufuk Bazlı Skorlar
                      </p>
                      <div className="space-y-2">
                        {Object.entries(pred.prediction.risk_scores).map(([horizon, score]) => (
                          <div key={horizon} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{horizon}h</span>
                            <div className="flex items-center">
                              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mr-2">
                                <div
                                  className="h-full bg-blue-600"
                                  style={{ width: `${(score as number) * 100}%` }}
                                />
                              </div>
                              <span className="font-semibold w-12 text-right">
                                {((score as number) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Confidence */}
                    {pred.prediction.confidence && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Güven
                        </p>
                        <div className="flex items-center">
                          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mr-2">
                            <div
                              className="h-full bg-purple-600"
                              style={{ width: `${pred.prediction.confidence * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold text-xs">
                            {(pred.prediction.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            ) : (
              <div className="card">
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Tahmin sonuçları burada görünecek
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  )
}

