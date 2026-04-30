const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/report/:submission_id
router.get('/:submission_id', async (req, res) => {
  try {
    const submissionId = req.params.submission_id;

    const [rows] = await db.query(
      'SELECT * FROM V_PLAGIARISM_REPORT WHERE submission1_id = ?', 
      [submissionId]
    );

    res.json(rows); // Returns JSON array
  } catch (error) {
    console.error('Error fetching report by submission ID:', error);
    res.status(500).json({ error: 'Database error, try again' });
  }
});

module.exports = router;
