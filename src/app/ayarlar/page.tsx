'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  ServerIcon,
  PaintBrushIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

/**
 * Ayarlar Sayfası
 * 
 * Sistem konfigürasyonu ve tercihler.
 */

export default function AyarlarPage() {
  const [settings, setSettings] = useState({
    // Alarm Ayarları
    alarmThreshold: 0.4,
    alarmSnooze: 6,
    notificationsEnabled: true,
    emailAlerts: true,
    soundAlerts: false,

    // Model Ayarları
    defaultModel: 'GRU',
    predictionHorizon: 6,
    autoRefresh: true,
    refreshInterval: 60,

    // UI Ayarları
    darkMode: false,
    language: 'tr',
    chartAnimations: true,

    // Güvenlik
    sessionTimeout: 30,
    requireApproval: true,
  })

  const handleSave = () => {
    // API çağrısı simülasyonu
    toast.success('Ayarlar kaydedildi!')
  }

  const handleReset = () => {
    setSettings({
      alarmThreshold: 0.4,
      alarmSnooze: 6,
      notificationsEnabled: true,
      emailAlerts: true,
      soundAlerts: false,
      defaultModel: 'GRU',
      predictionHorizon: 6,
      autoRefresh: true,
      refreshInterval: 60,
      darkMode: false,
      language: 'tr',
      chartAnimations: true,
      sessionTimeout: 30,
      requireApproval: true,
    })
    toast.success('Ayarlar sıfırlandı!')
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
            Ayarlar
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sistem konfigürasyonu ve tercihler
          </p>
        </div>

        <div className="space-y-6">
          {/* Alarm Ayarları */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center mb-4">
              <BellIcon className="w-5 h-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold">Alarm Ayarları</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alarm Eşiği (Risk Skoru)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.alarmThreshold}
                    onChange={(e) =>
                      setSettings({ ...settings, alarmThreshold: parseFloat(e.target.value) })
                    }
                    className="flex-1"
                  />
                  <span className="font-mono font-semibold w-16 text-right">
                    {(settings.alarmThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Bu değerin üzerindeki risk skorları alarm tetikler
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alarm Snooze Süresi (saat)
                </label>
                <select
                  value={settings.alarmSnooze}
                  onChange={(e) =>
                    setSettings({ ...settings, alarmSnooze: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                >
                  <option value={1}>1 saat</option>
                  <option value={2}>2 saat</option>
                  <option value={4}>4 saat</option>
                  <option value={6}>6 saat</option>
                  <option value={12}>12 saat</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notificationsEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, notificationsEnabled: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm">Bildirimler aktif</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.emailAlerts}
                    onChange={(e) =>
                      setSettings({ ...settings, emailAlerts: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm">E-posta uyarıları gönder</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.soundAlerts}
                    onChange={(e) =>
                      setSettings({ ...settings, soundAlerts: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm">Sesli uyarılar</span>
                </label>
              </div>
            </div>
          </motion.div>

          {/* Model Ayarları */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center mb-4">
              <ServerIcon className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-semibold">Model Ayarları</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Varsayılan Model
                </label>
                <select
                  value={settings.defaultModel}
                  onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                >
                  <option value="Lojistik Regresyon">Lojistik Regresyon</option>
                  <option value="XGBoost">XGBoost</option>
                  <option value="GRU">GRU (Önerilen)</option>
                  <option value="LSTM">LSTM</option>
                  <option value="Transformer">Transformer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tahmin Ufku (saat)
                </label>
                <select
                  value={settings.predictionHorizon}
                  onChange={(e) =>
                    setSettings({ ...settings, predictionHorizon: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                >
                  <option value={2}>2 saat</option>
                  <option value={4}>4 saat</option>
                  <option value={6}>6 saat (Önerilen)</option>
                  <option value={8}>8 saat</option>
                  <option value={10}>10 saat</option>
                  <option value={12}>12 saat</option>
                </select>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.autoRefresh}
                    onChange={(e) => setSettings({ ...settings, autoRefresh: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Otomatik yenileme</span>
                </label>
                {settings.autoRefresh && (
                  <div className="mt-2">
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Yenileme aralığı (saniye)
                    </label>
                    <input
                      type="number"
                      value={settings.refreshInterval}
                      onChange={(e) =>
                        setSettings({ ...settings, refreshInterval: parseInt(e.target.value) })
                      }
                      className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                      min={30}
                      max={300}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* UI Ayarları */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="flex items-center mb-4">
              <PaintBrushIcon className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold">Görünüm Ayarları</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dil
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.darkMode}
                    onChange={(e) => setSettings({ ...settings, darkMode: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Karanlık mod</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.chartAnimations}
                    onChange={(e) =>
                      setSettings({ ...settings, chartAnimations: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm">Grafik animasyonları</span>
                </label>
              </div>
            </div>
          </motion.div>

          {/* Güvenlik Ayarları */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <div className="flex items-center mb-4">
              <ShieldCheckIcon className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold">Güvenlik</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Oturum Zaman Aşımı (dakika)
                </label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) =>
                    setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })
                  }
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                  min={10}
                  max={120}
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.requireApproval}
                    onChange={(e) =>
                      setSettings({ ...settings, requireApproval: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm">Klinik onay gerektir (yüksek riskli hastalar)</span>
                </label>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              className="btn-primary flex items-center"
            >
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              Kaydet
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReset}
              className="btn-secondary"
            >
              Varsayılana Dön
            </motion.button>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  )
}

