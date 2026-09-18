import React from 'react';
import styles from './Pagination.module.css';

const Pagination = () => {
  return (
    <div className={styles.pagination}>
      <div className={styles.rowSelector}>
        <span className={styles.label}>Row Per Page:</span>
        <div className={styles.selectWrapper}>
          <select className={styles.select}>
            <option>10</option>
            <option>20</option>
            <option>50</option>
          </select>
          <div className={styles.chevron}></div>
        </div>
      </div>
      <div className={styles.pageInfo}>
        <span className={styles.infoText}>1-1 of 1</span>
        <div className={styles.controls}>
          <button className={styles.controlBtn} disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button className={styles.controlBtn} disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
