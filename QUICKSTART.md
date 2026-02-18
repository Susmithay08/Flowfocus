# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Database Setup (2 minutes)

```bash
# Create database
createdb pomodoro_ai

# Apply schema
psql -d pomodoro_ai -f database/schema.sql
```

### Step 2: Backend Setup (1 minute)

```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://localhost:5432/pomodoro_ai
JWT_SECRET=$(openssl rand -base64 32)
ANTHROPIC_API_KEY=your-key-here
PORT=3001
FRONTEND_URL=http://localhost:3000
EOF

# Start server
npm run dev
```

### Step 3: Frontend Setup (1 minute)

```bash
cd frontend
npm install

# Create .env
echo "REACT_APP_API_URL=http://localhost:3001/api" > .env

# Start app
npm start
```

### Step 4: Create Account & Start!

1. Open http://localhost:3000
2. Click "Create Account"
3. Fill in your details
4. Start your first Pomodoro! 🍅

## 🎯 First Steps

1. **Add a task** - Click Tasks tab → Add your first task
2. **Start focus session** - Select task → Click Start
3. **Complete 4 sessions** - Work through 4 Pomodoros
4. **Check AI insights** - View your productivity analysis

## 🔑 Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create a new key
5. Copy and paste into `.env` file

## ⚙️ Default Settings

- Work session: 25 minutes
- Short break: 5 minutes  
- Long break: 15 minutes
- Sessions until long break: 4

Customize these in the app!

## 🐛 Troubleshooting

**Database connection error?**
- Make sure PostgreSQL is running
- Check DATABASE_URL in .env matches your setup

**Frontend can't connect to backend?**
- Ensure backend is running on port 3001
- Check CORS settings if using different ports

**AI features not working?**
- Verify ANTHROPIC_API_KEY is set correctly
- Check API key has sufficient credits

## 📚 Next Steps

- Read the full README.md for detailed documentation
- Explore the codebase structure
- Try customizing the design
- Add your own AI insights!

Happy focusing! 🎯
