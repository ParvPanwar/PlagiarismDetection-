const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/reports
router.get('/', async (req, res) => {
  try {
    const { assignment_id } = req.query;

    if (!assignment_id) {
      return res.status(400).json({ error: 'assignment_id query parameter is required' });
    }

    // Query the view for reports matching the assignment ID
    const [rows] = await db.query('SELECT * FROM V_PLAGIARISM_REPORT WHERE assignment_id = ?', [assignment_id]);

    res.json({ success: true, reports: rows });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Database error, try again' });
  }
});

module.exports = router;
