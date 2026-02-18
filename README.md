# Flow•Focus - AI-Powered Pomodoro Timer

![Preview](Preview.png)

> A full-stack Pomodoro timer with AI-powered productivity insights, task prioritization, and personalized break suggestions.

🌐 **Live App:** [flowfocus-eight.vercel.app](https://flowfocus-eight.vercel.app/)
💻 **Source Code:** [github.com/Susmithay08/Flowfocus](https://github.com/Susmithay08/Flowfocus)

---

## 🌟 Features

### Core Pomodoro Functionality
- ⏱️ Customizable work/break intervals with flip clock display
- 📊 Session tracking and history
- 🎯 Task management integration
- 📈 Real-time productivity statistics

### AI-Powered Features
- 🤖 Smart break suggestions based on productivity patterns
- 📋 Intelligent task prioritization and scheduling
- 📊 Deep productivity analysis and insights
- 🎯 Focus score calculation
- 💡 Personalized recommendations

### Backend & Data
- 👤 User authentication with JWT
- 💾 PostgreSQL database for data persistence
- 📊 Comprehensive session statistics
- 🔒 Secure API with rate limiting
- 📈 Historical data tracking

---

## 🛠️ Tech Stack

### Frontend
- React 18
- Axios for API calls
- Custom CSS with brutalist/retro-modern design
- Responsive layout

### Backend
- Node.js with Express
- PostgreSQL database
- **Groq API** for AI features
- JWT authentication
- Rate limiting with express-rate-limit

---

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Groq API key ([Get one here](https://console.groq.com/))

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Susmithay08/Flowfocus.git
cd Flowfocus
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb pomodoro_ai
```

Run the schema:

```bash
psql -d pomodoro_ai -f database/schema.sql
```

### 3. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/pomodoro_ai
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
GROQ_API_KEY=your-groq-api-key-here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Start the backend server:

```bash
npm run dev
```

The server will run on `http://localhost:3001`

### 4. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_API_URL=http://localhost:3001/api
```

Start the frontend:

```bash
npm start
```

The app will open at `http://localhost:3000`

---

## 📖 Usage

1. **Create an Account** — Sign up with email and password
2. **Start a Pomodoro Session** — Click "Start" to begin a 25-minute focus session
3. **Add Tasks** — Navigate to the Tasks tab and add tasks to track progress
4. **View AI Insights** — Get productivity analysis and personalized suggestions

---

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Sessions
- `POST /api/sessions/start` - Start a session
- `POST /api/sessions/:id/complete` - Complete a session
- `GET /api/sessions/history` - Get session history
- `GET /api/sessions/today` - Get today's sessions
- `GET /api/sessions/stats` - Get statistics
- `GET /api/sessions/break-suggestion` - Get AI break suggestion

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/prioritize` - Get AI prioritization

### Insights
- `GET /api/insights/productivity` - Get productivity analysis
- `GET /api/insights/daily-summary` - Get daily summary
- `GET /api/insights/recent` - Get recent insights

### Preferences
- `GET /api/preferences` - Get user preferences
- `PUT /api/preferences` - Update preferences

---

## 🧠 AI Features (Powered by Groq)

### Focus Score Calculation
Each session receives a focus score (0-100) based on completion rate, consistency, time of day performance, and interruption patterns.

### Productivity Analysis
Analyzes session completion patterns, best performing times, task velocity, break effectiveness, and focus duration trends.

### Task Prioritization
AI considers task complexity, your historical productivity patterns, cognitive load distribution, and energy levels throughout the day.

---

## 🔐 Security

- Passwords hashed with bcryptjs
- JWT tokens for authentication
- Rate limiting on all API endpoints
- SQL injection protection with parameterized queries
- CORS configured for frontend domain only

---

## 📊 Database Schema

| Table | Description |
|-------|-------------|
| `users` | User accounts |
| `user_preferences` | Customizable timer settings |
| `tasks` | User tasks with AI insights |
| `sessions` | Pomodoro session records |
| `productivity_insights` | AI-generated insights |
| `ai_analysis_cache` | Caching for AI responses |

---

