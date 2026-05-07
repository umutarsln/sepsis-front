'use client'

import { useEffect, useState } from 'react'

/**
 * Özellik önem sıralaması bileşeni
 * 
 * SHAP veya Integrated Gradients değerlerini gösterir.
 */
interface FeatureImportanceProps {
  patientId: string
}

interface Feature {
  feature: string
  contribution: number
}

export default function FeatureImportance({ patientId }: FeatureImportanceProps) {
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchFeatures = async () => {
      // TODO: Gerçek API çağrısı
      // const response = await fetch(`/api/features/${patientId}`)
      // const data = await response.json()
      
      // Mock data
      const mockFeatures: Feature[] = [
        { feature: 'Laktat', contribution: 0.28 },
        { feature: 'Nabız', contribution: 0.22 },
        { feature: 'Ateş', contribution: 0.18 },
        { feature: 'WBC', contribution: 0.15 },
        { feature: 'Solunum Hızı', contribution: 0.12 },
        { feature: 'MAP', contribution: 0.05 },
      ]
      
      setFeatures(mockFeatures)
      setLoading(false)
    }
    
    fetchFeatures()
  }, [patientId])
  
  if (loading) {
    return <div className="text-center py-4">Yükleniyor...</div>
  }
  
  // Maksimum katkı değerini bul (bar genişliği için)
  const maxContribution = Math.max(...features.map(f => f.contribution))
  
  return (
    <div className="space-y-3">
      {features.map((feature, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {feature.feature}
            </span>
            <span className="text-gray-500">
              {(feature.contribution * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${(feature.contribution / maxContribution) * 100}%` }}
            />
          </div>
        </div>
      ))}
      
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          💡 Bu değerler, modelin tahmininde en çok etkili olan faktörleri gösterir.
          Yüksek katkı = daha fazla risk etkisi.
        </p>
      </div>
    </div>
  )
}

