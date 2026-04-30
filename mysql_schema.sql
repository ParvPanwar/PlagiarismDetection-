-- ============================================================
-- SQL-Based Plagiarism Detection System
-- MySQL Migration Schema
-- This script creates tables, inserts sample data, and creates
-- the exact stored procedures required by the Node.js backend.
-- ============================================================

-- Drop tables if they exist to allow clean runs
DROP TABLE IF EXISTS Audit_Log;
DROP TABLE IF EXISTS Plagiarism_Report;
DROP TABLE IF EXISTS Token;
DROP TABLE IF EXISTS Submission;
DROP TABLE IF EXISTS Assignment;
DROP TABLE IF EXISTS Student;
DROP TABLE IF EXISTS Faculty;
DROP TABLE IF EXISTS Course;

-- ─────────────────────────────────────────────
-- TABLES (DDL)
-- ─────────────────────────────────────────────

CREATE TABLE Course (
    course_id   INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(10)  NOT NULL UNIQUE,
    course_name VARCHAR(100) NOT NULL
);

CREATE TABLE Faculty (
    faculty_id   INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(80) NOT NULL,
    email        VARCHAR(80) NOT NULL UNIQUE,
    course_id    INT         NOT NULL,
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);

CREATE TABLE Student (
    student_id  INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(80) NOT NULL,
    roll_no     VARCHAR(20) NOT NULL UNIQUE,
    course_id   INT         NOT NULL,
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);

CREATE TABLE Assignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id     INT         NOT NULL,
    faculty_id    INT         NOT NULL,
    title         VARCHAR(150) NOT NULL,
    due_date      DATE         NOT NULL,
    FOREIGN KEY (course_id)  REFERENCES Course(course_id),
    FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id)
);

CREATE TABLE Submission (
    submission_id  INT AUTO_INCREMENT PRIMARY KEY,
    student_id     INT          NOT NULL,
    assignment_id  INT          NOT NULL,
    file_name      VARCHAR(200) NOT NULL,
    file_type      VARCHAR(10)  NOT NULL, 
    submitted_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    word_count     INT          NOT NULL DEFAULT 0,
    FOREIGN KEY (student_id)    REFERENCES Student(student_id),
    FOREIGN KEY (assignment_id) REFERENCES Assignment(assignment_id),
    UNIQUE (student_id, assignment_id)
);

CREATE TABLE Token (
    token_id      INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT          NOT NULL,
    token_text    VARCHAR(100) NOT NULL,
    frequency     INT          NOT NULL DEFAULT 1,
    FOREIGN KEY (submission_id) REFERENCES Submission(submission_id),
    UNIQUE (submission_id, token_text)
);

CREATE TABLE Plagiarism_Report (
    report_id          INT AUTO_INCREMENT PRIMARY KEY,
    submission1_id     INT   NOT NULL,
    submission2_id     INT   NOT NULL,
    common_token_count INT   NOT NULL DEFAULT 0,
    union_token_count  INT   NOT NULL DEFAULT 1,
    similarity_pct     DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    is_flagged         CHAR(1)      NOT NULL DEFAULT 'N',
    generated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission1_id) REFERENCES Submission(submission_id),
    FOREIGN KEY (submission2_id) REFERENCES Submission(submission_id),
    UNIQUE (submission1_id, submission2_id)
);

CREATE TABLE Audit_Log (
    log_id     INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(30)   NOT NULL,
    detail     VARCHAR(500),
    logged_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- SAMPLE DATA (DML)
-- ─────────────────────────────────────────────

INSERT INTO Course (course_id, course_code, course_name) VALUES 
(1, 'UCS310', 'Database Management Systems'),
(2, 'UCS301', 'Object Oriented Programming');

INSERT INTO Faculty (faculty_id, name, email, course_id) VALUES 
(1, 'Dr. Anil Sharma', 'anil.sharma@thapar.edu', 1),
(2, 'Dr. Neha Gupta', 'neha.gupta@thapar.edu', 1);

INSERT INTO Student (student_id, name, roll_no, course_id) VALUES 
(1, 'Parv Panwar', '1024030226', 1),
(2, 'Manan Dhingra', '1024030222', 1),
(3, 'Arjun Mehta', '1024030201', 1),
(1001, 'Test Student', '1001', 1); -- Test student for API

INSERT INTO Assignment (assignment_id, course_id, faculty_id, title, due_date) VALUES 
(1, 1, 1, 'ER Diagram and Normalization Report', '2025-02-15'),
(2, 1, 1, 'SQL Queries and Stored Procedures Lab', '2025-03-10');

-- ─────────────────────────────────────────────
-- VIEWS
-- ─────────────────────────────────────────────
DROP VIEW IF EXISTS V_PLAGIARISM_REPORT;
CREATE VIEW V_PLAGIARISM_REPORT AS
SELECT
    pr.report_id,
    a.assignment_id,
    a.title AS assignment_title,
    pr.submission1_id,
    pr.submission2_id,
    s1.name AS student1_name,
    s1.roll_no AS student1_roll,
    s2.name AS student2_name,
    s2.roll_no AS student2_roll,
    pr.common_token_count,
    pr.union_token_count,
    pr.similarity_pct AS similarity_percentage,
    pr.is_flagged,
    pr.generated_at AS report_generated_at
FROM Plagiarism_Report pr
JOIN Submission sub1 ON sub1.submission_id = pr.submission1_id
JOIN Submission sub2 ON sub2.submission_id = pr.submission2_id
JOIN Student s1 ON s1.student_id = sub1.student_id
JOIN Student s2 ON s2.student_id = sub2.student_id
JOIN Assignment a ON a.assignment_id = sub1.assignment_id;

-- ─────────────────────────────────────────────
-- STORED PROCEDURES
-- ─────────────────────────────────────────────
DELIMITER //

DROP PROCEDURE IF EXISTS sp_add_submission //
CREATE PROCEDURE sp_add_submission(
    IN p_student_id INT,
    IN p_assignment_id INT,
    IN p_extracted_text TEXT,
    OUT p_submission_id INT
)
BEGIN
    DECLARE v_word VARCHAR(100);
    DECLARE v_space_pos INT;
    DECLARE v_text TEXT;

    -- 1. Insert the submission record
    INSERT INTO Submission (student_id, assignment_id, file_name, file_type, word_count)
    VALUES (p_student_id, p_assignment_id, 'api_upload', 'txt', 0);
    
    SET p_submission_id = LAST_INSERT_ID();
    
    -- 2. Tokenize the text natively in MySQL
    SET v_text = LOWER(p_extracted_text);
    -- Basic cleanup for common punctuation
    SET v_text = REPLACE(v_text, ',', '');
    SET v_text = REPLACE(v_text, '.', '');
    SET v_text = REPLACE(v_text, '\n', ' ');
    SET v_text = REPLACE(v_text, '\r', ' ');
    
    -- Loop through words separated by space
    WHILE LENGTH(v_text) > 0 DO
        SET v_space_pos = LOCATE(' ', v_text);
        
        IF v_space_pos = 0 THEN
            SET v_word = TRIM(v_text);
            SET v_text = '';
        ELSE
            SET v_word = TRIM(SUBSTRING(v_text, 1, v_space_pos - 1));
            SET v_text = LTRIM(SUBSTRING(v_text, v_space_pos + 1));
        END IF;
        
        IF LENGTH(v_word) > 0 THEN
            -- Insert token or increment frequency if it already exists for this submission
            INSERT INTO Token (submission_id, token_text, frequency)
            VALUES (p_submission_id, v_word, 1)
            ON DUPLICATE KEY UPDATE frequency = frequency + 1;
        END IF;
    END WHILE;
    
    -- 3. Update word count for the submission
    UPDATE Submission 
    SET word_count = (SELECT SUM(frequency) FROM Token WHERE submission_id = p_submission_id)
    WHERE submission_id = p_submission_id;

END //


DROP PROCEDURE IF EXISTS sp_run_plagiarism //
CREATE PROCEDURE sp_run_plagiarism(
    IN p_submission_id INT,
    IN p_threshold DECIMAL(5,2)
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_other_sub_id INT;
    DECLARE v_common INT;
    DECLARE v_union INT;
    DECLARE v_sim DECIMAL(5,2);
    DECLARE v_flag CHAR(1);
    
    -- Cursor for all other submissions in the same assignment
    DECLARE cur CURSOR FOR 
        SELECT s.submission_id 
        FROM Submission s 
        WHERE s.assignment_id = (SELECT assignment_id FROM Submission WHERE submission_id = p_submission_id)
          AND s.submission_id != p_submission_id;
          
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO v_other_sub_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Calculate Common Tokens (Intersection)
        SELECT COUNT(DISTINCT t1.token_text) INTO v_common
        FROM Token t1
        JOIN Token t2 ON t1.token_text = t2.token_text
        WHERE t1.submission_id = p_submission_id AND t2.submission_id = v_other_sub_id;
        
        -- Calculate Total Unique Tokens (Union)
        SELECT COUNT(DISTINCT token_text) INTO v_union
        FROM Token
        WHERE submission_id IN (p_submission_id, v_other_sub_id);
        
        -- Calculate Jaccard Similarity Percentage
        IF v_union = 0 THEN
            SET v_sim = 0.00;
        ELSE
            SET v_sim = ROUND((v_common / v_union) * 100, 2);
        END IF;
        
        -- Check against threshold
        IF v_sim >= p_threshold THEN
            SET v_flag = 'Y';
        ELSE
            SET v_flag = 'N';
        END IF;
        
        -- Insert or update the report (ensuring lowest ID is always submission1_id)
        IF p_submission_id < v_other_sub_id THEN
            INSERT INTO Plagiarism_Report (submission1_id, submission2_id, common_token_count, union_token_count, similarity_pct, is_flagged)
            VALUES (p_submission_id, v_other_sub_id, v_common, v_union, v_sim, v_flag)
            ON DUPLICATE KEY UPDATE 
                common_token_count = v_common, 
                union_token_count = v_union, 
                similarity_pct = v_sim, 
                is_flagged = v_flag, 
                generated_at = CURRENT_TIMESTAMP;
        ELSE
            INSERT INTO Plagiarism_Report (submission1_id, submission2_id, common_token_count, union_token_count, similarity_pct, is_flagged)
            VALUES (v_other_sub_id, p_submission_id, v_common, v_union, v_sim, v_flag)
            ON DUPLICATE KEY UPDATE 
                common_token_count = v_common, 
                union_token_count = v_union, 
                similarity_pct = v_sim, 
                is_flagged = v_flag, 
                generated_at = CURRENT_TIMESTAMP;
        END IF;
        
    END LOOP;
    
    CLOSE cur;
END //

DELIMITER ;
