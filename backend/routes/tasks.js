const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const AIService = require('../services/aiService');

const router = express.Router();
router.use(authMiddleware);

// Get all tasks
router.get('/', async (req, res) => {
  const { status = 'active' } = req.query;

  try {
    const result = await db.query(
      `SELECT * FROM tasks 
       WHERE user_id = $1 AND status = $2
       ORDER BY 
         CASE priority 
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         created_at DESC`,
      [req.user.id, status]
    );

    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Create task
router.post('/',
  [
    body('title').trim().notEmpty(),
    body('description').optional().isString(),
    body('estimatedPomodoros').optional().isInt({ min: 1 }),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, estimatedPomodoros, priority } = req.body;

    try {
      const result = await db.query(
        `INSERT INTO tasks 
         (user_id, title, description, estimated_pomodoros, priority)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [req.user.id, title, description || null, estimatedPomodoros || 1, priority || 'medium']
      );

      res.status(201).json({ task: result.rows[0] });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  }
);

// Update task
router.put('/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().isString(),
    body('estimatedPomodoros').optional().isInt({ min: 1 }),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('status').optional().isIn(['active', 'completed', 'archived'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    try {
      // Build dynamic update query
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = fields.map((field, i) => {
        const snakeField = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        return `${snakeField} = $${i + 1}`;
      }).join(', ');

      values.push(id, req.user.id);

      const result = await db.query(
        `UPDATE tasks 
         SET ${setClause}, updated_at = NOW()
         WHERE id = $${values.length - 1} AND user_id = $${values.length}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // If marked as completed, set completed_at
      if (updates.status === 'completed') {
        await db.query(
          'UPDATE tasks SET completed_at = NOW() WHERE id = $1',
          [id]
        );
      }

      res.json({ task: result.rows[0] });
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  }
);

// Delete task
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get AI prioritization
router.get('/prioritize', async (req, res) => {
  try {
    const tasksResult = await db.query(
      'SELECT * FROM tasks WHERE user_id = $1 AND status = $2',
      [req.user.id, 'active']
    );

    const sessionsResult = await db.query(
      `SELECT * FROM sessions 
       WHERE user_id = $1 
       ORDER BY started_at DESC LIMIT 50`,
      [req.user.id]
    );

    const prioritization = await AIService.prioritizeTasks(
      req.user.id,
      tasksResult.rows,
      sessionsResult.rows
    );

    res.json(prioritization);
  } catch (error) {
    console.error('Prioritize tasks error:', error);
    res.status(500).json({ error: 'Failed to prioritize tasks' });
  }
});

module.exports = router;
