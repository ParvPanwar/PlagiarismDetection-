import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiLoader, FiSearch } from 'react-icons/fi';
import Sidebar from '../../components/Sidebar/Sidebar';
import styles from './FacultyDashboard.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// For demonstration, we hardcode the assignments list.
// In a real app, you'd fetch this from GET /api/assignments
const MOCK_ASSIGNMENTS = [
  { id: 1, title: 'ER Diagram and Normalization Report', date: '2025-02-15' },
  { id: 2, title: 'SQL Queries and Stored Procedures Lab', date: '2025-03-10' },
  { id: 3, title: 'Transaction Management Case Study', date: '2025-03-25' }
];

function FacultyDashboard() {
  const [activeAssignmentId, setActiveAssignmentId] = useState(MOCK_ASSIGNMENTS[0].id);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReports = async (assignmentId) => {
    setIsLoading(true);
    setReports([]);
    try {
      const res = await axios.get(`${API_BASE}/reports?assignment_id=${assignmentId}`);
      // Based on the endpoint design, it returns an array of reports
      // The original code accessed res.data.reports, but typically it might just be res.data
      setReports(res.data.reports || res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load reports for this assignment');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(activeAssignmentId);
  }, [activeAssignmentId]);

  const handleAssignmentClick = (item) => {
    setActiveAssignmentId(item.id);
  };

  // Filter logic
  const filteredReports = reports.filter(r => {
    const term = searchQuery.toLowerCase();
    const name1 = (r.student1_name || '').toLowerCase();
    const name2 = (r.student2_name || '').toLowerCase();
    const roll1 = (r.student1_roll || '').toLowerCase();
    const roll2 = (r.student2_roll || '').toLowerCase();
    return name1.includes(term) || name2.includes(term) || roll1.includes(term) || roll2.includes(term);
  });

  // Calculate Stats
  const totalSubmissions = reports.length;
  const flaggedCount = reports.filter(r => r.is_flagged === 'Y').length;
  const safeCount = totalSubmissions - flaggedCount;
  const avgSimilarity = totalSubmissions > 0 
    ? (reports.reduce((acc, curr) => acc + parseFloat(curr.similarity_percentage), 0) / totalSubmissions).toFixed(1)
    : 0;

  const activeAssignmentTitle = MOCK_ASSIGNMENTS.find(a => a.id === activeAssignmentId)?.title;

  return (
    <div className="layout-container">
      <Sidebar 
        role="Faculty"
        items={MOCK_ASSIGNMENTS}
        activeItemId={activeAssignmentId}
        onItemClick={handleAssignmentClick}
      />

      <main className="main-content">
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Plagiarism Reports</h1>
          <p className={styles.pageSubtitle}>Assignment: {activeAssignmentTitle}</p>
        </div>

        <div className={styles.contentArea}>
          {/* Stats Row */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Checked Pairs</span>
              <span className={styles.statValue}>{totalSubmissions}</span>
            </div>
            <div className={`${styles.statCard} ${styles.statCardRed}`}>
              <span className={styles.statLabel}>Total Flagged</span>
              <span className={styles.statValue}>{flaggedCount}</span>
            </div>
            <div className={`${styles.statCard} ${styles.statCardGreen}`}>
              <span className={styles.statLabel}>Total Safe</span>
              <span className={styles.statValue}>{safeCount}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Avg Similarity</span>
              <span className={styles.statValue}>{avgSimilarity}%</span>
            </div>
          </div>

          <div className={styles.controlsRow}>
            <h3>Detailed Analysis</h3>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className={styles.searchInput} 
                placeholder="Search by name or roll no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.tableContainer}>
              {isLoading ? (
                <div className={styles.loaderContainer}>
                  <FiLoader size={32} className={styles.spinner} />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className={styles.emptyState}>
                  {reports.length === 0 ? 'No reports generated for this assignment yet.' : 'No matches found for your search.'}
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Student 1</th>
                      <th>Student 2</th>
                      <th>Similarity</th>
                      <th>Status</th>
                      <th>Date Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((row, i) => {
                      const isFlagged = row.is_flagged === 'Y';
                      const sim = parseFloat(row.similarity_percentage);
                      let barColor = '#22c55e';
                      if (sim >= 70) barColor = '#ef4444';
                      else if (sim >= 40) barColor = '#f97316';

                      return (
                        <tr key={i} className={isFlagged ? styles.rowFlagged : styles.rowSafe}>
                          <td>
                            <div className={styles.studentInfo}>
                              <span className={styles.studentName}>{row.student1_name}</span>
                              <span className={styles.studentRoll}>{row.student1_roll}</span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.studentInfo}>
                              <span className={styles.studentName}>{row.student2_name}</span>
                              <span className={styles.studentRoll}>{row.student2_roll}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, display: 'inline-block', width: '40px' }}>{sim}%</span>
                            <div className={styles.miniProgress}>
                              <div className={styles.miniProgressFill} style={{ width: `${sim}%`, backgroundColor: barColor }}></div>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${isFlagged ? styles.statusFlagged : styles.statusSafe}`}>
                              {isFlagged ? 'FLAGGED' : 'SAFE'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.875rem' }}>
                            {new Date(row.report_generated_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default FacultyDashboard;
