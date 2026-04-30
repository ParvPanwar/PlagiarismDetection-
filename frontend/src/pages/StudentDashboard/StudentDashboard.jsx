import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiCheckCircle, FiAlertTriangle, FiLoader, FiFileText } from 'react-icons/fi';
import Sidebar from '../../components/Sidebar/Sidebar';
import ReportGauge from '../../components/ReportGauge/ReportGauge';
import styles from './StudentDashboard.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function StudentDashboard() {
  const [view, setView] = useState('SUBMIT'); // 'SUBMIT' | 'REPORT'
  
  // Sidebar State
  const [submissions, setSubmissions] = useState([]);
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);

  // Form State
  const [studentId, setStudentId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Report State
  const [currentReport, setCurrentReport] = useState(null);
  const [currentReportMeta, setCurrentReportMeta] = useState(null);

  // Fetch sidebar data
  const fetchSubmissions = async (sId) => {
    try {
      const res = await axios.get(`${API_BASE}/submissions/${sId}`);
      // Format data for sidebar
      const formatted = res.data.map(sub => ({
        id: sub.submission_id,
        title: sub.assignment_title,
        date: sub.submitted_at,
        status: sub.status,
        similarity: sub.highest_similarity,
        assignment_id: sub.assignment_id
      }));
      setSubmissions(formatted);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load submission history');
    }
  };

  // Pre-fill student ID from local storage or previous entry if we want, 
  // but for now we rely on the form input to trigger history load if they blur.
  const handleStudentIdBlur = () => {
    if (studentId) {
      fetchSubmissions(studentId);
    }
  };

  // Dropzone setup
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      toast.warn('Only PDF and DOCX files are allowed.');
      return;
    }
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId || !assignmentId || !file) {
      toast.error('Please fill all fields and select a document.');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('student_id', studentId);
    formData.append('assignment_id', assignmentId);
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE}/submit`, formData);
      toast.success('Document analyzed successfully!');
      
      // Update sidebar
      fetchSubmissions(studentId);
      
      // Load report view
      setCurrentReport(res.data.report);
      setCurrentReportMeta({
        submission_id: res.data.submission_id,
        assignment_id: assignmentId,
        student_id: studentId,
        date: new Date().toISOString()
      });
      setActiveSubmissionId(res.data.submission_id);
      setView('REPORT');
      
      // Reset file
      setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Database error or connection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadReport = async (item) => {
    try {
      const res = await axios.get(`${API_BASE}/report/${item.id}`);
      setCurrentReport(res.data);
      setCurrentReportMeta({
        submission_id: item.id,
        assignment_id: item.assignment_id,
        student_id: studentId,
        date: item.date,
        assignment_title: item.title
      });
      setActiveSubmissionId(item.id);
      setView('REPORT');
    } catch (err) {
      toast.error('Failed to load report details');
    }
  };

  const handleNewSubmission = () => {
    setView('SUBMIT');
    setActiveSubmissionId(null);
    setCurrentReport(null);
  };

  return (
    <div className="layout-container">
      <Sidebar 
        role="Student"
        items={submissions}
        activeItemId={activeSubmissionId}
        onItemClick={loadReport}
        onNewSubmissionClick={handleNewSubmission}
      />

      <main className="main-content">
        {view === 'SUBMIT' && (
          <>
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>Submit Assignment</h1>
              <p className={styles.pageSubtitle}>Upload your document for plagiarism analysis</p>
            </div>

            <div className={styles.contentArea}>
              <div className={styles.card}>
                <form onSubmit={handleSubmit}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Student ID</label>
                      <input 
                        type="number" 
                        className={styles.input}
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        onBlur={handleStudentIdBlur}
                        placeholder="e.g., 1001"
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Assignment ID</label>
                      <input 
                        type="number" 
                        className={styles.input}
                        value={assignmentId}
                        onChange={(e) => setAssignmentId(e.target.value)}
                        placeholder="e.g., 1"
                        required
                      />
                    </div>
                  </div>

                  <div 
                    {...getRootProps()} 
                    className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}
                  >
                    <input {...getInputProps()} />
                    {file ? (
                      <div className={styles.fileSelected}>
                        <FiFileText size={24} />
                        <span>{file.name}</span>
                        <span style={{color: '#64748b', fontSize: '0.8rem'}}>
                          ({Math.round(file.size / 1024)} KB)
                        </span>
                      </div>
                    ) : (
                      <>
                        <FiUploadCloud className={styles.dropzoneIcon} />
                        <div className={styles.dropzoneText}>
                          Drag & drop your PDF or DOCX here
                        </div>
                        <div className={styles.dropzoneSubtext}>
                          or click to browse from your computer
                        </div>
                      </>
                    )}
                  </div>

                  <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><FiLoader className={styles.spinner} /> Analysing your submission...</>
                    ) : (
                      'Submit Assignment'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}

        {view === 'REPORT' && currentReport && currentReportMeta && (
          <>
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>Plagiarism Report</h1>
              <p className={styles.pageSubtitle}>{currentReportMeta.assignment_title || `Assignment ID: ${currentReportMeta.assignment_id}`}</p>
            </div>

            <div className={styles.contentArea}>
              <div className={styles.card} style={{ padding: '1.5rem 2rem' }}>
                <div className={styles.metadataRow}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Submitted By</span>
                    <span className={styles.metaValue}>ID: {currentReportMeta.student_id}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Date</span>
                    <span className={styles.metaValue}>{new Date(currentReportMeta.date).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Submission ID</span>
                    <span className={styles.metaValue}>#{currentReportMeta.submission_id}</span>
                  </div>
                </div>

                {currentReport.length === 0 ? (
                  <div className={styles.emptyState}>
                    <FiCheckCircle size={48} color="#22c55e" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ marginBottom: '0.5rem' }}>No Matches Found</h3>
                    <p>Your work is completely original compared to existing submissions.</p>
                  </div>
                ) : (
                  <>
                    <div className={styles.gaugeSection}>
                      {(() => {
                        const maxSim = Math.max(...currentReport.map(r => parseFloat(r.similarity_percentage)));
                        return <ReportGauge percentage={maxSim} />;
                      })()}
                    </div>

                    {currentReport.some(r => r.is_flagged === 'Y') ? (
                      <div className={`${styles.verdictBanner} ${styles.verdictFlagged}`}>
                        <FiAlertTriangle size={20} />
                        ⚠ Plagiarism Detected
                      </div>
                    ) : (
                      <div className={`${styles.verdictBanner} ${styles.verdictSafe}`}>
                        <FiCheckCircle size={20} />
                        ✓ Submission is Original (Below Threshold)
                      </div>
                    )}

                    <div className={styles.tableContainer}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Matched With</th>
                            <th>Roll No</th>
                            <th>Common Words</th>
                            <th>Similarity</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentReport.map((row, i) => {
                            const isFlagged = row.is_flagged === 'Y';
                            // Backend query might return student1 as the submitter, and student2 as the match, or vice versa depending on ID order.
                            // The user requested: Matched With | Roll No
                            const matchedName = row.student1_name === 'Test Student' ? row.student2_name : (row.student1_name || row.student2_name);
                            const matchedRoll = row.student1_roll === '1001' ? row.student2_roll : (row.student1_roll || row.student2_roll);
                            const sim = parseFloat(row.similarity_percentage);
                            
                            let barColor = '#22c55e';
                            if (sim >= 70) barColor = '#ef4444';
                            else if (sim >= 40) barColor = '#f97316';

                            return (
                              <tr key={i} className={isFlagged ? styles.rowFlagged : styles.rowSafe}>
                                <td style={{ fontWeight: 500 }}>{row.student2_name}</td>
                                <td>{row.student2_roll}</td>
                                <td>{row.common_token_count}</td>
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
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default StudentDashboard;
