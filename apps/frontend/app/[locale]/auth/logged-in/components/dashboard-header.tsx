import { Plus, TrendingUp } from "lucide-react"

export const DashboardHeader = () => (
  <div className="shadow-md text-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Creator Dashboard</h1>
          <p className="mt-1 text-sm text-white/80">Manage your NFT collections and track performance</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <TrendingUp className="w-4 h-4 mr-2" />
            View Analytics
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Create NFT
          </button>
        </div>
      </div>
    </div>
  </div>
)
