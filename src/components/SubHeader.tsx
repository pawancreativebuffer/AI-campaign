import React from 'react';
import styles from './SubHeader.module.css';

interface SubHeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const SubHeader: React.FC<SubHeaderProps> = ({ activeTab = 'CAMPAIGNS', onTabChange }) => {
  const tabs = [
    { name: 'BATCHES' },
    { name: 'ADHOC TICKETS' },
    { name: 'REPORTS' },
    { name: 'CORE MASTER' },
    { name: 'DAM' },
    { name: 'ESL MANAGEMENT' },
    { name: 'MOBILE' },
    { name: 'CAMPAIGNS' },
  ];

  return (
    <div className={styles.subHeader}>
      <ul className={styles.tabList}>
        {tabs.map((tab, index) => (
          <li
            key={index}
            className={`${styles.tab} ${activeTab === tab.name ? styles.active : ''}`}
            onClick={() => onTabChange && onTabChange(tab.name)}
          >
            {tab.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SubHeader;
