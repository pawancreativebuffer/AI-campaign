import React from 'react';
import Link from 'next/link';
import styles from '../CampaignWizard/wizard.module.css';
import local from './CampaignReport.module.css';
import { AlertIcon } from '../CampaignWizard/icons';

interface CampaignNotFoundProps {
  id: string;
  title: string;
}

/** Shown when ?edit= or ?id= names a campaign that is not in this browser session. */
const CampaignNotFound: React.FC<CampaignNotFoundProps> = ({ id, title }) => (
  <div className={styles.page}>
    <div className={styles.breadcrumb}>
      <Link href="/" className={local.link}>Content Management</Link> / {title}
    </div>
    <div className={`${styles.alert} ${styles.alertWarning}`} role="alert">
      <AlertIcon />
      <div>
        Campaign &quot;{id}&quot; was not found. Campaigns created in the wizard are kept for this browser session
        only. <Link href="/" className={local.link}>Back to the campaign list</Link>
      </div>
    </div>
  </div>
);

export default CampaignNotFound;
