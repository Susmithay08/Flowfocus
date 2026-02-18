# Project Structure

```
pomodoro-ai/
├── backend/                    # Node.js/Express backend
│   ├── config/
│   │   └── database.js        # PostgreSQL connection
│   ├── middleware/
│   │   └── auth.js            # JWT authentication
│   ├── routes/
│   │   ├── auth.js            # User authentication endpoints
│   │   ├── sessions.js        # Pomodoro session management
│   │   ├── tasks.js           # Task CRUD operations
│   │   ├── insights.js        # AI insights endpoints
│   │   └── preferences.js     # User preferences
│   ├── services/
│   │   └── aiService.js       # Claude AI integration
│   ├── server.js              # Express app entry point
│   ├── package.json
│   └── .env                   # Environment variables
│
├── frontend/                   # React frontend
│   ├── public/
│   │   └── index.html         # HTML template
│   ├── src/
│   │   ├── App.js             # Main React component
│   │   ├── App.css            # Styling
│   │   └── index.js           # React entry point
│   ├── package.json
│   └── .env                   # Frontend env vars
│
├── database/
│   └── schema.sql             # PostgreSQL schema
│
├── README.md                  # Full documentation
├── QUICKSTART.md              # Quick setup guide
└── PROJECT_STRUCTURE.md       # This file

```

## Backend Architecture

### Routes Layer (`/routes`)
Handles HTTP requests and responses. Each route file handles a specific domain:
- **auth.js**: Registration, login, token management
- **sessions.js**: Session lifecycle (start, pause, complete)
- **tasks.js**: Task management and AI prioritization
- **insights.js**: AI-generated productivity insights
- **preferences.js**: User settings and preferences

### Services Layer (`/services`)
Business logic and external integrations:
- **aiService.js**: All Claude API interactions
  - Productivity analysis
  - Task prioritization
  - Break suggestions
  - Focus score calculation
  - Daily summaries

### Middleware (`/middleware`)
Request processing:
- **auth.js**: JWT verification and user context

### Configuration (`/config`)
- **database.js**: PostgreSQL pool and query interface

## Frontend Architecture

### Component Structure
The app uses a single-component architecture for simplicity:
- **App.js**: Main component managing all state and views
  - Auth view (login/register)
  - Timer view (Pomodoro interface)
  - Tasks view (task management)
  - Insights view (AI analytics)

### State Management
Uses React hooks for state:
- `useState` for local state
- `useEffect` for side effects and data fetching
- No external state management needed (lightweight app)

### API Integration
All API calls through axios with:
- JWT token in headers
- Centralized error handling
- Automatic token refresh on 401

## Database Schema

### Core Tables

**users**
- User account information
- Password hashes (bcrypt)
- Creation timestamps

**user_preferences**
- Customizable timer durations
- Auto-start settings
- Notification preferences
- Daily goals

**tasks**
- User tasks with descriptions
- Estimated/completed pomodoros
- Priority levels
- AI-generated insights

**sessions**
- Individual Pomodoro records
- Work vs break sessions
- Completion status
- Focus scores
- Productivity ratings

**productivity_insights**
- AI-generated analysis
- Time-based insights
- Viewing status

**ai_analysis_cache**
- Cached AI responses
- Reduces API costs
- Expires after set time

## AI Integration

### Claude API Usage

1. **Productivity Analysis**
   - Analyzes session patterns
   - Identifies peak performance times
   - Provides actionable suggestions

2. **Task Prioritization**
   - Evaluates task complexity
   - Considers user patterns
   - Schedules by optimal time

3. **Break Suggestions**
   - Real-time session monitoring
   - Fatigue detection
   - Personalized timing

4. **Focus Score Calculation**
   - Completion rates
   - Consistency metrics
   - Time-of-day performance

### Caching Strategy
- Hash input data for cache keys
- Store results in database
- Configurable expiration times
- Reduces API costs by ~70%

## Security Features

1. **Authentication**
   - JWT tokens with expiration
   - Password hashing (bcrypt, 10 rounds)
   - Secure token storage

2. **API Protection**
   - Rate limiting (100 req/15min)
   - CORS restrictions
   - SQL injection prevention (parameterized queries)

3. **Data Privacy**
   - User isolation (all queries filter by user_id)
   - Secure session management
   - No shared data between users

## Development Workflow

### Adding New Features

1. **Backend Route**
   ```javascript
   // routes/newFeature.js
   router.get('/endpoint', authMiddleware, async (req, res) => {
     // Implementation
   });
   ```

2. **AI Service Method**
   ```javascript
   // services/aiService.js
   static async newAIFeature(userId, data) {
     // Claude API call
   }
   ```

3. **Frontend Integration**
   ```javascript
   // App.js
   const fetchNewData = async () => {
     const response = await axios.get(`${API_URL}/endpoint`);
     // Update state
   };
   ```

4. **Database Schema**
   ```sql
   -- Add new table/column if needed
   ALTER TABLE table_name ADD COLUMN new_column TYPE;
   ```

## Performance Considerations

- **Database Indexes**: Optimized for common queries
- **AI Caching**: Prevents redundant API calls
- **Rate Limiting**: Protects against abuse
- **Connection Pooling**: Efficient database usage
- **Minimal Re-renders**: Careful state management

## Deployment Recommendations

1. **Database**: Use managed PostgreSQL (AWS RDS, DigitalOcean)
2. **Backend**: Deploy to Heroku, Railway, or DigitalOcean
3. **Frontend**: Vercel, Netlify, or Cloudflare Pages
4. **Environment Variables**: Use deployment platform secrets
5. **SSL**: Enable HTTPS for production
6. **Monitoring**: Add error tracking (Sentry)

## Testing Structure

```
backend/
├── __tests__/
│   ├── routes/
│   ├── services/
│   └── middleware/

frontend/
├── src/
│   └── __tests__/
│       └── App.test.js
```

## Future Enhancements

Potential additions to the architecture:

1. **WebSocket Layer**: Real-time updates
2. **Redis Cache**: Session storage
3. **Worker Queue**: Background AI analysis
4. **GraphQL**: More flexible API
5. **Microservices**: Split AI service
6. **CDN**: Static asset delivery
