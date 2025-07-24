#!/usr/bin/env python3
import asyncio
import json
import sys
import logging
from datetime import datetime
from ph4_walkingpad.pad import Scanner, Controller

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WalkingPadBridge:
    def __init__(self):
        self.scanner = Scanner()
        self.controller = None
        self.device = None
        self.is_connected = False
        self.last_status = {}
        
    def send_message(self, msg_type, data):
        """Send message to Node.js server"""
        message = {
            'type': msg_type,
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(message), flush=True)
    
    def log_message(self, message, level='info'):
        """Send log message to frontend"""
        self.send_message('log', {
            'message': message,
            'level': level,
            'timestamp': datetime.now().isoformat()
        })
    
    async def scan_devices(self):
        """Scan for WalkingPad devices"""
        try:
            self.log_message("Scanning for WalkingPad devices...")
            # Use a custom matcher that recognizes both WalkingPad and KS-ST-A1P devices
            def walkingpad_matcher(device_name):
                if not device_name:
                    return False
                name_lower = device_name.lower()
                return any([
                    'walkingpad' in name_lower,
                    'ks-st-a1p' in name_lower,
                    'kingsmith' in name_lower,
                    name_lower.startswith('ks-')
                ])
            
            # Try scanning with matcher first
            await self.scanner.scan(timeout=5.0, dev_name=None, matcher=walkingpad_matcher)
            
            # If no candidates found, try scanning without any filtering
            if not hasattr(self.scanner, 'walking_belt_candidates') or len(self.scanner.walking_belt_candidates) == 0:
                self.log_message("No candidates found with matcher, trying scan without filtering...")
                await self.scanner.scan(timeout=5.0)
                
                # Manually filter devices from devices_dict
                if hasattr(self.scanner, 'devices_dict'):
                    for addr, info in self.scanner.devices_dict.items():
                        device_name = info[0] if info and len(info) > 0 else None
                        if device_name and walkingpad_matcher(device_name):
                            self.log_message(f"Manually found WalkingPad device: {device_name} ({addr})")
                            # Create a mock device object for compatibility
                            class MockDevice:
                                def __init__(self, name, address):
                                    self.name = name
                                    self.address = address
                            
                            mock_device = MockDevice(device_name, addr)
                            if not hasattr(self.scanner, 'walking_belt_candidates'):
                                self.scanner.walking_belt_candidates = []
                            self.scanner.walking_belt_candidates.append(mock_device)
            
            device_list = []
            seen_addresses = set()
            # Debug: Check all discovered devices first
            if hasattr(self.scanner, 'devices_dict'):
                self.log_message(f"Total devices discovered: {len(self.scanner.devices_dict)}")
                for addr, info in self.scanner.devices_dict.items():
                    self.log_message(f"Discovered device: {info[0]} ({addr}) - Services: {info[1]}")
            
            # Get devices from the scanner's internal candidates list
            if hasattr(self.scanner, 'walking_belt_candidates'):
                self.log_message(f"Scanner found {len(self.scanner.walking_belt_candidates)} WalkingPad candidates")
                for device in self.scanner.walking_belt_candidates:
                    self.log_message(f"Processing WalkingPad candidate: {device.name} ({device.address})")
                    # Avoid duplicates by checking address
                    if device.address not in seen_addresses:
                        device_info = {
                            'name': device.name or 'Unknown Device',
                            'address': device.address,
                            'rssi': getattr(device, 'rssi', -50)  # Default RSSI if not available
                        }
                        device_list.append(device_info)
                        seen_addresses.add(device.address)
                        self.log_message(f"Added device to list: {device_info}")
                    else:
                        self.log_message(f"Skipped duplicate device: {device.address}")
            else:
                self.log_message("No walking_belt_candidates attribute found on scanner")
            
            self.send_message('scan_results', device_list)
            self.log_message(f"Found {len(device_list)} WalkingPad devices")
            
        except Exception as e:
            self.send_message('error', {'message': f'Scan failed: {str(e)}'})
            self.log_message(f"Scan error: {str(e)}", 'error')
    
    async def connect_device(self, address):
        """Connect to a specific device"""
        try:
            self.log_message(f"Connecting to device {address}...")
            
            # Find device from scan results - use same matcher as scan_devices
            def walkingpad_matcher(device_name):
                if not device_name:
                    return False
                name_lower = device_name.lower()
                return any([
                    'walkingpad' in name_lower,
                    'ks-st-a1p' in name_lower,
                    'kingsmith' in name_lower,
                    name_lower.startswith('ks-')
                ])
            
            await self.scanner.scan(timeout=5.0, dev_name=None, matcher=walkingpad_matcher)
            target_device = None
            
            # Look for the device in the candidates list
            if hasattr(self.scanner, 'walking_belt_candidates'):
                for device in self.scanner.walking_belt_candidates:
                    if device.address == address:
                        target_device = device
                        break
            
            if not target_device:
                raise Exception(f"Device {address} not found")
            
            # Create controller and connect
            self.controller = Controller()
            self.log_message(f"Attempting to connect to {target_device.name} at {target_device.address}...")
            
            # Add timeout to connection attempt
            try:
                await asyncio.wait_for(self.controller.run(target_device), timeout=30.0)
            except asyncio.TimeoutError:
                raise Exception("Connection timed out after 30 seconds. Make sure the WalkingPad is powered on and in pairing mode.")
            
            self.device = target_device
            self.is_connected = True
            
            # Send connection update
            self.send_message('connection_update', {
                'connected': True,
                'device_name': target_device.name or 'WalkingPad',
                'device_address': address,
                'connected_at': datetime.now().isoformat()
            })
            
            self.log_message(f"Connected to {target_device.name or 'WalkingPad'}")
            
            # Start status monitoring
            asyncio.create_task(self.monitor_status())
            
        except Exception as e:
            error_msg = str(e) if str(e) else f"Unknown connection error: {type(e).__name__}"
            self.send_message('error', {'message': f'Connection failed: {error_msg}'})
            self.log_message(f"Connection error: {error_msg}", 'error')
            # Also log the full exception for debugging
            import traceback
            self.log_message(f"Full traceback: {traceback.format_exc()}", 'error')
    
    async def disconnect_device(self):
        """Disconnect from current device"""
        try:
            if self.controller:
                await self.controller.disconnect()
                self.controller = None
            
            self.device = None
            self.is_connected = False
            
            self.send_message('connection_update', {
                'connected': False,
                'device_name': None,
                'device_address': None,
                'connected_at': None
            })
            
            self.log_message("Disconnected from device")
            
        except Exception as e:
            self.send_message('error', {'message': f'Disconnect failed: {str(e)}'})
            self.log_message(f"Disconnect error: {str(e)}", 'error')
    
    async def start_treadmill(self):
        """Start the treadmill"""
        if not self.is_connected or not self.controller:
            self.send_message('error', {'message': 'Not connected to device'})
            return
        
        try:
            await self.controller.start_belt()
            await asyncio.sleep(0.2)  # Small delay to ensure command is processed
            self.log_message("Treadmill started")
            # Request status update after command
            await self.get_status()
        except Exception as e:
            self.send_message('error', {'message': f'Start failed: {str(e)}'})
            self.log_message(f"Start error: {str(e)}", 'error')
    
    async def stop_treadmill(self):
        """Stop the treadmill"""
        if not self.is_connected or not self.controller:
            self.send_message('error', {'message': 'Not connected to device'})
            return
        
        try:
            await self.controller.stop_belt()
            await asyncio.sleep(0.2)  # Small delay to ensure command is processed
            self.log_message("Treadmill stopped")
            # Request status update after command
            await self.get_status()
        except Exception as e:
            self.send_message('error', {'message': f'Stop failed: {str(e)}'})
            self.log_message(f"Stop error: {str(e)}", 'error')
    
    async def set_speed(self, speed):
        """Set treadmill speed"""
        if not self.is_connected or not self.controller:
            self.send_message('error', {'message': 'Not connected to device'})
            return
        
        try:
            # Convert km/h to the internal speed format (multiply by 10)
            internal_speed = int(float(speed) * 10)
            await self.controller.change_speed(internal_speed)
            await asyncio.sleep(0.3)  # Longer delay for speed changes
            self.log_message(f"Speed set to {speed} km/h (internal: {internal_speed})")
            # Request status update after speed change
            await self.get_status()
        except Exception as e:
            self.send_message('error', {'message': f'Speed change failed: {str(e)}'})
            self.log_message(f"Speed change error: {str(e)}", 'error')
    
    async def power_on(self):
        """Switch to manual mode"""
        if not self.is_connected or not self.controller:
            self.send_message('error', {'message': 'Not connected to device'})
            return
        
        try:
            await self.controller.switch_mode(1)  # Manual mode
            await asyncio.sleep(0.2)  # Small delay for mode switch
            self.log_message("Switched to Manual mode")
            await self.get_status()  # Update status after mode change
        except Exception as e:
            self.send_message('error', {'message': f'Manual mode switch failed: {str(e)}'})
            self.log_message(f"Manual mode error: {str(e)}", 'error')
    
    async def power_off(self):
        """Switch to automatic mode"""
        if not self.is_connected or not self.controller:
            self.send_message('error', {'message': 'Not connected to device'})
            return
        
        try:
            await self.controller.switch_mode(0)  # Automatic mode
            await asyncio.sleep(0.2)  # Small delay for mode switch
            self.log_message("Switched to Automatic mode")
            await self.get_status()  # Update status after mode change
        except Exception as e:
            self.send_message('error', {'message': f'Automatic mode switch failed: {str(e)}'})
            self.log_message(f"Automatic mode error: {str(e)}", 'error')
    
    async def get_status(self):
        """Get current treadmill status"""
        if not self.is_connected or not self.controller:
            self.send_message('error', {'message': 'Not connected to device'})
            return
        
        try:
            # Request fresh status from the device
            await self.controller.ask_stats()
            await asyncio.sleep(0.1)  # Small delay to receive response
            
            status = self.controller.last_status
            if status:
                status_data = {
                    'speed': status.speed / 10.0,  # Convert to km/h
                    'time': status.time,
                    'distance': status.dist / 100.0,  # Convert to km
                    'steps': status.steps,
                    'mode': status.manual_mode,  # Correct attribute name
                    'belt_state': status.belt_state
                }
                self.send_message('status_update', status_data)
                self.log_message(f"Status update: Speed={status_data['speed']} km/h, Time={status_data['time']}s, Steps={status_data['steps']}")
        except Exception as e:
            self.send_message('error', {'message': f'Status fetch failed: {str(e)}'})
            self.log_message(f"Status error: {str(e)}", 'error')
    
    async def get_workout_history(self, mode=0):
        """Get workout history from the device"""
        try:
            if not self.is_connected or not self.controller:
                self.send_message('error', {'message': 'Not connected to device'})
                return
            
            self.log_message(f"Requesting workout history (mode {mode})...")
            
            # Request workout history using the ask_hist command
            await self.controller.ask_hist(mode)
            
            # Wait a bit for the response
            await asyncio.sleep(2)
            
            # Get the last record if available
            if hasattr(self.controller, 'last_record') and self.controller.last_record:
                record = self.controller.last_record
                
                # Parse the workout data
                workout_data = {
                    'timestamp': datetime.now().isoformat(),
                    'mode': mode,
                    'raw_data': record.hex() if isinstance(record, (bytes, bytearray)) else str(record),
                    'parsed_data': self.parse_workout_record(record)
                }
                
                self.send_message('workout_history', workout_data)
                self.log_message(f"Workout history retrieved: {len(record) if record else 0} bytes")
            else:
                self.send_message('workout_history', {
                    'timestamp': datetime.now().isoformat(),
                    'mode': mode,
                    'message': 'No workout history available',
                    'raw_data': None,
                    'parsed_data': None
                })
                self.log_message("No workout history found")
                
        except Exception as e:
            self.send_message('error', {'message': f'Workout history retrieval failed: {str(e)}'})
            self.log_message(f"Workout history error: {str(e)}", 'error')
    
    def parse_workout_record(self, record):
        """Parse workout record data"""
        try:
            if not record:
                return None
            
            # Convert to bytes if needed
            if isinstance(record, str):
                record = bytes.fromhex(record)
            elif not isinstance(record, (bytes, bytearray)):
                return {'raw': str(record)}
            
            # Basic parsing - this may need adjustment based on actual data format
            parsed = {
                'length': len(record),
                'hex': record.hex(),
                'data_points': []
            }
            
            # Try to extract meaningful data if the record is long enough
            if len(record) >= 10:
                # This is a basic interpretation - may need refinement
                parsed['data_points'] = [
                    {'offset': i, 'value': record[i], 'hex': f'{record[i]:02x}'}
                    for i in range(min(20, len(record)))  # Show first 20 bytes
                ]
            
            return parsed
            
        except Exception as e:
            return {'error': f'Parse error: {str(e)}'}
    
    async def monitor_status(self):
        """Monitor status updates in background"""
        while self.is_connected and self.controller:
            try:
                await asyncio.sleep(1)  # Update every 1 second for better responsiveness
                await self.get_status()
            except Exception as e:
                self.log_message(f"Status monitoring error: {str(e)}", 'error')
                break
    
    async def handle_command(self, command):
        """Handle incoming commands from Node.js"""
        action = command.get('action')
        
        if action == 'scan':
            await self.scan_devices()
        elif action == 'connect':
            await self.connect_device(command.get('address'))
        elif action == 'disconnect':
            await self.disconnect_device()
        elif action == 'start':
            await self.start_treadmill()
        elif action == 'stop':
            await self.stop_treadmill()
        elif action == 'set_speed':
            await self.set_speed(command.get('speed'))
        elif action == 'power_on':
            await self.power_on()
        elif action == 'power_off':
            await self.power_off()
        elif action == 'get_status':
            await self.get_status()
        elif action == 'get_workout_history':
            await self.get_workout_history(command.get('mode', 0))
        else:
            self.send_message('error', {'message': f'Unknown action: {action}'})

async def main():
    bridge = WalkingPadBridge()
    bridge.log_message("WalkingPad bridge started")
    
    # Read commands from stdin
    loop = asyncio.get_event_loop()
    
    def read_stdin():
        try:
            line = sys.stdin.readline()
            if line:
                try:
                    command = json.loads(line.strip())
                    asyncio.create_task(bridge.handle_command(command))
                except json.JSONDecodeError as e:
                    bridge.send_message('error', {'message': f'Invalid JSON: {str(e)}'})
        except Exception as e:
            bridge.send_message('error', {'message': f'Stdin error: {str(e)}'})
    
    # Set up stdin reading
    loop.add_reader(sys.stdin.fileno(), read_stdin)
    
    try:
        # Keep the bridge running
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        bridge.log_message("Bridge shutting down...")
    finally:
        if bridge.is_connected:
            await bridge.disconnect_device()

if __name__ == "__main__":
    asyncio.run(main())
