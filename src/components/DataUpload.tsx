'use client'

import { useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { 
  DocumentArrowUpIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'

/**
 * Veri Yükleme Bileşeni
 * 
 * Drag-and-drop file upload ile veri seti yükleme.
 */
export default function DataUpload({ onDatasetUploaded }: { onDatasetUploaded?: (dataset: any) => void }) {
  const [uploading, setUploading] = useState(false)
  const [uploadedDataset, setUploadedDataset] = useState<any>(null)
  const [datasets, setDatasets] = useState<any[]>([])
  const [loadingDatasets, setLoadingDatasets] = useState(false)

  // Datasets listesini yükle
  const loadDatasets = async () => {
    setLoadingDatasets(true)
    try {
      const data = await api.dataset.list()
      setDatasets(data)
    } catch (error) {
      console.error('Failed to load datasets:', error)
      toast.error('Veri setleri yüklenemedi')
    } finally {
      setLoadingDatasets(false)
    }
  }

  // İlk yüklemede listeyi getir
  useEffect(() => {
    void loadDatasets()
  }, [])

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setUploading(true)

    try {
      const result = await api.dataset.upload(file)
      
      setUploadedDataset(result)
      toast.success(`Veri seti başarıyla yüklendi! ${result.rows} satır`)
      
      // Callback çağır
      if (onDatasetUploaded) {
        onDatasetUploaded(result)
      }
      
      // Listeyi yenile
      await loadDatasets()
      
    } catch (error: any) {
      console.error('Upload failed:', error)
      toast.error(error.message || 'Yükleme başarısız')
    } finally {
      setUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
      'application/parquet': ['.parquet'],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  // Dosya boyutu formatla
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 cursor-pointer transition-all
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <motion.div
            animate={{ scale: uploading ? 0.95 : 1 }}
            transition={{ repeat: uploading ? Infinity : 0, duration: 1 }}
          >
            <DocumentArrowUpIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          </motion.div>
          
          {uploading ? (
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
              Yükleniyor...
            </p>
          ) : isDragActive ? (
            <p className="text-lg font-medium text-blue-600">
              Dosyayı bırakın
            </p>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dosya sürükleyip bırakın veya tıklayın
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                CSV, Excel, JSON veya Parquet formatı
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Result */}
      {uploadedDataset && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700"
        >
          <div className="flex items-start">
            <CheckCircleIcon className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Yükleme Tamamlandı
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Dataset ID</p>
                  <p className="font-mono font-medium">{uploadedDataset.dataset_id}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Satır Sayısı</p>
                  <p className="font-medium">{uploadedDataset.rows.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Sütun Sayısı</p>
                  <p className="font-medium">{uploadedDataset.columns.length}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Eksik Veri</p>
                  <p className="font-medium">{uploadedDataset.missing_percentage.toFixed(1)}%</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  İlk 10 sütun: {uploadedDataset.columns.slice(0, 10).join(', ')}{uploadedDataset.columns.length > 10 ? '...' : ''}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sample Data Table */}
      {uploadedDataset && uploadedDataset.sample_data && uploadedDataset.sample_data.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h4 className="font-semibold mb-4">Örnek Veri (İlk 5 Satır)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {Object.keys(uploadedDataset.sample_data[0]).map((col) => (
                    <th
                      key={col}
                      className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50"
                    >
                      {col.length > 15 ? `${col.substring(0, 15)}...` : col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploadedDataset.sample_data.map((row: any, idx: number) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    {Object.values(row).map((val: any, valIdx: number) => (
                      <td key={valIdx} className="py-2 px-3 text-gray-600 dark:text-gray-400">
                        {val !== null && val !== undefined ? String(val) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Datasets List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Yüklenmiş Veri Setleri</h3>
          <button
            onClick={loadDatasets}
            disabled={loadingDatasets}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {loadingDatasets ? 'Yenileniyor...' : 'Yenile'}
          </button>
        </div>

        {datasets.length === 0 ? (
          <div className="text-center py-8">
            <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400">
              Henüz veri seti yüklenmedi
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {datasets.map((dataset) => (
              <motion.div
                key={dataset.dataset_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{dataset.filename}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatFileSize(dataset.size_mb * 1024 * 1024)} • {dataset.rows?.toLocaleString() || 'N/A'} satır
                  </p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(dataset.uploaded_at).toLocaleDateString('tr-TR')}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

