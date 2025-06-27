import { StatCardSkeleton } from "./skelletons/stat-card-skeleton"

export interface StatCardProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: number;
  change?: number;
  isLoading?: boolean;
}
export const StatCard = ({ icon: Icon, label, value, change, isLoading = false }: StatCardProps) => {
  if (isLoading) return <StatCardSkeleton />

  return (
    <div className="rounded-lg border border-purple-900 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-8 h-8 text-blue-600" />
        {change !== undefined && (
          <span className={`text-sm font-medium ${change > 0 ? "text-green-600" : "text-red-600"}`}>
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value.toLocaleString()}</div>
      <div className="text-sm text-white/80">{label}</div>
    </div>
  )
}
