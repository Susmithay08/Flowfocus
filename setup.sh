#!/bin/bash

# Flow•Focus Setup Script
# Automates the installation process

set -e  # Exit on error

echo "🍅 Flow•Focus - AI-Powered Pomodoro Timer Setup"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed${NC}"
    echo "Please install PostgreSQL first:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Database setup
echo "📊 Setting up database..."
read -p "Enter PostgreSQL username (default: $USER): " PG_USER
PG_USER=${PG_USER:-$USER}

read -sp "Enter PostgreSQL password (press enter if none): " PG_PASSWORD
echo ""

DB_NAME="pomodoro_ai"

# Create database
echo "Creating database $DB_NAME..."
if [ -z "$PG_PASSWORD" ]; then
    createdb -U $PG_USER $DB_NAME 2>/dev/null || echo "Database may already exist, continuing..."
    psql -U $PG_USER -d $DB_NAME -f database/schema.sql > /dev/null
else
    PGPASSWORD=$PG_PASSWORD createdb -U $PG_USER $DB_NAME 2>/dev/null || echo "Database may already exist, continuing..."
    PGPASSWORD=$PG_PASSWORD psql -U $PG_USER -d $DB_NAME -f database/schema.sql > /dev/null
fi

echo -e "${GREEN}✓ Database setup complete${NC}"
echo ""

# Anthropic API Key
echo "🤖 AI Configuration..."
read -p "Enter your Anthropic API key: " ANTHROPIC_KEY

if [ -z "$ANTHROPIC_KEY" ]; then
    echo -e "${YELLOW}⚠ Warning: No API key provided. AI features will not work.${NC}"
    echo "You can add it later in backend/.env"
    ANTHROPIC_KEY="your-api-key-here"
fi

# Backend setup
echo "⚙️ Setting up backend..."
cd backend

# Install dependencies
echo "Installing backend dependencies..."
npm install > /dev/null 2>&1

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Create .env file
if [ -z "$PG_PASSWORD" ]; then
    DATABASE_URL="postgresql://$PG_USER@localhost:5432/$DB_NAME"
else
    DATABASE_URL="postgresql://$PG_USER:$PG_PASSWORD@localhost:5432/$DB_NAME"
fi

cat > .env << EOF
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
ANTHROPIC_API_KEY=$ANTHROPIC_KEY
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EOF

echo -e "${GREEN}✓ Backend setup complete${NC}"
cd ..
echo ""

# Frontend setup
echo "🎨 Setting up frontend..."
cd frontend

# Install dependencies
echo "Installing frontend dependencies..."
npm install > /dev/null 2>&1

# Create .env file
cat > .env << EOF
REACT_APP_API_URL=http://localhost:3001/api
EOF

echo -e "${GREEN}✓ Frontend setup complete${NC}"
cd ..
echo ""

# Create start script
cat > start.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Flow•Focus..."

# Start backend
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
cd ../frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Flow•Focus is running!"
echo "   Backend: http://localhost:3001"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
EOF

chmod +x start.sh

# Create stop script
cat > stop.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping Flow•Focus..."

# Kill processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

echo "✅ All services stopped"
EOF

chmod +x stop.sh

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "To start the application:"
echo "  ./start.sh"
echo ""
echo "To stop the application:"
echo "  ./stop.sh"
echo ""
echo "Or start services manually:"
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: cd frontend && npm start"
echo ""
echo "📚 Read QUICKSTART.md for usage guide"
echo "📖 Read README.md for full documentation"
echo ""
echo -e "${YELLOW}Note: Make sure to get an Anthropic API key for AI features${NC}"
echo "Visit: https://console.anthropic.com/"
echo ""
