'use client'

import { useState } from 'react'
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
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline'

/**
 * Veri Analizi Sayfası
 * 
 * Veri setinin istatistikleri ve görselleştirmeleri.
 */

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

export default function AnalizPage() {
  const [timeRange, setTimeRange] = useState('30d')

  // Mock istatistikler
  const stats = [
    {
      name: 'Toplam Hasta',
      value: '1,234',
      change: '+12.5%',
      icon: UsersIcon,
      color: 'blue',
    },
    {
      name: 'Sepsis Vakaları',
      value: '87',
      change: '-5.2%',
      icon: ExclamationCircleIcon,
      color: 'red',
    },
    {
      name: 'Ortalama ICU Süresi',
      value: '4.2 gün',
      change: '+0.8 gün',
      icon: ClockIcon,
      color: 'green',
    },
    {
      name: 'Algılama Oranı',
      value: '76.2%',
      change: '+3.1%',
      icon: ChartBarIcon,
      color: 'purple',
    },
  ]

  // Yaş dağılımı
  const ageDistribution = [
    { age: '18-30', count: 142 },
    { age: '31-45', count: 287 },
    { age: '46-60', count: 423 },
    { age: '61-75', count: 298 },
    { age: '76+', count: 84 },
  ]

  // Zaman serisi - günlük hasta sayısı
  const timeSeriesData = [
    { day: 'Pzt', count: 45, sepsis: 3 },
    { day: 'Sal', count: 52, sepsis: 4 },
    { day: 'Çar', count: 48, sepsis: 2 },
    { day: 'Per', count: 61, sepsis: 5 },
    { day: 'Cum', count: 55, sepsis: 4 },
    { day: 'Cmt', count: 42, sepsis: 2 },
    { day: 'Paz', count: 38, sepsis: 1 },
  ]

  // ICU tipi dağılımı
  const icuTypeData = [
    { name: 'Medical ICU', value: 45 },
    { name: 'Surgical ICU', value: 30 },
    { name: 'Cardiac Surgery', value: 15 },
    { name: 'Trauma ICU', value: 10 },
  ]

  // Özellik eksiklik oranları
  const missingnessData = [
    { feature: 'Laktat', missing: 42 },
    { feature: 'Kreatinin', missing: 28 },
    { feature: 'WBC', missing: 15 },
    { feature: 'Nabız', missing: 5 },
    { feature: 'Ateş', missing: 3 },
  ]

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
            Veri Analizi
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Veri seti istatistikleri ve görselleştirmeleri
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex space-x-2">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {range === '7d' && '7 Gün'}
              {range === '30d' && '30 Gün'}
              {range === '90d' && '90 Gün'}
              {range === '1y' && '1 Yıl'}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {stats.map((stat, index) => {
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.name}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stat.value}
                    </p>
                    <p className={`text-sm mt-1 ${
                      stat.change.startsWith('+') 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {stat.change}
                    </p>
                  </div>
                  <div className={`p-3 bg-${stat.color}-100 dark:bg-${stat.color}-900/20 rounded-lg`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Yaş Dağılımı */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <h3 className="text-lg font-semibold mb-4">Yaş Dağılımı</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="age" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* ICU Tipi Dağılımı */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <h3 className="text-lg font-semibold mb-4">ICU Tipi Dağılımı</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={icuTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {icuTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Günlük Hasta Akışı */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <h3 className="text-lg font-semibold mb-4">Günlük Hasta Akışı</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Toplam Hasta"
                />
                <Line 
                  type="monotone" 
                  dataKey="sepsis" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Sepsis Vakası"
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Eksiklik Analizi */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="card"
          >
            <h3 className="text-lg font-semibold mb-4">Özellik Eksiklik Oranları (%)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={missingnessData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="feature" type="category" />
                <Tooltip />
                <Bar dataKey="missing" fill="#f59e0b" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Veri Kalitesi Özeti */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card"
        >
          <h3 className="text-lg font-semibold mb-4">Veri Kalitesi Özeti</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Eksiksiz Kayıtlar</p>
              <p className="text-2xl font-bold text-green-600 mt-1">78.4%</p>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Kısmi Eksik</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">18.2%</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Yüksek Eksik</p>
              <p className="text-2xl font-bold text-red-600 mt-1">3.4%</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}

