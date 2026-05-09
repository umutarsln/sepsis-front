/**
 * API Client
 * 
 * Backend API ile iletişim için utility fonksiyonları.
 */

/**
 * API base URL değerini normalize eder.
 *
 * Boş veya undefined değerlerde varsayılan URL'i kullanır, sondaki "/" karakterini kaldırır.
 */
function normalizeApiBaseUrl(
  rawValue: string | undefined,
  fallback: string
): string {
  const value = (rawValue ?? '').trim();
  if (!value) return fallback;
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL,
  '/api'
);

/**
 * API response wrapper
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Dataset Operations
 */
export const datasetAPI = {
  /**
   * Veri seti yükle
   */
  upload: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/upload/data`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Upload failed');
    }
    
    return response.json();
  },
  
  /**
   * Tüm veri setlerini listele
   */
  list: async (): Promise<any[]> => {
    return apiRequest<any[]>('/datasets');
  },
};

/**
 * Training Operations
 */
export const trainingAPI = {
  /**
   * Eğitim yapılandırması oluştur
   */
  configure: async (config: {
    dataset_id: string;
    model_type: string;
    horizon: number;
    metrics?: string[];
    test_size?: number;
  }): Promise<{ job_id: string }> => {
    return apiRequest<{ job_id: string }>('/training/configure', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },
  
  /**
   * Eğitimi başlat
   */
  start: async (jobId: string): Promise<{ message: string; job_id: string }> => {
    return apiRequest<{ message: string; job_id: string }>(`/training/start/${jobId}`, {
      method: 'POST',
    });
  },
  
  /**
   * Eğitim durumunu al
   */
  getStatus: async (jobId: string): Promise<any> => {
    return apiRequest<any>(`/training/status/${jobId}`);
  },
  
  /**
   * Eğitim loglarını al
   */
  getLogs: async (jobId: string, limit: number = 100): Promise<{ job_id: string; logs: string[] }> => {
    return apiRequest<{ job_id: string; logs: string[] }>(`/training/logs/${jobId}?limit=${limit}`);
  },
  
  /**
   * Aktif eğitimleri al
   */
  getActiveJobs: async (): Promise<any[]> => {
    return apiRequest<any[]>('/training/active');
  },
  
  /**
   * Eğitim istatistiklerini al
   */
  getStats: async (): Promise<any> => {
    return apiRequest<any>('/training/stats');
  },
};

/**
 * Results Operations
 */
export const resultsAPI = {
  /**
   * Eğitim sonuçlarını al
   */
  getResults: async (jobId: string): Promise<any> => {
    return apiRequest<any>(`/results/${jobId}`);
  },
  
  /**
   * Görselleştirmeleri al
   */
  getVisualizations: async (jobId: string): Promise<any[]> => {
    return apiRequest<any[]>(`/results/${jobId}/visualizations`);
  },
};

/**
 * Health Check
 */
export const healthAPI = {
  check: async (): Promise<{ status: string; model_loaded: boolean; version: string }> => {
    return apiRequest<{ status: string; model_loaded: boolean; version: string }>('/health');
  },
};

/**
 * Model Operations
 */
export const modelsAPI = {
  /**
   * Eğitilmiş modelleri listele
   */
  list: async (): Promise<any[]> => {
    return apiRequest<any[]>('/models');
  },
};

/**
 * Snapshot Simulator Operations
 *
 * Tek-anlık (snapshot) tahmin akışı için kullanılan endpoint'ler.
 */
export interface PatientPreset {
  preset_id: string;
  label: string;
  risk_band: 'low' | 'medium' | 'high';
  description: string;
  gender: string;
  features: Record<string, number>;
}

export interface ModelDescriptor {
  model_id: string;
  label: string;
  category: string;
  auroc: number;
  threshold: number;
  is_live: boolean;
  note: string | null;
}

export interface SnapshotModelResult {
  model_id: string;
  label: string;
  category: string;
  auroc: number;
  threshold: number;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  alert: boolean;
}

export interface TopFeatureContribution {
  feature: string;
  raw_value: number;
  importance: number;
}

export interface SnapshotPredictionResponse {
  timestamp: string;
  results: SnapshotModelResult[];
  top_features: TopFeatureContribution[];
}

/**
 * Faz 7: XGBoost SHAP local feature contribution (tek hasta).
 * Simulator sayfasında "Açıkla" butonu ile çağrılır.
 */
export interface ShapContribution {
  feature: string;
  shap_value: number;
  abs_shap: number;
  /** abs_shap / sum(abs_shap) * 100 — normalize yüzde */
  pct_contribution: number;
}

export interface SnapshotExplainResponse {
  models: Array<{
    model_id: string;
    model_name: string;
    risk_score: number;
    alert: boolean;
    threshold: number;
  }>;
  shap_top5: ShapContribution[] | null;
}

/**
 * Faz 7: SHAP global ranking satırı (sepsis-son backend'den).
 */
export interface ShapRankingRow {
  feature: string;
  mean_abs_shap: number;
  rank: number;
}

/**
 * Faz 7: Attention timestep özeti (sepsis-son backend'den).
 */
export interface AttentionSummary {
  mean: number[];
  iqr_lo: number[];
  iqr_hi: number[];
  n_samples: number;
  top3_hours: number[];
}

export interface FeatureRange {
  min: number;
  max: number;
  normal_low: number;
  normal_high: number;
  unit: string;
}

export interface FeatureStats {
  feature_order: string[];
  log_transform_cols: string[];
  scale_cols: string[];
  scaler_stats: Record<string, { mean: number; std: number }>;
  clinical_ranges: Record<string, FeatureRange>;
  source?: string;
}

export const simulatorAPI = {
  /** Hazır hasta presetlerini getirir. */
  getPresets: async (): Promise<PatientPreset[]> =>
    apiRequest<PatientPreset[]>('/patients/presets'),

  /** Canlı + display-only model meta verilerini getirir. */
  getModelDescriptors: async (): Promise<ModelDescriptor[]> =>
    apiRequest<ModelDescriptor[]>('/models/descriptors'),

  /** Slider sınırları ve klinik aralıklar için feature_stats. */
  getFeatureStats: async (): Promise<FeatureStats> =>
    apiRequest<FeatureStats>('/preprocessing/feature-stats'),

  /** Snapshot için multi-model tahmin yapar. */
  predictSnapshot: async (
    features: Record<string, number>,
    gender: string,
    modelIds?: string[],
  ): Promise<SnapshotPredictionResponse> =>
    apiRequest<SnapshotPredictionResponse>('/predict/snapshot', {
      method: 'POST',
      body: JSON.stringify({
        features,
        gender,
        model_ids: modelIds ?? null,
      }),
    }),

  /**
   * Faz 7: Snapshot tahmin + XGBoost SHAP top-5.
   * Sadece "Açıkla" butonuna basıldığında çağrılır (slider hareketi değil).
   */
  explainSnapshot: async (
    features: Record<string, number>,
    gender: string,
  ): Promise<SnapshotExplainResponse> =>
    apiRequest<SnapshotExplainResponse>('/predict/snapshot/explain', {
      method: 'POST',
      body: JSON.stringify({ features, gender }),
    }),
};


/**
 * Artifact Servis Operations
 *
 * Eğitim sonrası üretilmiş CSV/JSON dosyalarını servis eder.
 */
export interface VersionComparisonRow {
  group: string;
  legend: string;
  model: string;
  test_auroc: number | null;
  test_auprc: number | null;
  test_f1: number | null;
  test_sensitivity: number | null;
  test_specificity: number | null;
  test_ppv: number | null;
  sens_at_target_spec: number | null;
  train_seconds: number | null;
  n_features: number | null;
}

export interface DLSummaryRow {
  scenario: string;
  label: string;
  model: string;
  coverage: number;
  n_test_windows: number;
  test_auroc: number;
  auroc_lo: number;
  auroc_hi: number;
  test_auprc: number;
  test_f1: number;
  sens_at_spec85: number;
  train_seconds: number;
}

export interface ClinicalEvalRow {
  model: string;
  auroc_mean: number;
  auroc_lo: number;
  auroc_hi: number;
  auprc_mean: number;
  auprc_lo: number;
  auprc_hi: number;
  ece_before: number;
  ece_after_isotonic: number;
}

export interface LeadTimeSummary {
  n_positive_patients: number;
  n_detected: number;
  detection_rate: number;
  n_early_alarm: number;
  early_alarm_rate: number;
  median_lead_time_hours: number;
  mean_lead_time_hours: number;
  q25_lead_time: number;
  q75_lead_time: number;
  version: string;
  threshold_at_spec85: number;
}

export interface FeatureRankingRow {
  feature: string;
  importance: number;
}

export const artifactsAPI = {
  getVersionComparison: async (): Promise<VersionComparisonRow[]> =>
    apiRequest<VersionComparisonRow[]>('/artifacts/version-comparison'),

  getDlSummary: async (): Promise<DLSummaryRow[]> =>
    apiRequest<DLSummaryRow[]>('/artifacts/dl-summary'),

  getClinicalSummary: async (): Promise<ClinicalEvalRow[]> =>
    apiRequest<ClinicalEvalRow[]>('/artifacts/clinical-summary'),

  getLeadTime: async (): Promise<LeadTimeSummary> =>
    apiRequest<LeadTimeSummary>('/artifacts/lead-time'),

  getFeatureRanking: async (modelName: string): Promise<FeatureRankingRow[]> =>
    apiRequest<FeatureRankingRow[]>(`/artifacts/feature-ranking/${modelName}`),

  /** Whitelist'li PNG için tam URL döndürür (img src için). */
  figureUrl: (name: string): string => `${API_BASE_URL}/artifacts/figure/${name}`,

  /** LIME HTML için tam URL döndürür (iframe src için). */
  limeUrl: (idx: number): string => `${API_BASE_URL}/artifacts/lime/${idx}`,

  /**
   * Faz 7: Sepsis-son backend'inden SHAP global ranking (whitelist korumalı).
   * model_id: 'xgboost' | 'random_forest' | 'logistic_regression'
   */
  getShapSummary: async (modelId: string): Promise<ShapRankingRow[]> =>
    apiRequest<ShapRankingRow[]>(`/artifacts/shap-summary/${modelId}`),

  /**
   * Faz 7: Sepsis-son backend'inden attention timestep özeti.
   * model_id: 'bigru_attn' | 'transformer'
   */
  getAttention: async (modelId: string): Promise<AttentionSummary> =>
    apiRequest<AttentionSummary>(`/artifacts/attention/${modelId}`),
};


/**
 * Complete API
 */
export const api = {
  dataset: datasetAPI,
  training: trainingAPI,
  results: resultsAPI,
  health: healthAPI,
  models: modelsAPI,
  simulator: simulatorAPI,
  artifacts: artifactsAPI,
};

