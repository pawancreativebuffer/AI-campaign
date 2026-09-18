import React from 'react';
import styles from './ActionToolbar.module.css';

const ActionToolbar = () => {
  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <div className={styles.selectWrapper}>
          <select className={styles.select}>
            <option>Select Action</option>
          </select>
          <div className={styles.chevron}></div>
        </div>
        <div className={styles.selectWrapper}>
          <select className={styles.select}>
            <option>Active</option>
          </select>
          <div className={styles.chevron}></div>
        </div>
      </div>
      
      <div className={styles.right}>
        <div className={styles.searchWrapper}>
          <input type="text" placeholder="Search" className={styles.searchInput} />
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <button className={styles.createButton}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Create Batch
        </button>
      </div>
    </div>
  );
};

export default ActionToolbar;
