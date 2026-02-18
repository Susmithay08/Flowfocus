const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get preferences
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Create default preferences if they don't exist
      const createResult = await db.query(
        'INSERT INTO user_preferences (user_id) VALUES ($1) RETURNING *',
        [req.user.id]
      );
      return res.json({ preferences: createResult.rows[0] });
    }

    res.json({ preferences: result.rows[0] });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Update preferences
router.put('/',
  [
    body('workDuration').optional().isInt({ min: 1, max: 60 }),
    body('shortBreakDuration').optional().isInt({ min: 1, max: 30 }),
    body('longBreakDuration').optional().isInt({ min: 1, max: 60 }),
    body('sessionsUntilLongBreak').optional().isInt({ min: 1, max: 10 }),
    body('autoStartBreaks').optional().isBoolean(),
    body('autoStartPomodoros').optional().isBoolean(),
    body('notificationSound').optional().isBoolean(),
    body('dailyGoal').optional().isInt({ min: 1, max: 20 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = req.body;

    try {
      // Build dynamic update query
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const setClause = fields.map((field, i) => {
        const snakeField = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        return `${snakeField} = $${i + 1}`;
      }).join(', ');

      values.push(req.user.id);

      const result = await db.query(
        `UPDATE user_preferences 
         SET ${setClause}, updated_at = NOW()
         WHERE user_id = $${values.length}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        // Create if doesn't exist
        const createResult = await db.query(
          'INSERT INTO user_preferences (user_id) VALUES ($1) RETURNING *',
          [req.user.id]
        );
        return res.json({ preferences: createResult.rows[0] });
      }

      res.json({ preferences: result.rows[0] });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  }
);

module.exports = router;
