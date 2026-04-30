const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db');
const extractText = require('../utils/extractText');
const cleanText = require('../utils/cleanText');

// Setup multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow PDF, DOCX, and PY files
    if (
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'text/x-python' ||
      file.originalname.endsWith('.py')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Wrong file type'), false);
    }
  }
});

// POST /api/submit
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { student_id, assignment_id } = req.body;
    const file = req.file;

    if (!student_id || !assignment_id || !file) {
      return res.status(400).json({ error: 'student_id, assignment_id and file are required' });
    }

    // Extract and clean text
    const rawText = await extractText(file.buffer, file.mimetype);
    const cleanedText = cleanText(rawText);

    // Get a dedicated connection from the pool for the transaction
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Call sp_add_submission which should set @id
      await connection.query('CALL sp_add_submission(?, ?, ?, @id)', [student_id, assignment_id, cleanedText]);
      
      // Fetch the generated submission_id
      const [idResult] = await connection.query('SELECT @id AS id');
      const submissionId = idResult[0].id;

      // Call sp_run_plagiarism using the generated @id and a threshold of 40.00
      await connection.query('CALL sp_run_plagiarism(@id, 40.00)');
      
      await connection.commit();

      // Fetch the generated report
      const [rows] = await connection.query('SELECT * FROM V_PLAGIARISM_REPORT WHERE submission1_id = @id');
      
      connection.release();
      res.json({ success: true, submission_id: submissionId, report: rows });

    } catch (dbError) {
      await connection.rollback();
      connection.release();
      console.error('Database Transaction Error:', dbError);
      res.status(500).json({ error: 'Database error, try again' });
    }
  } catch (err) {
    console.error('Submission Error:', err);
    if (err.message === 'Wrong file type') {
      res.status(400).json({ error: 'Only PDF and DOCX files are allowed' });
    } else {
      res.status(500).json({ error: 'Failed to process submission' });
    }
  }
});

// Error handling middleware for Multer errors (like fileFilter throwing Error)
router.use((err, req, res, next) => {
  if (err.message === 'Wrong file type') {
    res.status(400).json({ error: 'Only PDF and DOCX files are allowed' });
  } else if (err instanceof multer.MulterError) {
    res.status(400).json({ error: 'File upload error' });
  } else {
    next(err);
  }
});

module.exports = router;
