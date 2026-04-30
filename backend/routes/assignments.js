const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/assignments
// Returns a list of all active assignments
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT assignment_id, title FROM Assignment ORDER BY due_date DESC'
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Database error fetching assignments' });
  }
});

module.exports = router;
