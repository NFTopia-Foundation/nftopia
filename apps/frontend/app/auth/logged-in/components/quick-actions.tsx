import { Plus, TrendingUp, Grid3X3, Users } from "lucide-react"

export const QuickActions = () => (
  <div className="rounded-lg border border-purple-900 p-6">
    <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <button className="flex items-center gap-3 p-4 border border-dashed border-blue-400 rounded-lg hover:border-blue-500 hover:bg-blue-400 transition-colors">
        <Plus className="w-5 h-5 text-blue-600" />
        <span className="text-sm font-medium text-white/80">Create NFT</span>
      </button>
      <button className="flex items-center gap-3 p-4 border border-dashed border-green-400 rounded-lg hover:border-green-500 hover:bg-green-400 transition-colors">
        <Grid3X3 className="w-5 h-5 text-green-600" />
        <span className="text-sm font-medium text-white/80">New Collection</span>
      </button>
      <button className="flex items-center gap-3 p-4 border border-dashed border-purple-400 rounded-lg hover:border-purple-500 hover:bg-purple-400 transition-colors">
        <TrendingUp className="w-5 h-5 text-purple-600" />
        <span className="text-sm font-medium text-white/80">Analytics</span>
      </button>
      <button className="flex items-center gap-3 p-4 border border-dashed border-blue-400 rounded-lg hover:border-orange-500 hover:bg-orange-400 transition-colors">
        <Users className="w-5 h-5 text-orange-600" />
        <span className="text-sm font-medium text-white/80">Community</span>
      </button>
    </div>
  </div>
)
