#!/bin/bash

echo "🚀 Starting WalkingPad Controller in Production Mode..."

# Check if Python dependencies are installed
echo "📦 Checking Python dependencies..."
python3 -c "import bleak, ph4_walkingpad" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Python dependencies missing. Installing..."
    pip3 install -r requirements.txt
fi

# Build the Next.js application
echo "🔨 Building application..."
npm run build

# Start the production server
echo "✅ Starting production server..."
echo "🌐 Your WalkingPad Controller will be available at:"
echo "   - Local: http://localhost:3000"
echo "   - Network: http://$(ipconfig getifaddr en0):3000"
echo ""
echo "📱 You can access this from any device on your network!"
echo "🔌 Make sure your WalkingPad is powered on and in pairing mode."
echo ""

NODE_ENV=production npm start
