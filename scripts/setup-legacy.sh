#!/bin/bash

# Compass Mobile App Setup Script
# Initializes the project for development

set -e

echo "🧭 Compass Mobile App Setup"
echo ""

# Check Node version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "✓ Using $NODE_VERSION"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Create .env.local if it doesn't exist
if [ ! -f "mobile/.env.local" ]; then
    echo "Creating .env.local from template..."
    cp mobile/.env.example mobile/.env.local
    echo "⚠️  Please fill in mobile/.env.local with your Supabase credentials"
    echo ""
fi

# Check Expo
echo "Checking Expo..."
if ! command -v expo &> /dev/null; then
    echo "Installing Expo CLI globally..."
    npm install -g expo-cli
fi
echo "✓ Expo CLI ready"
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update mobile/.env.local with your Supabase credentials"
echo "2. Run 'npm start' to start Expo"
echo "3. Press 'a' for Android or 'i' for iOS"
echo ""
echo "📚 Documentation:"
echo "   - Architecture: mobile/ARCHITECTURE.md"
echo "   - Backend setup: backend/README.md"
echo "   - Design docs: compass-v1-design.md"
