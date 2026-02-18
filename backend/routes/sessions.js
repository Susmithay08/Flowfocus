const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const AIService = require('../services/aiService');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Start a new session
router.post('/start',
  [
    body('sessionType').isIn(['work', 'short_break', 'long_break']),
    body('taskId').optional().isInt(),
    body('plannedDuration').isInt({ min: 60 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionType, taskId, plannedDuration } = req.body;

    try {
      const result = await db.query(
        `INSERT INTO sessions 
         (user_id, task_id, session_type, planned_duration, started_at, duration) 
         VALUES ($1, $2, $3, $4, NOW(), 0)
         RETURNING *`,
        [req.user.id, taskId || null, sessionType, plannedDuration]
      );

      res.json({ session: result.rows[0] });
    } catch (error) {
      console.error('Start session error:', error);
      res.status(500).json({ error: 'Failed to start session' });
    }
  }
);

// Complete a session
router.post('/:id/complete',
  [
    body('duration').isInt({ min: 0 }),
    body('completed').isBoolean(),
    body('interrupted').optional().isBoolean(),
    body('notes').optional().isString(),
    body('productivityRating').optional().isInt({ min: 1, max: 5 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { duration, completed, interrupted, notes, productivityRating } = req.body;

    try {
      // Get session
      const sessionResult = await db.query(
        'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Get user history for focus score calculation
      const historyResult = await db.query(
        `SELECT * FROM sessions 
         WHERE user_id = $1 AND completed = true 
         ORDER BY started_at DESC LIMIT 20`,
        [req.user.id]
      );

      const session = sessionResult.rows[0];
      const focusScore = AIService.calculateFocusScore(
        { ...session, duration, completed },
        historyResult.rows
      );

      // Update session
      const result = await db.query(
        `UPDATE sessions 
         SET duration = $1, completed = $2, interrupted = $3, 
             notes = $4, productivity_rating = $5, focus_score = $6, ended_at = NOW()
         WHERE id = $7 AND user_id = $8
         RETURNING *`,
        [duration, completed, interrupted || false, notes, productivityRating, focusScore, id, req.user.id]
      );

      // If it's a completed work session, update task
      if (completed && session.session_type === 'work' && session.task_id) {
        await db.query(
          `UPDATE tasks 
           SET completed_pomodoros = completed_pomodoros + 1 
           WHERE id = $1`,
          [session.task_id]
        );
      }

      res.json({ session: result.rows[0] });
    } catch (error) {
      console.error('Complete session error:', error);
      res.status(500).json({ error: 'Failed to complete session' });
    }
  }
);

// Get sessions history
router.get('/history', async (req, res) => {
  const { startDate, endDate, limit = 50 } = req.query;

  try {
    let query = `
      SELECT s.*, t.title as task_title 
      FROM sessions s
      LEFT JOIN tasks t ON s.task_id = t.id
      WHERE s.user_id = $1
    `;
    const params = [req.user.id];

    if (startDate) {
      params.push(startDate);
      query += ` AND s.started_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND s.started_at <= $${params.length}`;
    }

    query += ` ORDER BY s.started_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await db.query(query, params);
    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Get today's sessions
router.get('/today', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, t.title as task_title 
       FROM sessions s
       LEFT JOIN tasks t ON s.task_id = t.id
       WHERE s.user_id = $1 
       AND DATE(s.started_at) = CURRENT_DATE
       ORDER BY s.started_at DESC`,
      [req.user.id]
    );

    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Get today sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Get break suggestion
router.get('/break-suggestion', async (req, res) => {
  try {
    const recentSessions = await db.query(
      `SELECT * FROM sessions 
       WHERE user_id = $1 
       ORDER BY started_at DESC LIMIT 10`,
      [req.user.id]
    );

    const currentSession = recentSessions.rows[0];
    const suggestion = await AIService.generateBreakSuggestion(
      req.user.id,
      currentSession,
      recentSessions.rows
    );

    res.json({ suggestion });
  } catch (error) {
    console.error('Break suggestion error:', error);
    res.status(500).json({ error: 'Failed to generate suggestion' });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  const { period = 'week' } = req.query; // day, week, month

  try {
    let dateFilter = '';
    if (period === 'day') {
      dateFilter = "AND DATE(started_at) = CURRENT_DATE";
    } else if (period === 'week') {
      dateFilter = "AND started_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND started_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const result = await db.query(
      `SELECT 
         COUNT(*) FILTER (WHERE session_type = 'work' AND completed = true) as completed_pomodoros,
         COUNT(*) FILTER (WHERE session_type = 'work' AND interrupted = true) as interrupted_sessions,
         SUM(duration) FILTER (WHERE session_type = 'work') / 60 as total_focus_minutes,
         AVG(focus_score) FILTER (WHERE focus_score IS NOT NULL) as avg_focus_score,
         AVG(productivity_rating) FILTER (WHERE productivity_rating IS NOT NULL) as avg_productivity_rating
       FROM sessions
       WHERE user_id = $1 ${dateFilter}`,
      [req.user.id]
    );

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;
