const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
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

function normalizePath(inputPath) {
  if (!inputPath) return inputPath;
  return path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);
}

function listFilesRecursive(dir, exts = ['.py']) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFilesRecursive(fullPath, exts));
    } else if (entry.isFile()) {
      if (exts.includes(path.extname(entry.name).toLowerCase())) {
        result.push(fullPath);
      }
    }
  }
  return result;
}

async function getOrCreateCourse(connection, courseCode, courseName) {
  const [existing] = await connection.query('SELECT course_id FROM COURSE WHERE course_code = ? LIMIT 1', [courseCode]);
  if (existing.length > 0) return existing[0].course_id;
  const [result] = await connection.query('INSERT INTO COURSE (course_name, course_code) VALUES (?, ?)', [courseName, courseCode]);
  return result.insertId;
}

async function getOrCreateAssignment(connection, assignmentId, assignmentTitle, courseId) {
  if (assignmentId) {
    const [existing] = await connection.query('SELECT assignment_id FROM ASSIGNMENT WHERE assignment_id = ? LIMIT 1', [assignmentId]);
    if (existing.length === 0) {
      throw new Error(`Assignment with id ${assignmentId} does not exist.`);
    }
    return assignmentId;
  }
  const [existing] = await connection.query('SELECT assignment_id FROM ASSIGNMENT WHERE title = ? AND course_id = ? LIMIT 1', [assignmentTitle, courseId]);
  if (existing.length > 0) return existing[0].assignment_id;
  const [result] = await connection.query('INSERT INTO ASSIGNMENT (course_id, title, due_date) VALUES (?, ?, NULL)', [courseId, assignmentTitle]);
  return result.insertId;
}

async function getOrCreateStudent(connection, studentName, studentRoll, courseId) {
  const [existing] = await connection.query('SELECT student_id FROM STUDENT WHERE roll_no = ? LIMIT 1', [studentRoll]);
  if (existing.length > 0) return existing[0].student_id;
  const [result] = await connection.query('INSERT INTO STUDENT (name, roll_no, course_id) VALUES (?, ?, ?)', [studentName, studentRoll, courseId]);
  return result.insertId;
}

async function main() {
  const archivePath = getArg('archive');
  const folderPath = getArg('folder');
  const courseCode = getArg('course-code', 'KAGGLE_PYTHON_CORPUS');
  const courseName = getArg('course-name', 'Kaggle Python Corpus');
  const assignmentTitle = getArg('assignment-title', 'Kaggle Python Dataset');
  const maxFiles = Number(getArg('max-files', '500'));
  const baseRoll = getArg('base-roll', 'KAGGLE_FILE');
  const baseStudentName = getArg('base-name', 'Kaggle File');

  if (!archivePath && !folderPath) {
    console.error('Usage: node import_python_submissions.js --archive <path-to-zip> | --folder <path-to-directory> [--assignment-title <title>] [--course-code <code>] [--max-files <n>]');
    process.exit(1);
  }

  const resolvedFolder = folderPath ? normalizePath(folderPath) : null;
  const resolvedArchive = archivePath ? normalizePath(archivePath) : null;

  let importFolder;
  if (resolvedArchive) {
    if (!fs.existsSync(resolvedArchive)) {
      throw new Error(`Archive file not found: ${resolvedArchive}`);
    }
    const tmp = path.join(__dirname, 'tmp_python_import');
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    console.log(`Extracting archive to ${tmp} ...`);
    execSync(`unzip -qo "${resolvedArchive}" -d "${tmp}"`, { stdio: 'ignore' });
    importFolder = tmp;
  } else {
    importFolder = resolvedFolder;
  }

  if (!fs.existsSync(importFolder)) {
    throw new Error(`Import folder does not exist: ${importFolder}`);
  }

  const pyFiles = listFilesRecursive(importFolder, ['.py']);
  if (pyFiles.length === 0) {
    throw new Error(`No Python files found in ${importFolder}`);
  }

  const filesToImport = pyFiles.slice(0, maxFiles);
  console.log(`Found ${pyFiles.length} Python files, importing ${filesToImport.length}...`);

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
    const assignmentId = await getOrCreateAssignment(connection, null, assignmentTitle, courseId);

    let imported = 0;
    for (const filePath of filesToImport) {
      const fileName = path.basename(filePath);
      const studentName = `${baseStudentName} ${fileName}`;
      const studentRoll = `${baseRoll}_${fileName.replace(/\W+/g, '_')}`;

      const studentId = await getOrCreateStudent(connection, studentName, studentRoll, courseId);
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (!content) continue;

      await connection.query('CALL sp_add_submission(?, ?, ?, @new_id)', [studentId, assignmentId, content]);
      imported += 1;
      if (imported % 50 === 0) {
        console.log(`Imported ${imported} files...`);
      }
    }

    console.log(`Import complete. Total imported files: ${imported}`);
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
