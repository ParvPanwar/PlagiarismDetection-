const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/submissions/:student_id
router.get('/:student_id', async (req, res) => {
  try {
    const studentId = req.params.student_id;

    const query = `
      SELECT 
          s.submission_id, 
          s.assignment_id, 
          s.file_name,
          a.title AS assignment_title, 
          s.submitted_at,
          COALESCE(MAX(pr.similarity_pct), 0) AS highest_similarity,
          COALESCE(MAX(pr.common_token_count), 0) AS max_similar_words,
          CASE 
              WHEN SUM(CASE WHEN pr.is_flagged = 'Y' THEN 1 ELSE 0 END) > 0 THEN 'FLAGGED'
              ELSE 'SAFE'
          END AS status
      FROM Submission s
      JOIN Assignment a ON s.assignment_id = a.assignment_id
      LEFT JOIN Plagiarism_Report pr 
          ON pr.submission1_id = s.submission_id OR pr.submission2_id = s.submission_id
      WHERE s.student_id = ?
      GROUP BY s.submission_id, s.assignment_id, s.file_name, a.title, s.submitted_at
      ORDER BY s.submitted_at DESC
    `;

    const [rows] = await db.query(query, [studentId]);
    res.json(rows); // Returns array (empty array if no submissions found)
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Database error, try again' });
  }
});

module.exports = router;
