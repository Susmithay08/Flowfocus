import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function FlipDigit({ value }) {
  // prevVal: what was showing before this tick
  const prevRef = React.useRef(value);
  // animKey: incrementing this forces React to remount the flap (restarts CSS animation)
  const [animKey, setAnimKey] = React.useState(0);
  const [fromVal, setFromVal] = React.useState(value);

  // Detect change synchronously during render (avoids useEffect lag)
  if (prevRef.current !== value) {
    setFromVal(prevRef.current);   // snapshot old value for the flap
    setAnimKey(k => k + 1);        // force flap remount to restart animation
    prevRef.current = value;       // update ref immediately
  }

  return (
    <div className="flip-digit">
      {/* Bottom half: always shows the NEW value (visible under the flap) */}
      <div className="flip-digit__bottom">
        <span className="flip-digit__half-text">{value}</span>
      </div>

      {/* Top half: always shows the NEW value (static, revealed after flap folds away) */}
      <div className="flip-digit__top">
        <span className="flip-digit__half-text">{value}</span>
      </div>

      {/* The flap: shows OLD value on top, animates rotating down to reveal new top */}
      <div className="flip-digit__flap" key={animKey}>
        <span className="flip-digit__half-text">{fromVal}</span>
      </div>

      <div className="flip-digit__divider" />
    </div>
  );
}


function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [view, setView] = useState('timer');

  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const [timerType, setTimerType] = useState('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [stats, setStats] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [todaySessions, setTodaySessions] = useState([]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserData();
    }
  }, [token]);

  const fetchUserData = async () => {
    try {
      const [userRes, tasksRes, prefsRes, sessionsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/auth/me`),
        axios.get(`${API_URL}/tasks`),
        axios.get(`${API_URL}/preferences`),
        axios.get(`${API_URL}/sessions/today`),
        axios.get(`${API_URL}/sessions/stats?period=day`)
      ]);
      setUser(userRes.data.user);
      setTasks(tasksRes.data.tasks);
      setPreferences(prefsRes.data.preferences);
      setTodaySessions(sessionsRes.data.sessions);
      setStats(statsRes.data.stats);
      if (prefsRes.data.preferences) {
        setTimeLeft(prefsRes.data.preferences.work_duration * 60);
      }
    } catch (error) {
      if (error.response?.status === 401) handleLogout();
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const payload = authMode === 'login' ? { email, password } : { email, password, name };
      const response = await axios.post(`${API_URL}${endpoint}`, payload);
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
    } catch (error) {
      alert(error.response?.data?.error || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setEmail('');        // ADD
    setPassword('');     // ADD
    setName('');         // ADD
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      completeSession();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const startSession = async () => {
    try {
      const duration = timerType === 'work'
        ? (preferences?.work_duration || 25) * 60
        : timerType === 'short_break'
          ? (preferences?.short_break_duration || 5) * 60
          : (preferences?.long_break_duration || 15) * 60;
      const response = await axios.post(`${API_URL}/sessions/start`, {
        sessionType: timerType,
        taskId: currentTask?.id,
        plannedDuration: duration
      });
      setCurrentSessionId(response.data.session.id);
      setSessionStartTime(Date.now());
      setTimeLeft(duration);
      setIsRunning(true);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const pauseSession = () => setIsRunning(false);

  const completeSession = async () => {
    if (!currentSessionId) return;
    try {
      const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
      await axios.post(`${API_URL}/sessions/${currentSessionId}/complete`, {
        duration, completed: timeLeft === 0, interrupted: timeLeft > 0
      });
      setIsRunning(false);
      setCurrentSessionId(null);
      fetchUserData();
      if (timerType === 'work' && timeLeft === 0) {
        const completedWork = todaySessions.filter(s => s.session_type === 'work' && s.completed).length + 1;
        const shouldLongBreak = completedWork % (preferences?.sessions_until_long_break || 4) === 0;
        setTimerType(shouldLongBreak ? 'long_break' : 'short_break');
        setTimeLeft(shouldLongBreak ? (preferences?.long_break_duration || 15) * 60 : (preferences?.short_break_duration || 5) * 60);
      } else if (timeLeft === 0) {
        setTimerType('work');
        setTimeLeft((preferences?.work_duration || 25) * 60);
      }
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (currentSessionId) completeSession();
    const duration = timerType === 'work'
      ? (preferences?.work_duration || 25) * 60
      : timerType === 'short_break'
        ? (preferences?.short_break_duration || 5) * 60
        : (preferences?.long_break_duration || 15) * 60;
    setTimeLeft(duration);
  };

  const switchTimerType = (type) => {
    if (isRunning) {
      if (!window.confirm('Stop current session?')) return;
      completeSession();
    }
    setTimerType(type);
    const duration = type === 'work'
      ? (preferences?.work_duration || 25) * 60
      : type === 'short_break'
        ? (preferences?.short_break_duration || 5) * 60
        : (preferences?.long_break_duration || 15) * 60;
    setTimeLeft(duration);
  };

  const addTask = async (title) => {
    try {
      const response = await axios.post(`${API_URL}/tasks`, { title });
      setTasks([...tasks, response.data.task]);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(`${API_URL}/tasks/${taskId}`);
      setTasks(tasks.filter(task => task.id !== taskId));
      if (currentTask?.id === taskId) setCurrentTask(null);
    } catch (error) {
      alert('Failed to delete task. Please try again.');
    }
  };

  const fetchAIInsights = async () => {
    try {
      const response = await axios.get(`${API_URL}/insights/productivity?days=7`);
      setAiInsights(response.data);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    }
  };

  // Compute digit values
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const m1 = Math.floor(mins / 10);
  const m2 = mins % 10;
  const s1 = Math.floor(secs / 10);
  const s2 = secs % 10;

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Flow<span className="accent">•</span>Focus</h1>
          <p className="auth-subtitle">AI-Powered Pomodoro Timer</p>
          <form onSubmit={handleAuth} className="auth-form" autoComplete="off">
            {authMode === 'register' && (
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <button type="submit" className="auth-button">{authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
          </form>
          <p className="auth-switch">
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="switch-button">
              {authMode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="navbar">
        <h1 className="logo">Flow<span className="accent">•</span>Focus</h1>
        <div className="nav-links">
          <button className={view === 'timer' ? 'active' : ''} onClick={() => setView('timer')}>Timer</button>
          <button className={view === 'tasks' ? 'active' : ''} onClick={() => setView('tasks')}>Tasks</button>
          <button className={view === 'insights' ? 'active' : ''} onClick={() => { setView('insights'); fetchAIInsights(); }}>AI Insights</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <main className="main-content">
        {view === 'timer' && (
          <div className="timer-view">
            <div className="timer-card">
              <div className="timer-modes">
                <button className={timerType === 'work' ? 'active' : ''} onClick={() => switchTimerType('work')}>Focus</button>
                <button className={timerType === 'short_break' ? 'active' : ''} onClick={() => switchTimerType('short_break')}>Short Break</button>
                <button className={timerType === 'long_break' ? 'active' : ''} onClick={() => switchTimerType('long_break')}>Long Break</button>
              </div>

              <div className="timer-display">
                <div className="flip-clock">
                  {/* MINUTES */}
                  <div className="flip-group">
                    <FlipDigit value={m1} />
                    <FlipDigit value={m2} />
                  </div>

                  <div className="flip-separator">
                    <span className="flip-dot" />
                    <span className="flip-dot" />
                  </div>

                  {/* SECONDS */}
                  <div className="flip-group">
                    <FlipDigit value={s1} />
                    <FlipDigit value={s2} />
                  </div>
                </div>
                <div className="timer-label">{timerType === 'work' ? 'FOCUS SESSION' : timerType === 'short_break' ? 'SHORT BREAK' : 'LONG BREAK'}</div>
              </div>

              {currentTask && (
                <div className="current-task">Working on: <strong>{currentTask.title}</strong></div>
              )}

              <div className="timer-controls">
                {!isRunning ? (
                  <button className="control-button start" onClick={startSession}>Start</button>
                ) : (
                  <button className="control-button pause" onClick={pauseSession}>Pause</button>
                )}
                <button className="control-button reset" onClick={resetTimer}>Reset</button>
              </div>
            </div>

            <div className="sidebar">
              <div className="stats-card">
                <h3>Today's Progress</h3>
                <div className="stat-item">
                  <span className="stat-label">Pomodoros</span>
                  <span className="stat-value">{stats?.completed_pomodoros || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Focus Minutes</span>
                  <span className="stat-value">{Math.round(stats?.total_focus_minutes || 0)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Focus Score</span>
                  <span className="stat-value">{stats?.avg_focus_score ? Math.round(stats.avg_focus_score) : '-'}</span>
                </div>
              </div>

              <div className="quick-tasks">
                <h3>Quick Tasks</h3>
                {tasks.slice(0, 5).map(task => (
                  <div key={task.id} className={`task-item ${currentTask?.id === task.id ? 'active' : ''}`} onClick={() => setCurrentTask(task)}>
                    <span>{task.title}</span>
                    <span className="task-progress">{task.completed_pomodoros}/{task.estimated_pomodoros}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'tasks' && (
          <div className="tasks-view">
            <h2>Your Tasks</h2>
            <TaskManager tasks={tasks} setTasks={setTasks} addTask={addTask} deleteTask={deleteTask} />
          </div>
        )}

        {view === 'insights' && (
          <div className="insights-view">
            <h2>AI-Powered Insights</h2>
            {aiInsights ? <AIInsightsDisplay insights={aiInsights} /> : <p>Loading insights...</p>}
          </div>
        )}
      </main>
    </div>
  );
}

function TaskManager({ tasks, setTasks, addTask, deleteTask }) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if (newTaskTitle.trim()) { addTask(newTaskTitle); setNewTaskTitle(''); }
  };
  return (
    <div className="task-manager">
      <form onSubmit={handleSubmit} className="add-task-form">
        <input type="text" placeholder="Add a new task..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
        <button type="submit">Add Task</button>
      </form>
      <div className="tasks-list">
        {tasks.map(task => (
          <div key={task.id} className="task-card">
            <div className="task-content">
              <h4>{task.title}</h4>
              {task.description && <p>{task.description}</p>}
              <div className="task-meta">
                <span className="priority">{task.priority}</span>
                <span>{task.completed_pomodoros}/{task.estimated_pomodoros} pomodoros</span>
              </div>
            </div>
            <button className="delete-task-btn" onClick={() => deleteTask(task.id)} title="Delete task">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIInsightsDisplay({ insights }) {
  return (
    <div className="ai-insights">
      <div className="insight-card highlight">
        <h3>Summary</h3>
        <p>{insights.summary}</p>
        <div className="focus-score">
          <span>Focus Score</span>
          <strong>{insights.focusScore}/100</strong>
        </div>
      </div>
      <div className="insight-card">
        <h3>Trends</h3>
        <ul>{insights.trends?.map((trend, i) => <li key={i}>{trend}</li>)}</ul>
      </div>
      <div className="insight-card">
        <h3>Suggestions</h3>
        <ul>{insights.suggestions?.map((suggestion, i) => <li key={i}>{suggestion}</li>)}</ul>
      </div>
      {insights.breakRecommendations && (
        <div className="insight-card">
          <h3>Break Strategy</h3>
          <p><strong>Timing:</strong> {insights.breakRecommendations.timing}</p>
          <p><strong>Duration:</strong> {insights.breakRecommendations.duration}</p>
          <p>{insights.breakRecommendations.reasoning}</p>
        </div>
      )}
    </div>
  );
}

export default App;