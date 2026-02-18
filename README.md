# Flow•Focus - AI-Powered Pomodoro Timer

A full-stack Pomodoro timer with AI-powered productivity insights, task prioritization, and personalized break suggestions.

## 🌟 Features

### Core Pomodoro Functionality
- ⏱️ Customizable work/break intervals
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

## 🛠️ Tech Stack

### Frontend
- React 18
- Axios for API calls
- Custom CSS with brutalist/retro-modern design
- Responsive layout

### Backend
- Node.js with Express
- PostgreSQL database
- Anthropic Claude API for AI features
- JWT authentication
- Rate limiting with express-rate-limit

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Anthropic API key ([Get one here](https://console.anthropic.com/))

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd pomodoro-ai
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

Create a `.env` file in the backend directory:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/pomodoro_ai
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
ANTHROPIC_API_KEY=your-anthropic-api-key-here
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

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:3001/api
```

Start the frontend:

```bash
npm start
```

The app will open at `http://localhost:3000`

## 📖 Usage

### Getting Started

1. **Create an Account**
   - Sign up with email and password
   - Your account is created with default preferences

2. **Start a Pomodoro Session**
   - Click "Start" to begin a 25-minute focus session
   - Take 5-minute breaks between sessions
   - Every 4 sessions, take a longer 15-minute break

3. **Add Tasks**
   - Navigate to the Tasks tab
   - Add tasks you want to work on
   - Select a task before starting a session to track progress

4. **View AI Insights**
   - Go to the AI Insights tab
   - Get productivity analysis based on your patterns
   - Receive personalized suggestions for improvement

### Key Features

#### Smart Break Suggestions
The AI analyzes your session patterns and suggests optimal break timing:
```javascript
// Example: Request a break suggestion
GET /api/sessions/break-suggestion
```

#### Task Prioritization
AI helps prioritize your tasks based on complexity, deadlines, and your productivity patterns:
```javascript
// Get AI-powered task prioritization
GET /api/tasks/prioritize
```

#### Productivity Analysis
Get deep insights into your work patterns:
```javascript
// Get 7-day productivity analysis
GET /api/insights/productivity?days=7
```

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

## 🎨 Design Philosophy

The UI features a **brutalist/retro-modern aesthetic** with:
- Monospaced font (Space Mono) for technical feel
- High-contrast neon accent colors
- Bold, uppercase headings (Archivo Black)
- Minimal animations focused on key interactions
- Grid-based layouts with intentional asymmetry
- Dark mode optimized for long focus sessions

## 🧠 AI Features Explained

### Focus Score Calculation
Each session receives a focus score (0-100) based on:
- Completion rate
- Consistency compared to your average
- Time of day performance
- Interruption patterns

### Productivity Analysis
The AI analyzes:
- Session completion patterns
- Best performing times of day
- Task completion velocity
- Break effectiveness
- Focus duration trends

### Task Prioritization
AI considers:
- Task complexity and estimated effort
- Your historical productivity patterns
- Cognitive load distribution
- Energy levels throughout the day

## 🔐 Security

- Passwords hashed with bcryptjs
- JWT tokens for authentication
- Rate limiting on all API endpoints
- SQL injection protection with parameterized queries
- CORS configured for frontend domain only

## 📊 Database Schema

Key tables:
- `users` - User accounts
- `user_preferences` - Customizable timer settings
- `tasks` - User tasks with AI insights
- `sessions` - Pomodoro session records
- `productivity_insights` - AI-generated insights
- `ai_analysis_cache` - Caching for AI responses

## 🚧 Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Database Migrations
```bash
cd backend
npm run migrate
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Anthropic Claude API for AI capabilities
- PostgreSQL for robust data storage
- React community for excellent tooling

## 📞 Support

For issues or questions:
1. Check existing issues in the repository
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Team collaboration features
- [ ] Integration with calendar apps
- [ ] Spotify integration for focus music
- [ ] Advanced analytics dashboard
- [ ] Custom themes and appearance
- [ ] Browser extension
- [ ] Slack/Discord notifications

---

Built with ❤️ using Claude AI
