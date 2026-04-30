require('dotenv').config();
const express = require('express');
const cors = require('cors');

const submitRoute = require('./routes/submit');
const reportsRoute = require('./routes/reports');
const submissionsRoute = require('./routes/submissions');
const reportByIdRoute = require('./routes/reportById');
const assignmentsRoute = require('./routes/assignments');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/submit', submitRoute);
app.use('/api/reports', reportsRoute);
app.use('/api/submissions', submissionsRoute);
app.use('/api/report', reportByIdRoute);
app.use('/api/assignments', assignmentsRoute);

// Basic health check
app.get('/', (req, res) => {
  res.send('Plagiarism Detection Backend is running');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
