/**
 * Test seti AUROC ve AUPRC degerlerini iki satir olarak gosterir.
 * Seyrek pozitif (h=6) gorevlerde AUPRC ozellikle onemlidir.
 */
export default function ModelMetricBadges({
  auroc,
  auprc,
  className = 'text-[10px] text-gray-500 tabular-nums',
}: {
  auroc: number
  auprc?: number | null
  className?: string
}) {
  return (
    <span className={`block leading-tight ${className}`}>
      <span className="block whitespace-nowrap">AUROC {auroc.toFixed(3)}</span>
      {auprc != null && auprc !== undefined && (
        <span className="block whitespace-nowrap text-indigo-600 dark:text-indigo-400">
          AUPRC {auprc.toFixed(3)}
        </span>
      )}
    </span>
  )
}
