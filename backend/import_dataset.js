const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const argv = process.argv.slice(2);

function getArg(name, defaultValue = undefined) {
  const exact = argv.findIndex(a => a === `--${name}`);
  if (exact !== -1 && argv.length > exact + 1) return argv[exact + 1];

  const eq = argv.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=')[1];

  return defaultValue;
}

function parseCSV(content, delimiter = ',') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function normalizeColumnName(name) {
  return name.trim().toLowerCase();
}

async function getOrCreateCourse(connection, courseCode, courseName) {
  const [existing] = await connection.query(
    'SELECT course_id FROM COURSE WHERE course_code = ? LIMIT 1',
    [courseCode]
  );
  if (existing.length > 0) return existing[0].course_id;

  const [result] = await connection.query(
    'INSERT INTO COURSE (course_name, course_code) VALUES (?, ?)',
    [courseName, courseCode]
  );
  return result.insertId;
}

async function getOrCreateAssignment(connection, assignmentId, assignmentTitle, courseId) {
  if (assignmentId) {
    const [existing] = await connection.query(
      'SELECT assignment_id FROM ASSIGNMENT WHERE assignment_id = ? LIMIT 1',
      [assignmentId]
    );
    if (existing.length === 0) {
      throw new Error(`Assignment with id ${assignmentId} does not exist.`);
    }
    return assignmentId;
  }

  const [existing] = await connection.query(
    'SELECT assignment_id FROM ASSIGNMENT WHERE title = ? AND course_id = ? LIMIT 1',
    [assignmentTitle, courseId]
  );
  if (existing.length > 0) return existing[0].assignment_id;

  const [result] = await connection.query(
    'INSERT INTO ASSIGNMENT (course_id, title, due_date) VALUES (?, ?, NULL)',
    [courseId, assignmentTitle]
  );
  return result.insertId;
}

async function getOrCreateStudent(connection, studentId, studentName, studentRoll, courseId) {
  if (studentId) {
    const [existing] = await connection.query(
      'SELECT student_id FROM STUDENT WHERE student_id = ? LIMIT 1',
      [studentId]
    );
    if (existing.length === 0) {
      throw new Error(`Student with id ${studentId} does not exist.`);
    }
    return studentId;
  }

  const [existing] = await connection.query(
    'SELECT student_id FROM STUDENT WHERE roll_no = ? LIMIT 1',
    [studentRoll]
  );
  if (existing.length > 0) return existing[0].student_id;

  const [result] = await connection.query(
    'INSERT INTO STUDENT (name, roll_no, course_id) VALUES (?, ?, ?)',
    [studentName, studentRoll, courseId]
  );
  return result.insertId;
}

async function main() {
  const filePath = getArg('file');
  const textColumn = getArg('text-column');
  const assignmentIdArg = getArg('assignment-id');
  const assignmentTitle = getArg('assignment-title', 'Kaggle Reference Assignment');
  const courseCode = getArg('course-code', 'KAGGLE_REF');
  const courseName = getArg('course-name', 'Kaggle Reference Course');
  const studentIdArg = getArg('student-id');
  const studentName = getArg('student-name', 'Kaggle Reference Corpus');
  const studentRoll = getArg('student-roll', 'KAGGLE-REF-1');
  const maxRows = Number(getArg('max-rows', '1000'));
  const delimiter = getArg('separator', ',');

  if (!filePath || !textColumn) {
    console.error('Usage: node import_dataset.js --file <path> --text-column <column> [--assignment-id <id> | --assignment-title <title>] [--course-code <code>] [--student-name <name>] [--max-rows <number>]');
    process.exit(1);
  }

  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV file not found: ${absolutePath}`);
  }

  const fileContents = fs.readFileSync(absolutePath, 'utf8');
  const rows = parseCSV(fileContents, delimiter);
  if (rows.length < 2) {
    throw new Error('CSV file must include a header row and at least one data row.');
  }

  const headers = rows[0].map(normalizeColumnName);
  const textIndex = headers.indexOf(normalizeColumnName(textColumn));
  if (textIndex === -1) {
    throw new Error(`Text column '${textColumn}' not found in CSV header. Found: ${headers.join(', ')}`);
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const connection = await pool.getConnection();

  try {
    const courseId = await getOrCreateCourse(connection, courseCode, courseName);
    const assignmentId = await getOrCreateAssignment(connection, assignmentIdArg ? Number(assignmentIdArg) : null, assignmentTitle, courseId);
    const studentId = await getOrCreateStudent(connection, studentIdArg ? Number(studentIdArg) : null, studentName, studentRoll, courseId);

    console.log(`Using course_id=${courseId}, assignment_id=${assignmentId}, student_id=${studentId}`);

    let inserted = 0;
    for (let i = 1; i < rows.length && inserted < maxRows; i += 1) {
      const row = rows[i];
      const textValue = row[textIndex] ? row[textIndex].trim() : '';
      if (!textValue) continue;

      await connection.query('CALL sp_add_submission(?, ?, ?, @new_id)', [studentId, assignmentId, textValue]);
      inserted += 1;
      if (inserted % 50 === 0) {
        console.log(`Inserted ${inserted} rows...`);
      }
    }

    console.log(`Import complete. Inserted ${inserted} submissions.`);
  } catch (err) {
    console.error('Import failed:', err.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
