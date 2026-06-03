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
 * API response wrapper — ag kopmasinda kisa retry uygular.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryLeft = 2,
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
    if (retryLeft > 0 && error instanceof TypeError) {
      await new Promise((r) => setTimeout(r, 600));
      return apiRequest<T>(endpoint, options, retryLeft - 1);
    }
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
  list: async (): Promise<any[]> =>
    apiRequest<any[]>('/datasets').catch(() => []),
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
   * Aktif eğitimleri al (sepsis-son backend'de yoksa bos liste).
   */
  getActiveJobs: async (): Promise<any[]> =>
    apiRequest<any[]>('/training/active').catch(() => []),

  /**
   * Eğitim istatistiklerini al (sepsis-son backend'de yoksa sifir ozet).
   */
  getStats: async (): Promise<any> =>
    apiRequest<any>('/training/stats').catch(() => ({
      completed_count: 0,
      running_count: 0,
      failed_count: 0,
      total_count: 0,
      success_rate: 0,
    })),
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
   * Canli ML modellerini listeler (sepsis-son: /models/descriptors uzerinden).
   */
  list: async (): Promise<ModelDescriptor[]> => {
    const models = await apiRequest<BackendModelDescriptor[]>('/models/descriptors')
    return models.map(mapModelDescriptor).filter((m) => m.is_live)
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
  source?: 'synthetic' | 'demo';
  patient_id?: string | null;
  sepsis?: boolean | null;
  preset_group?: 'scenario' | 'demo_real';
}

/** Snapshot tahmin ufku: 0=anlik, 6=erken uyari, 24=24s erken. */
export type SnapshotHorizon = 0 | 6 | 24;

export interface SnapshotModelMetrics {
  model_id: string;
  auroc: number;
  auprc: number;
  sens_at_spec85: number;
  f1: number;
  threshold: number;
  brier?: number | null;
  source: string;
}

export interface HorizonMetricsResponse {
  horizon: number;
  label: string;
  metrics_source: string;
  models: SnapshotModelMetrics[];
}

export interface HorizonComparisonRow {
  model_id: string;
  model_name: string;
  h0_auroc: number;
  h6_auroc: number;
  h24_auroc: number;
  h0_auprc: number;
  h6_auprc: number;
  h24_auprc: number;
}

export interface ModelDescriptor {
  model_id: string;
  label: string;
  category: string;
  auroc: number;
  auprc: number;
  threshold: number;
  is_live: boolean;
  note: string | null;
}

export interface SnapshotModelResult {
  model_id: string;
  label: string;
  category: string;
  auroc: number;
  auprc: number;
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
  /** XGBoost SHAP top-10 (geriye uyumluluk). */
  top_features: TopFeatureContribution[];
  /** Model bazli SHAP top-10 katkilari (5 ML modeli). */
  top_features_by_model: Record<string, TopFeatureContribution[]>;
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
  shap_top10: ShapContribution[] | null;
  shap_by_model: Record<string, ShapContribution[]> | null;
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

/** sepsis-son backend /predict/snapshot ham model skoru. */
interface BackendModelScore {
  model_id: string;
  model_name: string;
  risk_score: number;
  alert: boolean;
  threshold: number;
}

/** sepsis-son backend /predict/snapshot/explain ham yaniti. */
interface BackendSnapshotExplainResponse {
  models: BackendModelScore[];
  shap_top10: ShapContribution[] | null;
  shap_by_model?: Record<string, ShapContribution[]> | null;
  horizon?: number;
}

/** Ufuk bazli snapshot metrik onbellegi. */
const snapshotMetricsCache: Partial<Record<SnapshotHorizon, Record<string, SnapshotModelMetrics>>> =
  {};

/** Faz 4/4.6 yedek metrikler (API erisilemezse). */
const FALLBACK_SNAPSHOT_METRICS: Record<SnapshotHorizon, Record<string, Pick<SnapshotModelMetrics, 'auroc' | 'auprc' | 'threshold'>>> = {
  6: {
    logistic_regression: { auroc: 0.744, auprc: 0.109, threshold: 0.576 },
    random_forest: { auroc: 0.814, auprc: 0.151, threshold: 0.463 },
    xgboost: { auroc: 0.826, auprc: 0.18, threshold: 0.511 },
    gradient_boosting: { auroc: 0.822, auprc: 0.164, threshold: 0.032 },
    gaussian_nb: { auroc: 0.74, auprc: 0.072, threshold: 0.024 },
  },
  0: {
    logistic_regression: { auroc: 0.743, auprc: 0.071, threshold: 0.582 },
    random_forest: { auroc: 0.793, auprc: 0.104, threshold: 0.036 },
    xgboost: { auroc: 0.828, auprc: 0.136, threshold: 0.534 },
    gradient_boosting: { auroc: 0.827, auprc: 0.118, threshold: 0.022 },
    gaussian_nb: { auroc: 0.741, auprc: 0.047, threshold: 0.011 },
  },
  24: {
    logistic_regression: { auroc: 0.751, auprc: 0.206, threshold: 0.562 },
    random_forest: { auroc: 0.802, auprc: 0.239, threshold: 0.068 },
    xgboost: { auroc: 0.819, auprc: 0.275, threshold: 0.525 },
    gradient_boosting: { auroc: 0.82, auprc: 0.268, threshold: 0.032 },
    gaussian_nb: { auroc: 0.746, auprc: 0.156, threshold: 0.024 },
  },
};

/**
 * Backend'den ufuk bazli snapshot ML metriklerini yukler ve onbellege alir.
 */
export async function fetchSnapshotMetrics(
  horizon: SnapshotHorizon = 6,
): Promise<Record<string, SnapshotModelMetrics>> {
  if (snapshotMetricsCache[horizon]) {
    return snapshotMetricsCache[horizon]!;
  }
  const url = `${API_BASE_URL}/artifacts/snapshot-metrics?horizon=${horizon}`;
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(
        (await response.json().catch(() => ({ detail: response.statusText }))).detail ??
          response.statusText,
      );
    }
    const resp = (await response.json()) as HorizonMetricsResponse;
    const map = Object.fromEntries(resp.models.map((m) => [m.model_id, m]));
    snapshotMetricsCache[horizon] = map;
    return map;
  } catch {
    const fallback = FALLBACK_SNAPSHOT_METRICS[horizon] ?? FALLBACK_SNAPSHOT_METRICS[6];
    const map = Object.fromEntries(
      Object.entries(fallback).map(([id, m]) => [
        id,
        {
          model_id: id,
          auroc: m.auroc,
          auprc: m.auprc,
          sens_at_spec85: 0.5,
          f1: 0.15,
          threshold: m.threshold,
          source: 'fallback',
        } satisfies SnapshotModelMetrics,
      ]),
    );
    snapshotMetricsCache[horizon] = map;
    return map;
  }
}

/**
 * Snapshot explain endpoint yolunu ufka gore uretir.
 */
function snapshotExplainPath(horizon: SnapshotHorizon): string {
  return `/predict/snapshot/explain?horizon=${horizon}`;
}

/**
 * Risk skorunu (0-1) frontend risk band etiketine esler.
 */
function bandFromScore(score: number): SnapshotModelResult['risk_level'] {
  if (score < 0.2) return 'low';
  if (score < 0.4) return 'medium';
  if (score < 0.7) return 'high';
  return 'critical';
}

/**
 * Frontend features + gender girdisini backend snapshot formatina cevirir.
 */
function featuresToSnapshot(
  features: Record<string, number>,
  gender: string,
): Record<string, number> {
  const snapshot: Record<string, number> = { ...features };
  const normalized = gender.trim().toUpperCase();
  const isFemale = normalized === 'F' || normalized === 'K' || normalized.startsWith('KAD');
  snapshot.Gender_0 = isFemale ? 1 : 0;
  snapshot.Gender_1 = isFemale ? 0 : 1;
  return snapshot;
}

/**
 * SHAP katki satirlarini dashboard top_features formatina cevirir.
 */
function shapRowsToTopFeatures(
  rows: ShapContribution[],
  features: Record<string, number>,
): TopFeatureContribution[] {
  return rows.slice(0, 10).map((item) => ({
    feature: item.feature,
    raw_value: features[item.feature] ?? 0,
    importance: item.abs_shap,
  }));
}

/**
 * Backend model skorlarini dashboard'un bekledigi SnapshotPredictionResponse'a map eder.
 */
function mapSnapshotPrediction(
  raw: BackendSnapshotExplainResponse,
  features: Record<string, number>,
  modelIds?: string[],
  metricsMap?: Record<string, SnapshotModelMetrics>,
): SnapshotPredictionResponse {
  const allowed = modelIds ? new Set(modelIds) : null;
  const results: SnapshotModelResult[] = raw.models
    .filter((model) => !allowed || allowed.has(model.model_id))
    .map((model) => {
      const meta = metricsMap?.[model.model_id];
      return {
        model_id: model.model_id,
        label: model.model_name,
        category: 'ML',
        auroc: meta?.auroc ?? 0.75,
        auprc: meta?.auprc ?? 0.1,
        threshold: model.threshold,
        risk_score: model.risk_score,
        risk_level: bandFromScore(model.risk_score),
        alert: model.alert,
      };
    });

  const top_features_by_model: Record<string, TopFeatureContribution[]> = {};
  if (raw.shap_by_model) {
    for (const [modelId, rows] of Object.entries(raw.shap_by_model)) {
      if (rows?.length) {
        top_features_by_model[modelId] = shapRowsToTopFeatures(rows, features);
      }
    }
  }

  const shapRows =
    raw.shap_top10 ??
    (raw as BackendSnapshotExplainResponse & { shap_top5?: ShapContribution[] | null })
      .shap_top5 ??
    [];
  const top_features =
    top_features_by_model.xgboost ??
    (shapRows.length ? shapRowsToTopFeatures(shapRows, features) : []);

  return {
    timestamp: new Date().toISOString(),
    results,
    top_features,
    top_features_by_model,
  };
}

/** sepsis-son backend /models/descriptors ham kaydi. */
interface BackendModelDescriptor {
  model_id: string;
  model_name: string;
  family: string;
  auroc: number;
  auprc?: number;
  f1_spec85?: number;
  median_lead_h?: number | null;
}

/** Snapshot ML modelleri icin h=6 yedek esik degerleri. */
const SNAPSHOT_MODEL_THRESHOLDS: Record<string, number> = {
  logistic_regression: 0.576,
  random_forest: 0.463,
  xgboost: 0.511,
  gradient_boosting: 0.032,
  gaussian_nb: 0.024,
};

/**
 * sepsis-son backend model tanimlayicisini frontend ModelDescriptor formatina cevirir.
 */
function mapModelDescriptor(raw: BackendModelDescriptor): ModelDescriptor {
  const isLive = raw.family === 'ML';
  return {
    model_id: raw.model_id,
    label: raw.model_name,
    category: isLive ? 'Snapshot ML' : 'DL (pencere)',
    auroc: raw.auroc,
    auprc: raw.auprc ?? 0.1,
    threshold: SNAPSHOT_MODEL_THRESHOLDS[raw.model_id] ?? 0.5,
    is_live: isLive,
    note: isLive ? null : 'Snapshot tahmini desteklemez',
  };
}

/**
 * feature_stats yanitini simulatör icin guvenli FeatureStats nesnesine normalize eder.
 */
function normalizeFeatureStats(raw: Partial<FeatureStats>): FeatureStats {
  return {
    feature_order: raw.feature_order ?? [],
    log_transform_cols: raw.log_transform_cols ?? [],
    scale_cols: raw.scale_cols ?? [],
    scaler_stats: raw.scaler_stats ?? {},
    clinical_ranges: raw.clinical_ranges ?? {},
    source: raw.source,
  };
}

export const simulatorAPI = {
  /** Hazır hasta presetlerini getirir. */
  getPresets: async (): Promise<PatientPreset[]> =>
    apiRequest<PatientPreset[]>('/patients/presets'),

  /** Canlı + display-only model meta verilerini getirir. */
  getModelDescriptors: async (): Promise<ModelDescriptor[]> => {
    const raw = await apiRequest<BackendModelDescriptor[]>('/models/descriptors');
    return raw.map(mapModelDescriptor);
  },

  /** Slider sınırları ve klinik aralıklar için feature_stats. */
  getFeatureStats: async (): Promise<FeatureStats> => {
    const raw = await apiRequest<Partial<FeatureStats>>('/preprocessing/feature-stats');
    return normalizeFeatureStats(raw);
  },

  /** Snapshot için multi-model tahmin yapar. */
  predictSnapshot: async (
    features: Record<string, number>,
    gender: string,
    modelIds?: string[],
    horizon: SnapshotHorizon = 6,
  ): Promise<SnapshotPredictionResponse> => {
    const snapshot = featuresToSnapshot(features, gender);
    const metricsMap = await fetchSnapshotMetrics(horizon);
    const raw = await apiRequest<BackendSnapshotExplainResponse>(
      snapshotExplainPath(horizon),
      {
        method: 'POST',
        body: JSON.stringify({ snapshot }),
      },
    );
    return mapSnapshotPrediction(raw, features, modelIds, metricsMap);
  },

  /**
   * Faz 7: Snapshot tahmin + tum ML modelleri icin SHAP top-10.
   * Sadece "Açıkla" butonuna basıldığında çağrılır (slider hareketi değil).
   */
  explainSnapshot: async (
    features: Record<string, number>,
    gender: string,
    horizon: SnapshotHorizon = 6,
  ): Promise<SnapshotExplainResponse> => {
    const snapshot = featuresToSnapshot(features, gender);
    return apiRequest<SnapshotExplainResponse>(snapshotExplainPath(horizon), {
      method: 'POST',
      body: JSON.stringify({ snapshot }),
    });
  },
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

/** Faz 6 — 9 model (5 ML + 4 DL) karsilastirma satiri (sepsis-son backend). */
export interface Faz6ComparisonRow {
  family: string;
  model_id: string;
  model_name: string;
  auroc: number;
  auprc: number;
  sens_spec85: number;
  f1: number;
  median_lead_h: number | null;
  mean_lead_h: number | null;
}

/**
 * CSV/JSON'dan gelen sayisal alani guvenli float'a cevirir.
 */
function parseMetric(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * sepsis-son /artifacts/version-comparison satirini Faz6ComparisonRow'a map eder.
 */
function mapFaz6ComparisonRow(raw: Record<string, unknown>): Faz6ComparisonRow {
  return {
    family: String(raw.family ?? ''),
    model_id: String(raw.model_id ?? raw.model ?? ''),
    model_name: String(raw.model_name ?? raw.model_id ?? raw.model ?? ''),
    auroc: parseMetric(raw.auroc ?? raw.test_auroc),
    auprc: parseMetric(raw.auprc ?? raw.test_auprc),
    sens_spec85: parseMetric(raw.sens_spec85 ?? raw.sens_at_target_spec),
    f1: parseMetric(raw.f1 ?? raw.test_f1),
    median_lead_h:
      raw.median_lead_h != null && raw.median_lead_h !== ''
        ? parseMetric(raw.median_lead_h)
        : null,
    mean_lead_h:
      raw.mean_lead_h != null && raw.mean_lead_h !== ''
        ? parseMetric(raw.mean_lead_h)
        : null,
  };
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

export interface LimeFeatureContribution {
  feature: string;
  weight: number;
}

export type LimeModelId = 'xgboost' | 'random_forest' | 'logistic_regression';

export type LimePatientType = 'tp' | 'fp' | 'fn';

export interface LimeExplanation {
  model_id?: LimeModelId;
  patient_type: LimePatientType;
  patient_label: string;
  test_index: number;
  true_label: number;
  predicted_prob: number;
  top10_features: LimeFeatureContribution[];
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

export interface ExperimentMetrics {
  test_auroc?: number | null;
  val_auroc?: number | null;
  auprc?: number | null;
  f1?: number | null;
  sens_at_spec85?: number | null;
  brier?: number | null;
  threshold?: number | null;
}

export interface ExperimentRow {
  id: string;
  name: string;
  phase: string;
  tier?: string | null;
  status: string;
  model: string;
  model_id: string;
  model_family: string;
  params: Record<string, string | number | null>;
  metrics: ExperimentMetrics;
  duration?: string | null;
  created_at: string;
  is_final: boolean;
  notes?: string | null;
}

export interface DatasetCohortSummary {
  total_patients: number;
  set_a_patients: number;
  set_b_patients: number;
  total_rows: number;
}

export interface DatasetLabelSummary {
  sepsis_positive_patients: number;
  sepsis_negative_patients: number;
  sepsis_patient_rate_pct: number;
  sepsis_positive_rows: number;
  sepsis_row_rate_pct: number;
  onset_median_hours: number;
}

export interface DatasetLengthSummary {
  median: number;
  mean: number;
  p5: number;
  p25: number;
  p75: number;
  p95: number;
  min: number;
  max: number;
}

export interface DatasetSplitSummary {
  train_patients: number;
  val_patients: number;
  test_patients: number;
  train_sepsis_rate_pct: number;
  val_sepsis_rate_pct: number;
  test_sepsis_rate_pct: number;
  train_sepsis_patients: number;
  val_sepsis_patients: number;
  test_sepsis_patients: number;
  seed: number;
  frozen: boolean;
}

export interface DatasetMissingRow {
  feature: string;
  missing_pct: number;
  category: string;
}

export interface DatasetSummary {
  cohort: DatasetCohortSummary;
  labels: DatasetLabelSummary;
  length: DatasetLengthSummary;
  splits: DatasetSplitSummary;
  final_feature_count: number;
  features_above_80pct_missing: number;
  selected_feature_missing: DatasetMissingRow[];
  icu_length_chart: Array<{ label: string; hours: number }>;
  split_chart: Array<{
    split: string;
    patients: number;
    sepsis_patients: number;
    sepsis_rate_pct: number;
  }>;
  source_files: string[];
}

export const artifactsAPI = {
  /** Faz 6: 9 model AUROC/AUPRC/F1/lead-time karsilastirmasi. */
  getFaz6Comparison: async (): Promise<Faz6ComparisonRow[]> => {
    const raw = await apiRequest<Record<string, unknown>[]>('/artifacts/version-comparison');
    return raw.map(mapFaz6ComparisonRow);
  },

  /** Faz 4-6: tum egitim kosulari (tier ablation dahil). */
  getExperiments: async (): Promise<ExperimentRow[]> =>
    apiRequest<ExperimentRow[]>('/artifacts/experiments'),

  /** Faz 2-3: PhysioNet kohort, etiket ve split ozeti. */
  getDatasetSummary: async (): Promise<DatasetSummary> =>
    apiRequest<DatasetSummary>('/artifacts/dataset-summary'),

  getVersionComparison: async (): Promise<VersionComparisonRow[]> =>
    apiRequest<VersionComparisonRow[]>('/artifacts/version-comparison'),

  getDlSummary: async (): Promise<DLSummaryRow[]> => {
    const rows = await artifactsAPI.getFaz6Comparison();
    return rows
      .filter((r) => r.family !== 'ML')
      .map((r) => ({
        scenario: 'h6_w24',
        label: 'Faz 6 test seti',
        model: r.model_id,
        coverage: 1,
        n_test_windows: 0,
        test_auroc: r.auroc,
        auroc_lo: r.auroc,
        auroc_hi: r.auroc,
        test_auprc: r.auprc,
        test_f1: r.f1,
        sens_at_spec85: r.sens_spec85,
        train_seconds: 0,
      }));
  },

  getLeadTime: async (): Promise<LeadTimeSummary> =>
    apiRequest<LeadTimeSummary>('/artifacts/lead-time'),

  /** Ufuk bazli snapshot ML test metrikleri (Faz 4.6/4.7). */
  getSnapshotMetrics: async (horizon: SnapshotHorizon = 6): Promise<HorizonMetricsResponse> =>
    apiRequest<HorizonMetricsResponse>(`/artifacts/snapshot-metrics?horizon=${horizon}`),

  /** 5 ML model x h=0/6/24 AUROC/AUPRC karsilastirmasi. */
  getHorizonComparison: async (): Promise<HorizonComparisonRow[]> =>
    apiRequest<HorizonComparisonRow[]>('/artifacts/horizon-comparison'),

  /**
   * XGBoost global SHAP sıralaması (sepsis-son: GET /artifacts/feature-ranking).
   * modelName verilirse shap-summary fallback kullanilir.
   */
  getFeatureRanking: async (modelName?: string): Promise<FeatureRankingRow[]> => {
    if (modelName && modelName !== 'global') {
      const rows = await apiRequest<ShapRankingRow[]>(`/artifacts/shap-summary/${modelName}`);
      return rows.map((row) => ({
        feature: row.feature,
        importance: row.mean_abs_shap,
      }));
    }
    const rows = await apiRequest<ShapRankingRow[]>('/artifacts/feature-ranking');
    return rows.map((row) => ({
      feature: row.feature,
      importance: row.mean_abs_shap,
    }));
  },

  /** Whitelist'li PNG için tam URL döndürür (sepsis-son backend'de route yok — kullanmayin). */
  figureUrl: (name: string): string => `${API_BASE_URL}/artifacts/figure/${name}`,

  /** Faz 7: secilen model icin TP/FP/FN LIME top-10 feature katkilari. */
  getLimeExplanations: async (modelId: LimeModelId): Promise<LimeExplanation[]> =>
    apiRequest<LimeExplanation[]>(`/artifacts/lime/${modelId}`),

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

/** DL pencere demo — gercek saatlik seri (sepsis-son backend). */
export interface DemoPatientSummary {
  patient_id: string;
  sepsis: boolean;
  n_hours: number;
  default_end_hour: number;
  window_hours: number;
}

export interface HourlySnapshot {
  hour: number;
  HR?: number;
  O2Sat?: number;
  Temp?: number;
  MAP?: number;
  Resp?: number;
  BUN?: number;
  Chloride?: number;
  Creatinine?: number;
  Glucose?: number;
  Hct?: number;
  Hgb?: number;
  WBC?: number;
  Platelets?: number;
  Age?: number;
  HospAdmTime?: number;
  ICULOS?: number;
  Gender_0?: number;
  Gender_1?: number;
}

export interface PatientWindowResponse {
  patient_id: string;
  hours: number;
  end_hour: number;
  sepsis: boolean;
  horizon_label_end: number;
  series: HourlySnapshot[];
}

export interface WindowModelResult {
  model_id: string;
  model_name: string;
  risk_score: number;
  alert: boolean;
  threshold: number;
  attention_weights: number[] | null;
  importance_method: 'attention' | 'gradient' | null;
}

export interface WindowPredictionResponse {
  models: WindowModelResult[];
  window_shape: [number, number];
  input_mode: 'repeat' | 'series';
}

export const windowDemoAPI = {
  listDemoPatients: async (): Promise<DemoPatientSummary[]> =>
    apiRequest<DemoPatientSummary[]>('/patients/demo'),

  getPatientWindow: async (
    patientId: string,
    hours = 24,
  ): Promise<PatientWindowResponse> =>
    apiRequest<PatientWindowResponse>(`/patients/${patientId}/window?hours=${hours}`),

  predictWindow: async (payload: {
    snapshot: Record<string, number | undefined>;
    series?: Record<string, number | undefined>[];
    repeat_hours?: number;
    patientId?: string;
  }): Promise<WindowPredictionResponse> =>
    apiRequest<WindowPredictionResponse>('/predict/window', {
      method: 'POST',
      body: JSON.stringify({
        snapshot: payload.snapshot,
        series: payload.series ?? null,
        repeat_hours: payload.repeat_hours ?? 24,
        patient_id: payload.patientId ?? null,
      }),
    }),
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
  windowDemo: windowDemoAPI,
};

