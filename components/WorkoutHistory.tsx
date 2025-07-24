import { useState } from 'react'

interface WorkoutData {
  timestamp: string
  mode: number
  raw_data: string | null
  parsed_data: {
    length: number
    hex: string
    data_points: Array<{
      offset: number
      value: number
      hex: string
    }>
  } | null
  message?: string
}

interface WorkoutHistoryProps {
  connected: boolean
  onGetWorkoutHistory: (mode: number) => void
  workoutData: WorkoutData | null
  isLoading: boolean
}

export default function WorkoutHistory({
  connected,
  onGetWorkoutHistory,
  workoutData,
  isLoading
}: WorkoutHistoryProps) {
  const [selectedMode, setSelectedMode] = useState(0)

  const handleGetHistory = () => {
    if (connected && !isLoading) {
      onGetWorkoutHistory(selectedMode)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="card p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Workout History</h2>
      
      {!connected ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500">Connect to WalkingPad to view workout history</p>
        </div>
      ) : (
        <div>
          {/* History Request Controls */}
          <div className="mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="historyMode" className="text-sm font-medium text-gray-700">
                  History Mode:
                </label>
                <select
                  id="historyMode"
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value={0}>Recent Workouts</option>
                  <option value={1}>All History</option>
                </select>
              </div>
              
              <button
                onClick={handleGetHistory}
                disabled={isLoading}
                className={`btn ${isLoading ? 'btn-secondary' : 'btn-primary'} flex items-center`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Get History
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Workout Data Display */}
          {workoutData && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Retrieved:</span>
                    <div className="text-gray-900">{formatTimestamp(workoutData.timestamp)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Mode:</span>
                    <div className="text-gray-900">
                      {workoutData.mode === 0 ? 'Recent Workouts' : 'All History'}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Data Size:</span>
                    <div className="text-gray-900">
                      {workoutData.parsed_data?.length || 0} bytes
                    </div>
                  </div>
                </div>
              </div>

              {/* No Data Message */}
              {workoutData.message && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-yellow-800">{workoutData.message}</span>
                  </div>
                </div>
              )}

              {/* Raw Data */}
              {workoutData.raw_data && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Raw Data</h3>
                  <div className="bg-gray-50 rounded p-3 font-mono text-sm break-all">
                    {workoutData.raw_data}
                  </div>
                </div>
              )}

              {/* Parsed Data */}
              {workoutData.parsed_data && workoutData.parsed_data.data_points && workoutData.parsed_data.data_points.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Parsed Data</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Offset
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Value (Dec)
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Value (Hex)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {workoutData.parsed_data.data_points.map((point, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-mono">
                              {point.offset}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-mono">
                              {point.value}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-mono">
                              0x{point.hex}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Data Analysis */}
              {workoutData.parsed_data && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Data Analysis</h3>
                  <div className="text-sm text-blue-800">
                    <p className="mb-2">
                      <strong>Total Length:</strong> {workoutData.parsed_data.length} bytes
                    </p>
                    <p className="mb-2">
                      <strong>Data Points:</strong> {workoutData.parsed_data.data_points?.length || 0} shown
                    </p>
                    <p className="text-xs text-blue-600 mt-3">
                      <em>Note: This is raw workout data from the WalkingPad. The exact format may vary depending on the device model and firmware version.</em>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
