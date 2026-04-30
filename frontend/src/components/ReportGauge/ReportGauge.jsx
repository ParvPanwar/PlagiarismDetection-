import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import styles from './ReportGauge.module.css';

const ReportGauge = ({ percentage }) => {
  let pathColor = '#22c55e'; // Green (Safe)
  let textColor = '#15803d';

  if (percentage >= 70) {
    pathColor = '#ef4444'; // Red (Flagged)
    textColor = '#b91c1c';
  } else if (percentage >= 40) {
    pathColor = '#f97316'; // Orange (Warning)
    textColor = '#c2410c';
  }

  return (
    <div className={styles.gaugeContainer}>
      <CircularProgressbar
        value={percentage}
        text={`${percentage}%`}
        styles={buildStyles({
          pathColor: pathColor,
          textColor: textColor,
          trailColor: '#f1f5f9',
          pathTransitionDuration: 0.5,
        })}
      />
      <div className={styles.label}>Overall Similarity</div>
    </div>
  );
};

export default ReportGauge;
