import React from 'react';
import styles from './BatchCard.module.css';

const BatchCard = () => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Demonstration Batch</h3>
        <div className={styles.statusBadge}>
          ACTIVE <span className={styles.statusDot}></span>
        </div>
      </div>
      
      <div className={styles.dataSection}>
        <div className={styles.dataColumn}>
          <div className={styles.dataLabel}>DATE</div>
          <div className={styles.dataValue}>Sun 01/02/2026 - Tue 01/12/2026</div>
        </div>
        <div className={styles.dataColumn}>
          <div className={styles.dataLabel}>PRODUCTS</div>
          <div className={styles.dataValue}>40</div>
        </div>
        <div className={styles.dataColumn}>
          <div className={styles.dataLabel}>TYPE</div>
          <div className={styles.dataValue}>PROMO</div>
        </div>
        <div className={styles.dataColumn}>
          <div className={styles.dataLabel}>LAST EDIT</div>
          <div className={styles.dataValue}>Tue 17/03/2026</div>
        </div>
      </div>

      <div className={styles.notesSection}>
        <div className={styles.dataLabel}>NOTES</div>
      </div>

      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <button className={`${styles.actionBtn} ${styles.btnDelete}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
          </button>
        </div>
        <div className={styles.footerRight}>
          <button className={`${styles.actionBtn} ${styles.btnSend}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            Send
          </button>
          <button className={`${styles.actionBtn} ${styles.btnView}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            View Batch
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchCard;
