import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiPlus, FiLogOut } from 'react-icons/fi';
import styles from './Sidebar.module.css';

const Sidebar = ({ 
  role, 
  items, 
  activeItemId, 
  onItemClick, 
  onNewSubmissionClick,
  onViewAllReportsClick
}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <FiShield className={styles.logoIcon} />
        <span className={styles.logoText}>PlagioCheck</span>
      </div>

      <div className={styles.sectionHeading}>
        {role === 'Student' ? 'My Submissions' : 'Assignments'}
      </div>

      <div className={styles.navItems}>
        {items.map((item) => {
          // Both student submissions and faculty assignments will be passed as `items`
          const isActive = activeItemId === item.id;
          
          return (
            <div 
              key={item.id} 
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => onItemClick(item)}
            >
              <div className={styles.navItemTitle}>{item.title}</div>
              {item.subtitle && (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.subtitle}
                </div>
              )}
              
              {role === 'Student' && (
                <div className={styles.navItemMeta}>
                  <span>{new Date(item.date).toLocaleDateString()}</span>
                  <span className={`${styles.badge} ${item.status === 'FLAGGED' ? styles.badgeFlagged : styles.badgeSafe}`}>
                    {item.status}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem', textAlign: 'center' }}>
            No history found.
          </div>
        )}
      </div>

      <div className={styles.bottomAction}>
        {role === 'Student' && (
          <>
            <button className={styles.btnNew} style={{ marginBottom: '10px', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)' }} onClick={onViewAllReportsClick}>
              <FiShield style={{ marginRight: '8px' }} /> All Reports
            </button>
            <button className={styles.btnNew} onClick={onNewSubmissionClick}>
              <FiPlus /> New Submission
            </button>
          </>
        )}
        <button className={styles.btnLogout} onClick={handleLogout}>
          <FiLogOut /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
