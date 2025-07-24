import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import Head from 'next/head'
import ConnectionPanel from '../components/ConnectionPanel'
import ControlPanel from '../components/ControlPanel'
import StatusPanel from '../components/StatusPanel'
import ActivityLog from '../components/ActivityLog'
import WorkoutHistory from '../components/WorkoutHistory'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

interface Device {
  name: string
  address: string
  rssi: number
}

interface ConnectionStatus {
  connected: boolean
  device_name: string | null
  device_address: string | null
  connected_at: string | null
}

interface TreadmillStatus {
  speed: number
  time: number
  distance: number
  steps: number
  mode: number
  belt_state: number
}

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

interface LogEntry {
  message: string
  level: string
  timestamp: string
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    device_name: null,
    device_address: null,
    connected_at: null
  })
  const [treadmillStatus, setTreadmillStatus] = useState<TreadmillStatus>({
    speed: 0,
    time: 0,
    distance: 0,
    steps: 0,
    mode: 0,
    belt_state: 0
  })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null)
  const [isLoadingWorkoutHistory, setIsLoadingWorkoutHistory] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    const newSocket = io()
    setSocket(newSocket)

    // Connection status updates
    newSocket.on('connection_update', (status: ConnectionStatus) => {
      setConnectionStatus(status)
      setIsConnecting(false)
      addLog(`Connection status: ${status.connected ? 'Connected' : 'Disconnected'}`, 'info')
      
      // Show toast notification for connection events
      if (status.connected) {
        showToast(`Successfully connected to ${status.device_name || 'WalkingPad'}!`, 'success')
        
        // Automatically enable manual mode (power on device) when connected
        // This makes the device ready for manual control but doesn't start the belt
        setTimeout(() => {
          if (newSocket) {
            newSocket.emit('power_on')
            addLog('Automatically enabling manual mode...', 'info')
          }
        }, 1000) // Small delay to ensure connection is fully established
      } else {
        showToast('Disconnected from WalkingPad', 'info')
      }
    })

    // Status updates from treadmill
    newSocket.on('status_update', (status: TreadmillStatus) => {
      setTreadmillStatus(status)
    })

    // Scan results
    newSocket.on('scan_results', (deviceList: Device[]) => {
      setDevices(deviceList)
      setIsScanning(false)
      addLog(`Found ${deviceList.length} devices`, 'info')
      
      // Show toast notification based on scan results
      if (deviceList.length > 0) {
        const deviceText = deviceList.length === 1 ? 'device' : 'devices'
        showToast(`Found ${deviceList.length} WalkingPad ${deviceText}!`, 'success')
      } else {
        showToast('No devices detected, please try again', 'error')
      }
    })

    // Log messages
    newSocket.on('log', (logEntry: LogEntry) => {
      addLog(logEntry.message, logEntry.level)
    })

    // Workout history data
    newSocket.on('workout_history', (data: WorkoutData) => {
      setWorkoutData(data)
      setIsLoadingWorkoutHistory(false)
      addLog(`Workout history retrieved: ${data.parsed_data?.length || 0} bytes`, 'info')
      
      if (data.message) {
        showToast(data.message, 'info')
      } else {
        showToast('Workout history loaded successfully', 'success')
      }
    })

    // Error messages
    newSocket.on('error', (error: { message: string }) => {
      addLog(error.message, 'error')
      setIsScanning(false)
      setIsConnecting(false)
      setIsLoadingWorkoutHistory(false)
      
      // Only show toast for actual user-facing errors, not informational messages
      const errorMsg = error.message.toLowerCase()
      
      // Connection failure errors (but not informational connection messages)
      if (errorMsg.includes('connection failed') || 
          errorMsg.includes('connect failed') ||
          errorMsg.includes('connection timed out') ||
          errorMsg.includes('failed to connect')) {
        showToast('Failed to connect, please try again', 'error')
      }
      // Workout history specific errors
      else if (errorMsg.includes('workout history retrieval failed') ||
               errorMsg.includes('workout history failed')) {
        showToast('Failed to load workout history', 'error')
      }
      // Scan failure errors
      else if (errorMsg.includes('scan failed')) {
        showToast('Device scan failed, please try again', 'error')
      }
      // Only show generic error toast for actual critical errors
      else if (errorMsg.includes('critical') || errorMsg.includes('fatal')) {
        showToast('An error occurred, please check the activity log', 'error')
      }
      // Don't show toast for informational/debug messages that end up in error channel
    })

    return () => {
      newSocket.close()
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if connected and not typing in an input
      if (!connectionStatus.connected || 
          event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (event.key) {
        case ' ': // Spacebar for start/stop
          event.preventDefault()
          if (treadmillStatus.belt_state === 1) {
            handleStopTreadmill()
          } else {
            handleStartTreadmill()
          }
          break
        case 'ArrowUp': // Up arrow for speed +0.1
          event.preventDefault()
          if (treadmillStatus.mode === 1) {
            const newSpeed = Math.min(6.0, treadmillStatus.speed + 0.1)
            handleSetSpeed(newSpeed)
          }
          break
        case 'ArrowDown': // Down arrow for speed -0.1
          event.preventDefault()
          if (treadmillStatus.mode === 1) {
            const newSpeed = Math.max(0.0, treadmillStatus.speed - 0.1)
            handleSetSpeed(newSpeed)
          }
          break
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
          event.preventDefault()
          if (treadmillStatus.mode === 1) {
            const speed = parseFloat(event.key)
            handleSetSpeed(speed)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [connectionStatus.connected, treadmillStatus.belt_state, treadmillStatus.mode, treadmillStatus.speed])

  const addLog = (message: string, level: string = 'info') => {
    const logEntry: LogEntry = {
      message,
      level,
      timestamp: new Date().toISOString()
    }
    setLogs(prev => [logEntry, ...prev].slice(0, 100)) // Keep last 100 logs
  }

  const handleScanDevices = () => {
    if (socket) {
      setIsScanning(true)
      setDevices([])
      socket.emit('scan_devices')
      addLog('Scanning for devices...', 'info')
      showToast('Scanning for WalkingPad devices...', 'info')
    }
  }

  const handleConnectDevice = (address: string) => {
    if (socket) {
      setIsConnecting(true)
      socket.emit('connect_device', { address })
      addLog(`Connecting to device ${address}...`, 'info')
      showToast('Attempting to connect to WalkingPad...', 'info')
    }
  }

  const handleDisconnectDevice = () => {
    if (socket) {
      socket.emit('disconnect_device')
      addLog('Disconnecting from device...', 'info')
    }
  }

  const handleGetWorkoutHistory = (mode: number) => {
    if (socket && connectionStatus.connected) {
      setIsLoadingWorkoutHistory(true)
      setWorkoutData(null) // Clear previous data
      socket.emit('get_workout_history', { mode })
      addLog(`Requesting workout history (mode ${mode})...`, 'info')
      showToast('Loading workout history...', 'info')
    }
  }

  const handleStartTreadmill = () => {
    if (socket && connectionStatus.connected) {
      socket.emit('start_treadmill')
      addLog('Starting treadmill...', 'info')
    }
  }

  const handleStopTreadmill = () => {
    if (socket && connectionStatus.connected) {
      socket.emit('stop_treadmill')
      addLog('Stopping treadmill...', 'info')
    }
  }

  const handleSetSpeed = (speed: number) => {
    if (socket && connectionStatus.connected) {
      socket.emit('set_speed', { speed })
      addLog(`Setting speed to ${speed} km/h...`, 'info')
    }
  }

  const handlePowerOn = () => {
    if (socket && connectionStatus.connected) {
      socket.emit('power_on')
      addLog('Powering on treadmill...', 'info')
    }
  }

  const handlePowerOff = () => {
    if (socket && connectionStatus.connected) {
      socket.emit('power_off')
      addLog('Powering off treadmill...', 'info')
    }
  }

  const handleGetStatus = () => {
    if (socket && connectionStatus.connected) {
      socket.emit('get_status')
      addLog('Requesting status update...', 'info')
    }
  }

  return (
    <>
      <Head>
        <title>WalkingPad Controller</title>
        <meta name="description" content="Control your WalkingPad treadmill" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              WalkingPad Controller
            </h1>
            <p className="text-gray-600">
              Control your WalkingPad treadmill with real-time monitoring
            </p>
          </div>

          {/* Device Connection - Full Width Top */}
          <div className="mb-8">
            <ConnectionPanel
              devices={devices}
              connectionStatus={connectionStatus}
              isScanning={isScanning}
              isConnecting={isConnecting}
              onScanDevices={handleScanDevices}
              onConnectDevice={handleConnectDevice}
              onDisconnectDevice={handleDisconnectDevice}
            />
          </div>

          {/* Bottom Row - Treadmill Control and Live Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Treadmill Control */}
            <div>
              <ControlPanel
                connected={connectionStatus.connected}
                treadmillStatus={treadmillStatus}
                onStart={handleStartTreadmill}
                onStop={handleStopTreadmill}
                onSetSpeed={handleSetSpeed}
                onPowerOn={handlePowerOn}
                onPowerOff={handlePowerOff}
              />
            </div>

            {/* Right Column - Live Statistics */}
            <div>
              <StatusPanel
                connected={connectionStatus.connected}
                status={treadmillStatus}
                onRefreshStatus={handleGetStatus}
              />
            </div>
          </div>

          {/* Workout History - Full Width Bottom (Optional) */}
          {connectionStatus.connected && (
            <div className="mt-8">
              <WorkoutHistory
                connected={connectionStatus.connected}
                onGetWorkoutHistory={handleGetWorkoutHistory}
                workoutData={workoutData}
                isLoading={isLoadingWorkoutHistory}
              />
            </div>
          )}
        </div>
      </main>

      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  )
}
