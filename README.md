# Sepsis Dashboard - Frontend

Modern, kapsamlı Next.js dashboard uygulaması.

## 🎨 Özellikler

### Sayfalar

1. **Dashboard (/)** - Ana gösterge paneli
   - Aktif hasta listesi
   - Risk trend grafikleri
   - Özellik önem sıralaması
   - Gerçek zamanlı alarmlar

2. **Veri Analizi (/analiz)** - Veri görselleştirme
   - Yaş ve ICU tipi dağılımları
   - Günlük hasta akışı
   - Özellik eksiklik analizi
   - Veri kalitesi metrikleri

3. **Model Karşılaştırma (/modeller)** - Model performansı
   - 4 farklı model karşılaştırması (LR, XGBoost, GRU, LSTM)
   - Radar chart ile genel performans
   - Ufuk bazlı AUROC grafikleri
   - Model detayları ve öneriler

4. **Deneyler (/deneyler)** - ML experiment tracking
   - MLflow tarzı deney listesi
   - Hiperparametre görüntüleme
   - Performans metrikleri
   - Durum takibi (running, completed)

5. **Ayarlar (/ayarlar)** - Sistem konfigürasyonu
   - Alarm eşiği ayarları
   - Model tercihleri
   - UI özelleştirme
   - Güvenlik ayarları

### UI Bileşenleri

- **Sidebar Navigation** - Daraltılabilir sidebar, aktif sayfa göstergesi
- **Animated Components** - Framer Motion ile smooth animasyonlar
- **Charts** - Recharts ile interaktif grafikler
- **Toast Notifications** - React Hot Toast ile bildirimler
- **Dark Mode** - Tailwind CSS ile dark mode desteği

## 🚀 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme modunda başlat
npm run dev

# Production build
npm run build
npm start
```

## 📦 Kullanılan Kütüphaneler

- **Next.js 14** - App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **React Hot Toast** - Notifications
- **Heroicons** - Icon library
- **Lucide React** - Additional icons
- **clsx** - Conditional classnames

## 🎯 API Entegrasyonu

API adresleri `.env` üzerinden yönetilir.

- `BACKEND_API_URL`: Next.js rewrite hedefi (varsayılan: `http://localhost:8000`)
- `NEXT_PUBLIC_API_BASE_URL`: client tarafı API tabanı (varsayılan: `/api`)

Önerilen local kullanım:
- `NEXT_PUBLIC_API_BASE_URL=/api`
- `BACKEND_API_URL=http://localhost:8000`

### API Modülleri (`src/lib/api.ts`)

- `datasetAPI`: veri seti upload ve listeleme
- `trainingAPI`: eğitim configure/start/status/logs/active/stats
- `resultsAPI`: eğitim sonucu ve görselleştirme endpointleri
- `modelsAPI`: eğitilmiş model listesi
- `simulatorAPI`: preset, model descriptor, feature stats, snapshot prediction
- `artifactsAPI`: kıyas/klinik özet tabloları + figure/lime URL üretimi

### Örnek API Kullanımı

```typescript
// Hasta listesi
const response = await fetch('/api/patients')
const data = await response.json()

// Risk tahmini
const prediction = await fetch('/api/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(patientData)
})
```

## 🎨 Tema Renkleri

```css
--risk-low: #10b981 (yeşil)
--risk-medium: #f59e0b (sarı)
--risk-high: #ef4444 (kırmızı)
--risk-critical: #dc2626 (koyu kırmızı)
```

## 📱 Responsive Design

Tüm sayfalar mobile-first yaklaşımla tasarlandı:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🔧 Özelleştirme

### Yeni Sayfa Ekleme

1. `src/app/yeni-sayfa/page.tsx` oluştur
2. `DashboardLayout` ile sar
3. `src/components/Sidebar.tsx` içinde navigation'a ekle

### Yeni Bileşen Ekleme

```typescript
// src/components/YeniComponent.tsx
'use client'

import { motion } from 'framer-motion'

export default function YeniComponent() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* İçerik */}
    </motion.div>
  )
}
```

## 🐛 Debug

```bash
# Console logları için
npm run dev

# Type checking
npx tsc --noEmit

# Lint
npm run lint
```

## 🚢 Production Deployment

```bash
# Vercel
vercel deploy
```

## 🧭 Mevcut Durum (Kod Taraması)

### Proje Yapısı

- App Router sayfaları: `src/app/page.tsx`, `src/app/simulator/page.tsx`, `src/app/modeller/page.tsx`, `src/app/aciklanabilirlik/page.tsx`, `src/app/analiz/page.tsx`, `src/app/deneyler/page.tsx`, `src/app/ayarlar/page.tsx`
- Ortak iskelet: `src/components/DashboardLayout.tsx`, `src/components/Sidebar.tsx`, `src/components/Header.tsx`
- Eğitim akışı bileşenleri: `src/components/DataUpload.tsx`, `src/components/TrainingConfig.tsx`, `src/components/TrainingMonitor.tsx`, `src/components/ResultsView.tsx`
- API katmanı: `src/lib/api.ts`

### Gerçek API ile Çalışan Alanlar

- Dashboard (`/`): canlı preset + snapshot prediction + lead-time özeti
- Simülatör (`/simulator`): preset/model/feature stats + canlı çoklu model tahmin (hasta verisi girişi)
- Modeller (`/modeller`): dataset list/upload, eğitim konfigürasyonu, monitor, sonuçlar
- Açıklanabilirlik (`/aciklanabilirlik`): feature ranking, SHAP/attention/LIME artifact görüntüleme
- Header: aktif eğitim ve istatistik polling

### Mock / Statik Kalan Alanlar

- `src/app/analiz/page.tsx`: istatistik ve grafik verileri statik
- `src/app/deneyler/page.tsx`: deney listesi ve metrikler statik
- `src/app/ayarlar/page.tsx`: ayar kaydetme akışı simüle
- `src/components/FeatureImportance.tsx`: gerçek endpoint TODO, mock veri kullanıyor

### Son Yapılan Önemli Geliştirmeler

- `.env` tabanlı API yapılandırması eklendi (`BACKEND_API_URL`, `NEXT_PUBLIC_API_BASE_URL`)
- Next.js rewrite hedefi env üzerinden yönetilir hale getirildi
- Dashboard sayfası canlı snapshot akışına taşındı (mock odaklı yapıdan)
- Artifacts servisleri (kıyas, feature ranking, LIME JSON, figure) uygulamaya entegre edildi

### Teknik Borç / İyileştirme Adayları

- `FeatureImportance` bileşeni gerçek endpoint ile beslenmeli
- Bazı ekranlarda `any` tipleri azaltılarak tip güvenliği artırılmalı
- Bazı dosyalarda kapatılmış lint kuralları tekrar aktif edilip refactor yapılmalı

## 📝 Notlar

- Uygulama hibrit durumdadır: kritik akışların önemli kısmı gerçek API ile çalışır, bazı ekranlar halen mock/statik veri kullanır
- Animasyonlar performans için optimize edilmiş
- Dark mode otomatik sistem tercihini takip eder
- Tüm formlar client-side validation içerir

## 🤝 Katkı

Yeni özellik eklemek için:
1. Feature branch oluştur
2. Değişiklikleri yap
3. Pull request aç

