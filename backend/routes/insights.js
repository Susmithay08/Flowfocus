const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const AIService = require('../services/aiService');

const router = express.Router();
router.use(authMiddleware);

// Get productivity analysis
router.get('/productivity', async (req, res) => {
  const { days = 7 } = req.query;

  try {
    const sessionsResult = await db.query(
      `SELECT * FROM sessions 
       WHERE user_id = $1 
       AND started_at >= NOW() - INTERVAL '${parseInt(days)} days'
       ORDER BY started_at DESC`,
      [req.user.id]
    );

    const tasksResult = await db.query(
      'SELECT * FROM tasks WHERE user_id = $1 AND status = $2',
      [req.user.id, 'active']
    );

    const analysis = await AIService.analyzeProductivity(
      req.user.id,
      sessionsResult.rows,
      tasksResult.rows
    );

    // Store insight
    await db.query(
      `INSERT INTO productivity_insights 
       (user_id, insight_type, content, metadata, period_start, period_end)
       VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${parseInt(days)} days', NOW())`,
      [
        req.user.id,
        'productivity_analysis',
        JSON.stringify(analysis),
        JSON.stringify(analysis)
      ]
    );

    res.json(analysis);
  } catch (error) {
    console.error('Productivity analysis error:', error);
    res.status(500).json({ error: 'Failed to generate analysis' });
  }
});

// Get daily summary
router.get('/daily-summary', async (req, res) => {
  try {
    const sessionsResult = await db.query(
      `SELECT * FROM sessions 
       WHERE user_id = $1 
       AND DATE(started_at) = CURRENT_DATE`,
      [req.user.id]
    );

    const tasksResult = await db.query(
      `SELECT t.* FROM tasks t
       INNER JOIN sessions s ON t.id = s.task_id
       WHERE t.user_id = $1 
       AND DATE(s.started_at) = CURRENT_DATE
       GROUP BY t.id`,
      [req.user.id]
    );

    const summary = await AIService.generateDailySummary(
      req.user.id,
      sessionsResult.rows,
      tasksResult.rows
    );

    // Store insight
    await db.query(
      `INSERT INTO productivity_insights 
       (user_id, insight_type, content, metadata, period_start, period_end)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE)`,
      [
        req.user.id,
        'daily_summary',
        JSON.stringify(summary),
        JSON.stringify(summary)
      ]
    );

    res.json(summary);
  } catch (error) {
    console.error('Daily summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Get recent insights
router.get('/recent', async (req, res) => {
  const { limit = 10 } = req.query;

  try {
    const result = await db.query(
      `SELECT * FROM productivity_insights 
       WHERE user_id = $1 
       ORDER BY generated_at DESC 
       LIMIT $2`,
      [req.user.id, limit]
    );

    res.json({ insights: result.rows });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// Mark insight as viewed
router.put('/:id/viewed', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `UPDATE productivity_insights 
       SET viewed = true 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insight not found' });
    }

    res.json({ insight: result.rows[0] });
  } catch (error) {
    console.error('Mark viewed error:', error);
    res.status(500).json({ error: 'Failed to mark insight as viewed' });
  }
});

module.exports = router;
