import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'

/**
 * Hasta kartı bileşeni
 * 
 * Hasta listesinde gösterilecek özet bilgileri içerir.
 */
interface PatientCardProps {
  patient: {
    id: string
    name: string
    age: number
    risk_level: 'low' | 'medium' | 'high' | 'critical'
    alert: boolean
    risk_scores: Record<number, number>
  }
  isSelected: boolean
  onClick: () => void
}

export default function PatientCard({ patient, isSelected, onClick }: PatientCardProps) {
  // En yüksek risk skorunu al
  const maxRisk = Math.max(...Object.values(patient.risk_scores))
  
  return (
    <div
      onClick={onClick}
      className={clsx(
        'p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md',
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {patient.name}
          </h3>
          <p className="text-sm text-gray-500">ID: {patient.id}</p>
        </div>
        {patient.alert && (
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
        )}
      </div>
      
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-500">
          Yaş: {patient.age}
        </span>
        <span className={clsx('badge', `badge-${patient.risk_level}`)}>
          {(maxRisk * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  )
}

