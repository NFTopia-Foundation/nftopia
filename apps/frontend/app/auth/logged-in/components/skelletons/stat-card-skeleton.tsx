export const StatCardSkeleton = () => (
  <div className="bg-white rounded-lg border p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="w-8 h-8 bg-gray-200 rounded"></div>
      <div className="w-12 h-4 bg-gray-200 rounded"></div>
    </div>
    <div className="w-16 h-8 bg-gray-200 rounded mb-2"></div>
    <div className="w-20 h-4 bg-gray-200 rounded"></div>
  </div>
)
