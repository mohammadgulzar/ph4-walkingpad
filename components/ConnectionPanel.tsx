import { useState } from 'react'

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

interface ConnectionPanelProps {
  devices: Device[]
  connectionStatus: ConnectionStatus
  isScanning: boolean
  isConnecting: boolean
  onScanDevices: () => void
  onConnectDevice: (address: string) => void
  onDisconnectDevice: () => void
}

export default function ConnectionPanel({
  devices,
  connectionStatus,
  isScanning,
  isConnecting,
  onScanDevices,
  onConnectDevice,
  onDisconnectDevice
}: ConnectionPanelProps) {
  const [selectedDevice, setSelectedDevice] = useState<string>('')

  const formatConnectionTime = (timestamp: string | null) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="card p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Device Connection</h2>
      
      {/* Connection Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <span className={`status-badge ${connectionStatus.connected ? 'status-connected' : 'status-disconnected'}`}>
            {connectionStatus.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {connectionStatus.connected && (
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <span className="font-medium">Device:</span> {connectionStatus.device_name}
            </div>
            <div>
              <span className="font-medium">Address:</span> {connectionStatus.device_address}
            </div>
            <div>
              <span className="font-medium">Connected at:</span> {formatConnectionTime(connectionStatus.connected_at)}
            </div>
          </div>
        )}
      </div>

      {/* Scan Section */}
      {!connectionStatus.connected && (
        <div className="mb-6">
          <button
            onClick={onScanDevices}
            disabled={isScanning}
            className={`btn w-full mb-4 transition-all duration-200 ${isScanning ? 'btn-secondary' : 'btn-primary'}`}
          >
            {isScanning ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Scanning for WalkingPads...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Scan for Devices
              </div>
            )}
          </button>

          {/* Device List */}
          {devices.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800">Available Devices</h3>
              <div className={`space-y-2 max-h-60 overflow-y-auto transition-all duration-300 ${
                isConnecting ? 'opacity-50 pointer-events-none' : ''
              }`}>
                {devices.map((device, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg transition-all duration-300 ${
                      isConnecting 
                        ? 'cursor-not-allowed bg-gray-100 border-gray-200' 
                        : selectedDevice === device.address
                          ? 'border-primary-500 bg-primary-50 cursor-pointer hover:bg-primary-100'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer hover:bg-gray-50'
                    }`}
                    onClick={() => !isConnecting && setSelectedDevice(device.address)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className={`font-medium transition-colors ${
                            isConnecting ? 'text-gray-400' : 'text-gray-900'
                          }`}>
                            {device.name}
                            {isConnecting && selectedDevice === device.address && (
                              <span className="ml-2 inline-flex items-center">
                                <svg className="animate-spin h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="ml-1 text-sm text-primary-600">Connecting...</span>
                              </span>
                            )}
                          </div>
                          <div className={`text-sm transition-colors ${
                            isConnecting ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            {device.address}
                          </div>
                        </div>
                      </div>
                      <div className={`text-sm transition-colors ${
                        isConnecting ? 'text-gray-300' : 'text-gray-400'
                      }`}>
                        RSSI: {device.rssi}
                      </div>
                    </div>
                    {isConnecting && selectedDevice === device.address && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center text-sm text-primary-600">
                          <svg className="animate-pulse w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="3"></circle>
                          </svg>
                          Establishing connection...
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Connect Button */}
              <button
                onClick={() => selectedDevice && onConnectDevice(selectedDevice)}
                disabled={!selectedDevice || isConnecting}
                className={`btn w-full mt-4 transition-all duration-200 ${
                  !selectedDevice ? 'btn-outline' : 'btn-success'
                }`}
              >
                {isConnecting ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting to WalkingPad...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {selectedDevice ? 'Connect to Selected Device' : 'Select a Device First'}
                  </div>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Disconnect Section */}
      {connectionStatus.connected && (
        <div>
          <button
            onClick={onDisconnectDevice}
            className="btn btn-danger w-full"
          >
            Disconnect Device
          </button>
        </div>
      )}
    </div>
  )
}
