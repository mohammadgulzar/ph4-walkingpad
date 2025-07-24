const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { spawn } = require('child_process')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

let pythonProcess = null
let connectionStatus = {
  connected: false,
  device_name: null,
  device_address: null,
  connected_at: null
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(httpServer, {
    cors: {
      origin: `http://${hostname}:${port}`,
      methods: ["GET", "POST"]
    }
  })

  // Start Python bridge process
  function startPythonBridge() {
    if (pythonProcess) {
      pythonProcess.kill()
    }
    
    pythonProcess = spawn('python3', ['python_bridge.py'], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    pythonProcess.stdout.on('data', (data) => {
      try {
        const lines = data.toString().split('\n').filter(line => line.trim())
        lines.forEach(line => {
          try {
            const message = JSON.parse(line)
            console.log('Python bridge message:', message)
            
            if (message.type === 'status_update') {
              io.emit('status_update', message.data)
            } else if (message.type === 'connection_update') {
              connectionStatus = { ...connectionStatus, ...message.data }
              io.emit('connection_update', connectionStatus)
            } else if (message.type === 'scan_results') {
              io.emit('scan_results', message.data)
            } else if (message.type === 'error') {
              io.emit('error', message.data)
            } else if (message.type === 'log') {
              io.emit('log', message.data)
            }
          } catch (parseError) {
            console.log('Python output:', line)
          }
        })
      } catch (error) {
        console.error('Error parsing Python output:', error)
      }
    })

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python bridge error:', data.toString())
      io.emit('error', { message: data.toString() })
    })

    pythonProcess.on('close', (code) => {
      console.log(`Python bridge process exited with code ${code}`)
      if (code !== 0) {
        setTimeout(startPythonBridge, 2000) // Restart after 2 seconds
      }
    })
  }

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)
    
    // Send current connection status
    socket.emit('connection_update', connectionStatus)

    socket.on('scan_devices', () => {
      if (pythonProcess) {
        pythonProcess.stdin.write(JSON.stringify({ action: 'scan' }) + '\n')
      }
    })

    socket.on('connect_device', (data) => {
      if (pythonProcess) {
        pythonProcess.stdin.write(JSON.stringify({ 
          action: 'connect', 
          address: data.address 
        }) + '\n')
      }
    })

    socket.on('disconnect_device', () => {
      if (pythonProcess) {
        pythonProcess.stdin.write(JSON.stringify({ action: 'disconnect' }) + '\n')
      }
    })

    socket.on('start_treadmill', () => {
      if (pythonProcess) {
        pythonProcess.stdin.write(JSON.stringify({ action: 'start' }) + '\n')
      }
    })

    socket.on('stop_treadmill', () => {
      if (pythonProcess) {
        pythonProcess.stdin.write(JSON.stringify({ action: 'stop' }) + '\n')
      }
    })

    socket.on('set_speed', (data) => {
      if (pythonProcess) {
        pythonProcess.stdin.write(JSON.stringify({ 
          action: 'set_speed', 
          speed: data.speed 
        }) + '\n')
      }
    })

    socket.on('power_on', () => {
      if (pythonProcess) {
        pythonProcess.stdin.write(JSON.stringify({ action: 'power_on' }) + '\n')
      }
    })

    socket.on('power_off', () => {
      if (pythonProcess) {
        pythonProcess.stdin.write(JSON.stringify({ action: 'power_off' }) + '\n')
      }
    })

    socket.on('get_status', () => {
      if (pythonProcess) {
        pythonProcess.stdin.write(JSON.stringify({ action: 'get_status' }) + '\n')
      }
    })

    socket.on('get_workout_history', (data) => {
      if (pythonProcess) {
        pythonProcess.stdin.write(JSON.stringify({ 
          action: 'get_workout_history', 
          mode: data.mode || 0 
        }) + '\n')
      }
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  // Start Python bridge
  startPythonBridge()

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down gracefully...')
    if (pythonProcess) {
      pythonProcess.kill()
    }
    process.exit(0)
  })
})
