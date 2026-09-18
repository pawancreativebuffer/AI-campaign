import React from 'react';
import styles from './BatchScreen.module.css';

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const BatchScreen = () => {
  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <select className={styles.dropdown}>
          <option>All</option>
        </select>
        
        <div className={styles.actions}>
          <div className={styles.searchBox}>
            <input type="text" placeholder="Search" className={styles.searchInput} />
            <span className={styles.searchIcon}><SearchIcon /></span>
          </div>
          <button className={styles.createBtn}>
            <EditIcon /> Create Batch
          </button>
        </div>
      </div>

      <div className={styles.batchList}>
        <div className={styles.batchCard}>
          <div className={styles.cardHeader}>
            <div className={styles.batchName}>New AI Campaign</div>
            <div className={styles.statusGroup}>
              <span className={styles.statusExpired}>EXPIRED <span className={styles.dotGrey}>●</span></span>
              <span className={styles.statusSent}>SENT <span className={styles.dotGreen}>●</span></span>
            </div>
          </div>
          
          <div className={styles.cardBody}>
            <div className={styles.colDate}>
              <div className={styles.label}>DATE</div>
              <div className={styles.valuePink}>Sun 22/02/2026 - Sat 28/02/2026</div>
            </div>
            <div className={styles.col}>
              <div className={styles.label}>PRODUCTS</div>
              <div className={styles.valuePink}>40</div>
            </div>
            <div className={styles.col}>
              <div className={styles.label}>TYPE</div>
              <div className={styles.valuePink}>PROMO</div>
            </div>
            <div className={styles.col}>
              <div className={styles.label}>LAST EDIT</div>
              <div className={styles.valuePink}>Sun 22/02/2026</div>
            </div>
          </div>
          
          <div className={styles.cardNotes}>
            <div className={styles.label}>NOTES</div>
            <div className={styles.notesText}>AI Generated Batch</div>
          </div>
          
          <div className={styles.cardFooter}>
            <button className={styles.viewBtn}>
              <EyeIcon /> View Batch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchScreen;
