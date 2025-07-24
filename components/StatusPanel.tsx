import { useEffect, useState } from 'react'

interface TreadmillStatus {
  speed: number
  time: number
  distance: number
  steps: number
  mode: number
  belt_state: number
}

interface StatusPanelProps {
  connected: boolean
  status: TreadmillStatus
  onRefreshStatus: () => void
}

export default function StatusPanel({
  connected,
  status,
  onRefreshStatus
}: StatusPanelProps) {
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (connected && autoRefresh) {
      const interval = setInterval(() => {
        onRefreshStatus()
      }, 3000) // Refresh every 3 seconds

      return () => clearInterval(interval)
    }
  }, [connected, autoRefresh, onRefreshStatus])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatDistance = (distance: number) => {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(2)} km`
    }
    return `${distance} m`
  }

  const getSpeedColor = (speed: number) => {
    if (speed === 0) return 'text-gray-500'
    if (speed < 2) return 'text-green-500'
    if (speed < 4) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Live Statistics</h2>
      </div>
      {!connected ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-500">Connect to view real-time statistics</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Speed */}
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <div className="text-sm font-medium text-gray-600 mb-1">Current Speed</div>
            <div className={`text-3xl font-bold ${getSpeedColor(status.speed)}`}>
              {status.speed.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500">km/h</div>
          </div>

          {/* Time */}
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
            <div className="text-sm font-medium text-gray-600 mb-1">Exercise Time</div>
            <div className="text-3xl font-bold text-green-600">
              {formatTime(status.time)}
            </div>
            <div className="text-sm text-gray-500">duration</div>
          </div>

          {/* Distance */}
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
            <div className="text-sm font-medium text-gray-600 mb-1">Distance</div>
            <div className="text-3xl font-bold text-purple-600">
              {formatDistance(status.distance)}
            </div>
            <div className="text-sm text-gray-500">traveled</div>
          </div>

          {/* Steps */}
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
            <div className="text-sm font-medium text-gray-600 mb-1">Step Count</div>
            <div className="text-3xl font-bold text-orange-600">
              {status.steps.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">steps</div>
          </div>
        </div>
      )}

      {/* Status Indicators */}
      {connected && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  status.belt_state === 1 ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-gray-600">
                  Belt: {status.belt_state === 1 ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  status.mode === 1 ? 'bg-blue-500' : status.mode === 2 ? 'bg-yellow-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-gray-600">
                  Mode: {status.mode === 0 ? 'Standby' : status.mode === 1 ? 'Manual' : 'Auto'}
                </span>
              </div>
            </div>
            <div className="text-gray-400 text-xs">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
