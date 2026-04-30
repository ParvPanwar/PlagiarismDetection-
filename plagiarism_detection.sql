-- ============================================================
--  SQL-BASED PLAGIARISM DETECTION SYSTEM
--  Course: UCS310 – Database Management Systems
--  Thapar Institute of Engineering & Technology
--  Members: Parv Panwar (1024030226), Manan Dhingra (1024030222)
-- ============================================================
-- HOW THIS FILE CONNECTS TO YOUR APP:
--   1. Run this entire file once in MySQL/Oracle/PostgreSQL to set up the DB.
--   2. Your backend (Node.js / Python / Java) calls:
--        a) sp_add_submission(...)  → to insert a new file submission
--        b) sp_run_plagiarism(...)  → to compare it against all stored submissions
--        c) SELECT * FROM V_PLAGIARISM_REPORT WHERE submission1_id = ?
--                                   → to fetch the report back to the frontend
-- ============================================================


-- ============================================================
-- SECTION 1: SCHEMA SETUP (DDL)
-- ============================================================

-- Drop tables in reverse dependency order (safe re-run)
DROP TABLE IF EXISTS PLAGIARISM_REPORT;
DROP TABLE IF EXISTS TOKEN;
DROP TABLE IF EXISTS SUBMISSION;
DROP TABLE IF EXISTS ASSIGNMENT;
DROP TABLE IF EXISTS STUDENT;
DROP TABLE IF EXISTS COURSE;

-- COURSE table
CREATE TABLE COURSE (
    course_id   INT          PRIMARY KEY AUTO_INCREMENT,
    course_name VARCHAR(100) NOT NULL,
    course_code VARCHAR(20)  NOT NULL UNIQUE
);

-- STUDENT table
CREATE TABLE STUDENT (
    student_id  INT          PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    roll_no     VARCHAR(30)  NOT NULL UNIQUE,
    course_id   INT          NOT NULL,
    FOREIGN KEY (course_id) REFERENCES COURSE(course_id)
);

-- ASSIGNMENT table
CREATE TABLE ASSIGNMENT (
    assignment_id   INT         PRIMARY KEY AUTO_INCREMENT,
    course_id       INT         NOT NULL,
    title           VARCHAR(200) NOT NULL,
    due_date        DATE,
    FOREIGN KEY (course_id) REFERENCES COURSE(course_id)
);

-- SUBMISSION table
-- "content_text" holds the raw text extracted from the uploaded file.
-- Your backend reads the file and passes its text here.
CREATE TABLE SUBMISSION (
    submission_id   INT          PRIMARY KEY AUTO_INCREMENT,
    student_id      INT          NOT NULL,
    assignment_id   INT          NOT NULL,
    submitted_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    content_text    LONGTEXT     NOT NULL,      -- full file text
    FOREIGN KEY (student_id)   REFERENCES STUDENT(student_id),
    FOREIGN KEY (assignment_id) REFERENCES ASSIGNMENT(assignment_id)
);

-- TOKEN table  (one row per word per submission)
CREATE TABLE TOKEN (
    token_id        INT          PRIMARY KEY AUTO_INCREMENT,
    submission_id   INT          NOT NULL,
    token_text      VARCHAR(255) NOT NULL,       -- a single word / phrase
    FOREIGN KEY (submission_id) REFERENCES SUBMISSION(submission_id)
);

-- PLAGIARISM_REPORT table
CREATE TABLE PLAGIARISM_REPORT (
    report_id               INT           PRIMARY KEY AUTO_INCREMENT,
    submission1_id          INT           NOT NULL,   -- the new submission
    submission2_id          INT           NOT NULL,   -- compared against this
    common_token_count      INT           DEFAULT 0,
    total_token_count_s1    INT           DEFAULT 0,
    similarity_percentage   DECIMAL(5,2)  DEFAULT 0.00,
    is_flagged              CHAR(1)       DEFAULT 'N',  -- 'Y' if above threshold
    report_generated_at     DATETIME      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission1_id) REFERENCES SUBMISSION(submission_id),
    FOREIGN KEY (submission2_id) REFERENCES SUBMISSION(submission_id)
);


-- ============================================================
-- SECTION 2: SAMPLE DATA (DML – INSERT)
-- ============================================================

INSERT INTO COURSE (course_name, course_code) VALUES
    ('Database Management Systems', 'UCS310'),
    ('Data Structures',             'UCS301');

INSERT INTO STUDENT (name, roll_no, course_id) VALUES
    ('Parv Panwar',   '1024030226', 1),
    ('Manan Dhingra', '1024030222', 1),
    ('Test Student',  '1024030001', 1);

INSERT INTO ASSIGNMENT (course_id, title, due_date) VALUES
    (1, 'DBMS Project Synopsis', '2025-11-30'),
    (1, 'ER Diagram Exercise',   '2025-10-15');


-- ============================================================
-- SECTION 3: VIEWS (for easy frontend querying)
-- ============================================================

-- V_PLAGIARISM_REPORT  –  joins report with student names for display
CREATE OR REPLACE VIEW V_PLAGIARISM_REPORT AS
SELECT
    pr.report_id,
    pr.submission1_id,
    s1.name                     AS student1_name,
    st1.roll_no                 AS student1_roll,
    pr.submission2_id,
    s2.name                     AS student2_name,
    st2.roll_no                 AS student2_roll,
    a.title                     AS assignment_title,
    pr.common_token_count,
    pr.total_token_count_s1,
    pr.similarity_percentage,
    pr.is_flagged,
    pr.report_generated_at
FROM PLAGIARISM_REPORT pr
JOIN SUBMISSION   sub1 ON pr.submission1_id = sub1.submission_id
JOIN SUBMISSION   sub2 ON pr.submission2_id = sub2.submission_id
JOIN STUDENT      s1   ON sub1.student_id   = s1.student_id
JOIN STUDENT      st1  ON sub1.student_id   = st1.student_id
JOIN STUDENT      s2   ON sub2.student_id   = s2.student_id
JOIN STUDENT      st2  ON sub2.student_id   = st2.student_id
JOIN ASSIGNMENT   a    ON sub1.assignment_id = a.assignment_id;

-- V_TOKEN_FREQUENCY  –  how many times each word appears per submission
CREATE OR REPLACE VIEW V_TOKEN_FREQUENCY AS
SELECT
    submission_id,
    token_text,
    COUNT(*) AS frequency
FROM TOKEN
GROUP BY submission_id, token_text;


-- ============================================================
-- SECTION 4: STORED PROCEDURES (PL/SQL)
-- ============================================================

DELIMITER $$

-- --------------------------------------------------------
-- sp_add_submission
-- Called by backend when a user uploads a file.
-- Parameters:
--   p_student_id    → student's ID
--   p_assignment_id → assignment's ID
--   p_content_text  → full extracted text of the uploaded file
--   p_submission_id → OUT: returns the new submission's ID
-- --------------------------------------------------------
CREATE PROCEDURE sp_add_submission (
    IN  p_student_id    INT,
    IN  p_assignment_id INT,
    IN  p_content_text  LONGTEXT,
    OUT p_submission_id INT
)
BEGIN
    -- Insert the submission
    INSERT INTO SUBMISSION (student_id, assignment_id, content_text)
    VALUES (p_student_id, p_assignment_id, p_content_text);

    SET p_submission_id = LAST_INSERT_ID();

    -- Tokenize: split content_text on spaces and insert each word as a token.
    -- We loop character by character to extract whitespace-delimited tokens.
    BEGIN
        DECLARE v_pos       INT     DEFAULT 1;
        DECLARE v_len       INT     DEFAULT CHAR_LENGTH(p_content_text);
        DECLARE v_start     INT     DEFAULT 1;
        DECLARE v_char      CHAR(1);
        DECLARE v_word      VARCHAR(255) DEFAULT '';

        WHILE v_pos <= v_len DO
            SET v_char = SUBSTRING(p_content_text, v_pos, 1);

            IF v_char IN (' ', '\n', '\t', '\r') THEN
                -- We hit a delimiter; save the accumulated word
                SET v_word = TRIM(v_word);
                IF CHAR_LENGTH(v_word) > 1 THEN
                    -- Lowercase and strip basic punctuation before saving
                    SET v_word = LOWER(REPLACE(REPLACE(REPLACE(
                                    REPLACE(REPLACE(v_word, '.', ''), ',', ''),
                                    '!', ''), '?', ''), ':', ''));
                    IF CHAR_LENGTH(v_word) > 1 THEN
                        INSERT INTO TOKEN (submission_id, token_text)
                        VALUES (p_submission_id, v_word);
                    END IF;
                END IF;
                SET v_word = '';
            ELSE
                SET v_word = CONCAT(v_word, v_char);
            END IF;

            SET v_pos = v_pos + 1;
        END WHILE;

        -- Save last word if file doesn't end with whitespace
        SET v_word = TRIM(LOWER(v_word));
        IF CHAR_LENGTH(v_word) > 1 THEN
            INSERT INTO TOKEN (submission_id, token_text)
            VALUES (p_submission_id, v_word);
        END IF;
    END;
END$$


-- --------------------------------------------------------
-- sp_run_plagiarism
-- Called by backend right after sp_add_submission.
-- Compares the new submission against every other submission
-- for the SAME assignment and writes results to PLAGIARISM_REPORT.
-- Parameters:
--   p_submission_id  → the newly added submission to check
--   p_threshold      → similarity % above which a flag is raised (e.g. 40)
-- --------------------------------------------------------
CREATE PROCEDURE sp_run_plagiarism (
    IN p_submission_id INT,
    IN p_threshold     DECIMAL(5,2)
)
BEGIN
    DECLARE v_done          INT DEFAULT 0;
    DECLARE v_other_id      INT;
    DECLARE v_common        INT;
    DECLARE v_total_s1      INT;
    DECLARE v_similarity    DECIMAL(5,2);
    DECLARE v_flag          CHAR(1);
    DECLARE v_assign_id     INT;

    -- Cursor: iterate over all OTHER submissions for the same assignment
    DECLARE cur_others CURSOR FOR
        SELECT submission_id
        FROM   SUBMISSION
        WHERE  assignment_id = v_assign_id
          AND  submission_id <> p_submission_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

    -- Get the assignment this submission belongs to
    SELECT assignment_id INTO v_assign_id
    FROM   SUBMISSION
    WHERE  submission_id = p_submission_id;

    -- Total tokens in the new submission
    SELECT COUNT(*) INTO v_total_s1
    FROM   TOKEN
    WHERE  submission_id = p_submission_id;

    OPEN cur_others;

    compare_loop: LOOP
        FETCH cur_others INTO v_other_id;
        IF v_done = 1 THEN LEAVE compare_loop; END IF;

        -- Count tokens common to both submissions (using INTERSECT logic via subquery)
        SELECT COUNT(*) INTO v_common
        FROM (
            SELECT token_text
            FROM   TOKEN
            WHERE  submission_id = p_submission_id

            AND token_text IN (
                SELECT token_text
                FROM   TOKEN
                WHERE  submission_id = v_other_id
            )
        ) AS common_tokens;

        -- Similarity = common / total_new_submission * 100
        IF v_total_s1 > 0 THEN
            SET v_similarity = (v_common / v_total_s1) * 100;
        ELSE
            SET v_similarity = 0;
        END IF;

        -- Flag if above threshold
        IF v_similarity >= p_threshold THEN
            SET v_flag = 'Y';
        ELSE
            SET v_flag = 'N';
        END IF;

        -- Save result
        INSERT INTO PLAGIARISM_REPORT
            (submission1_id, submission2_id, common_token_count,
             total_token_count_s1, similarity_percentage, is_flagged)
        VALUES
            (p_submission_id, v_other_id, v_common,
             v_total_s1, v_similarity, v_flag);

    END LOOP;

    CLOSE cur_others;
END$$


-- --------------------------------------------------------
-- fn_token_frequency
-- Returns how many times a specific word appears in a submission.
-- Useful for frontend "word cloud" or detail view.
-- --------------------------------------------------------
CREATE FUNCTION fn_token_frequency (
    p_submission_id INT,
    p_token         VARCHAR(255)
)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count
    FROM   TOKEN
    WHERE  submission_id = p_submission_id
      AND  token_text    = LOWER(p_token);
    RETURN v_count;
END$$


DELIMITER ;


-- ============================================================
-- SECTION 5: TRIGGERS (PL/SQL)
-- ============================================================

DELIMITER $$

-- trg_auto_flag
-- Fires AFTER a row is inserted into PLAGIARISM_REPORT.
-- If similarity >= 40%, it marks the report as flagged
-- (double-safety net in case sp_run_plagiarism threshold changes).
CREATE TRIGGER trg_auto_flag
AFTER INSERT ON PLAGIARISM_REPORT
FOR EACH ROW
BEGIN
    IF NEW.similarity_percentage >= 40 AND NEW.is_flagged = 'N' THEN
        UPDATE PLAGIARISM_REPORT
        SET    is_flagged = 'Y'
        WHERE  report_id  = NEW.report_id;
    END IF;
END$$


-- trg_prevent_self_compare
-- Safety: prevent a submission being compared against itself.
CREATE TRIGGER trg_prevent_self_compare
BEFORE INSERT ON PLAGIARISM_REPORT
FOR EACH ROW
BEGIN
    IF NEW.submission1_id = NEW.submission2_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A submission cannot be compared with itself.';
    END IF;
END$$


DELIMITER ;


-- ============================================================
-- SECTION 6: TRANSACTION EXAMPLE
-- (Shows ACID usage – backend wraps submit+check in one transaction)
-- ============================================================

-- Your backend calls this pattern:
--
-- START TRANSACTION;
--
--   CALL sp_add_submission(
--       p_student_id    => 1,
--       p_assignment_id => 1,
--       p_content_text  => '<full text of uploaded file here>',
--       p_submission_id => @new_id
--   );
--
--   CALL sp_run_plagiarism(@new_id, 40.00);
--
-- COMMIT;
--
-- If anything fails the backend calls ROLLBACK and no partial data is saved.


-- ============================================================
-- SECTION 7: REPORT QUERIES
-- (Run by backend to fetch and return results to frontend)
-- ============================================================

-- 7a. Get the full plagiarism report for a specific submission
--     (replace ? with the submission_id from your backend)
-- SELECT *
-- FROM   V_PLAGIARISM_REPORT
-- WHERE  submission1_id = ?
-- ORDER BY similarity_percentage DESC;

-- 7b. Get only flagged (high-similarity) reports for an assignment
-- SELECT *
-- FROM   V_PLAGIARISM_REPORT
-- WHERE  assignment_title = 'DBMS Project Synopsis'
--   AND  is_flagged = 'Y';

-- 7c. Token frequency for a submission (detail view)
-- SELECT token_text, frequency
-- FROM   V_TOKEN_FREQUENCY
-- WHERE  submission_id = ?
-- ORDER BY frequency DESC
-- LIMIT 20;

-- 7d. Summary: count of flagged submissions per assignment
-- SELECT
--     a.title                        AS assignment,
--     COUNT(DISTINCT pr.report_id)   AS total_comparisons,
--     SUM(pr.is_flagged = 'Y')       AS flagged_count,
--     AVG(pr.similarity_percentage)  AS avg_similarity
-- FROM PLAGIARISM_REPORT pr
-- JOIN SUBMISSION sub ON pr.submission1_id = sub.submission_id
-- JOIN ASSIGNMENT a   ON sub.assignment_id  = a.assignment_id
-- GROUP BY a.assignment_id, a.title;


-- ============================================================
-- END OF FILE
-- To test: insert a submission manually, then call the procedures.
-- Example:
--   CALL sp_add_submission(1, 1, 'database systems store data using tables and keys', @id);
--   CALL sp_run_plagiarism(@id, 40.00);
--   SELECT * FROM V_PLAGIARISM_REPORT WHERE submission1_id = @id;
-- ============================================================
