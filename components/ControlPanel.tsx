import { useState, useEffect } from 'react'

interface TreadmillStatus {
  speed: number
  time: number
  distance: number
  steps: number
  mode: number
  belt_state: number
}

interface ControlPanelProps {
  connected: boolean
  treadmillStatus: TreadmillStatus
  onStart: () => void
  onStop: () => void
  onSetSpeed: (speed: number) => void
  onPowerOn: () => void
  onPowerOff: () => void
}

export default function ControlPanel({
  connected,
  treadmillStatus,
  onStart,
  onStop,
  onSetSpeed,
  onPowerOn,
  onPowerOff
}: ControlPanelProps) {
  const [speedInput, setSpeedInput] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isCountingDown, setIsCountingDown] = useState(false)

  useEffect(() => {
    setSpeedInput(treadmillStatus.speed)
    setIsRunning(treadmillStatus.belt_state === 1)
  }, [treadmillStatus])

  const handleSpeedChange = (value: number) => {
    setSpeedInput(value)
    onSetSpeed(value)
  }

  const handleStartWithCountdown = () => {
    if (isCountingDown || isRunning) return
    
    // Start the treadmill immediately
    onStart()
    
    // Show countdown as visual indicator
    setIsCountingDown(true)
    setCountdown(3)
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          setIsCountingDown(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const getModeText = (mode: number) => {
    switch (mode) {
      case 0: return 'Standby'
      case 1: return 'Manual'
      case 2: return 'Automatic'
      default: return 'Unknown'
    }
  }

  const getBeltStateText = (state: number) => {
    switch (state) {
      case 0: return 'Stopped'
      case 1: return 'Running'
      case 2: return 'Starting'
      case 3: return 'Stopping'
      default: return 'Unknown'
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Treadmill Control</h2>
      
      {!connected ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.007-5.824-2.448M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500">Connect to a device to access controls</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Status */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">Mode</div>
              <div className="font-semibold">{getModeText(treadmillStatus.mode)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Belt State</div>
              <div className="font-semibold">{getBeltStateText(treadmillStatus.belt_state)}</div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Mode Control</h3>
            <div className="flex justify-center">
              <button
                onClick={onPowerOn}
                className="btn btn-success w-full max-w-xs"
                disabled={treadmillStatus.mode === 1}
              >
                <div className="flex items-center justify-center">
                  Power on
                </div>
              </button>
            </div>
          </div>

          {/* Belt Control */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Belt Control</h3>
            <div className="flex justify-center">
              <button
                onClick={isRunning ? onStop : handleStartWithCountdown}
                className={`btn ${isRunning ? 'btn-danger' : isCountingDown ? 'btn-warning' : 'btn-success'} w-full max-w-xs`}
                disabled={treadmillStatus.mode === 0 || isCountingDown}
              >
                <div className="flex items-center justify-center">
                  {isCountingDown ? (
                    <>
                      <div className="text-2xl font-bold mr-2">{countdown}</div>
                      Starting in...
                    </>
                  ) : isRunning ? (
                    <>
                      Stop Belt
                    </>
                  ) : (
                    <>
                      Start Belt
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Speed Control */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Speed Control</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Speed: {speedInput.toFixed(1)} km/h
                  </label>
                  <span className="text-sm text-gray-500">Max: 6.0 km/h</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="0.1"
                  value={speedInput}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="speed-control"
                  disabled={treadmillStatus.mode === 0}
                />
              </div>

              {/* Quick Speed Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[1.0, 2.0, 3.0, 4.0, 5.0, 6.0].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className="btn btn-outline btn-sm py-1 text-xs"
                    disabled={treadmillStatus.mode === 0}
                  >
                    {speed} km/h
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Info */}
          <div className="text-xs text-gray-500 p-3 bg-blue-50 rounded-lg">
            <div className="font-medium mb-1">Keyboard Shortcuts:</div>
            <div>Space: Start/Stop • ↑/↓: Speed +/- 0.1 • 1-6: Quick speeds</div>
          </div>
        </div>
      )}
    </div>
  )
}
