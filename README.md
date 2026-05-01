# PlagioCheck - SQL-Based Plagiarism Detection System

PlagioCheck is a full-stack web application designed for educational institutions to automate the process of detecting plagiarism in student assignments. Unlike typical plagiarism checkers that rely on heavy external APIs or machine learning models, PlagioCheck implements the core text tokenization and comparison logic **natively in the database layer** using SQL stored procedures.

## 🚀 Features

- **Direct Database Computation:** Offloads tokenization and Jaccard similarity set-intersection logic to MySQL, making comparisons fast and memory-efficient.
- **Role-Based Dashboards:** Distinct interfaces and routing for Students and Faculty members.
- **Student Portal:** Allows students to drag-and-drop file submissions (`.pdf`, `.docx`, `.py`, `.txt`). Visualizes similarity percentages using interactive gauges.
- **Faculty Portal:** Aggregates reports for a specific assignment. Calculates total checked pairs, flagged counts, safe counts, and average similarity.
- **Real-Time Analysis:** Synchronous pipeline processes uploads, extracts text, tokenizes, runs comparisons, and returns results instantly.
- **Comprehensive Reporting:** Pinpoints matching student pairs and highlights the similarity percentage.

## 💻 Tech Stack

- **Frontend:** React.js (Vite), React Router, Axios, CSS Modules.
- **Backend:** Node.js, Express.js, Multer (file uploads), PDF-Parse & Mammoth (document text extraction).
- **Database:** MySQL (using `mysql2` driver).

## 🔑 Pre-Seeded Login Credentials

To explore the application, use the following built-in accounts on the login page:

**Student Portal**
*   **Username:** `student`
*   **Password:** `student123`

**Faculty Portal**
*   **Username:** `faculty`
*   **Password:** `faculty123`


## 📖 How to Use

1. **Login:** Use the Student or Faculty credentials provided above.
2. **Submit Assignment (Student):** 
   * Navigate to "Submit Assignment" in the sidebar.
   * Enter a Student ID (e.g., `1` for Parv, `2` for Manan, `1001` for Test Student).
   * Select an Assignment ID from the dropdown.
   * Upload a supported document type and click Submit.
3. **View Reports (Faculty):**
   * Log in using the Faculty credentials.
   * Select an Assignment from the sidebar to view all generated plagiarism reports and statistics for that assignment.
