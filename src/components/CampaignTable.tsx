"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CampaignTable.module.css';
import CreateCampaignModal from './CreateCampaignModal';
import CampaignContents from './CampaignContents';
import CampaignDetail from './CampaignDetail';
import { useSavedCampaigns, type SavedCampaign } from './CampaignWizard/campaignStore';

// The modal flow is superseded by the step-by-step page at /intelligent-campaign.
// Flip this to bring its button back.
const SHOW_MODAL_CREATE_BUTTON = false;

const campaignsData = [
  {
    contentName: 'Sam',
    screenGroup: '1920*1080',
    tags: '',
    region: '',
    category: '',
    startDate: 'Sat 08/08/2026 07:39 PM',
    endDate: 'Mon 31/08/2026 09:40 PM',
  },
  {
    contentName: 'Week 45 Promotion',
    screenGroup: '1920*532',
    tags: 'Workshop',
    region: 'Queensland',
    category: 'Rural',
    startDate: 'Mon 04/05/2026 11:59 AM',
    endDate: 'Sun 10/05/2026 11:59 AM',
  },
  {
    contentName: 'Week 26 Promotion Chris',
    screenGroup: '1920*1080,1920*1080',
    tags: 'test,Showroom,Large,Workshop,036137,Service Center,Super Center,Small',
    region: 'Head Office,New South Wales,Queensland,South Australia,Tasmania,Victoria,Western Australia',
    category: 'Large Format Store,Rural,Urban',
    startDate: 'Mon 23/02/2026 08:05 AM',
    endDate: 'Sat 28/02/2026 08:24 AM',
  },
  {
    contentName: 'Week 24 Promotion Chris',
    screenGroup: '1920*1080,1920*1080',
    tags: 'test,Showroom,Large,Workshop,036137,Service Center,Super Center,Small',
    region: 'Head Office,New South Wales,Queensland,South Australia,Tasmania,Victoria,Western Australia',
    category: 'Large Format Store,Rural,Urban',
    startDate: 'Mon 23/02/2026 07:35 AM',
    endDate: 'Sat 28/02/2026 07:35 AM',
  },
  {
    contentName: 'Week 36 Promotion Chris',
    screenGroup: '1920*1080,1920*1080',
    tags: 'test,Showroom,Large,Workshop,036137,Service Center,Super Center,Small',
    region: 'Head Office,New South Wales,Queensland,South Australia,Tasmania,Victoria,Western Australia',
    category: 'Large Format Store,Rural,Urban',
    startDate: 'Sun 22/02/2026 11:12 AM',
    endDate: 'Sat 28/02/2026 11:12 AM',
  },
  {
    contentName: 'Week 31 Promotion Chris',
    screenGroup: '1920*1080,1920*1080',
    tags: 'test,Showroom,Large,Workshop,036137,Service Center,Super Center,Small',
    region: 'Head Office,New South Wales,Queensland,South Australia,Tasmania,Victoria,Western Australia',
    category: 'Large Format Store,Rural,Urban',
    startDate: 'Sun 22/02/2026 09:25 AM',
    endDate: 'Sat 28/02/2026 09:25 AM',
  },
  {
    contentName: 'Week 45 Promotion Chris',
    screenGroup: '1920*1080,1920*1080',
    tags: 'test,Showroom,Large,Workshop,036137,Service Center,Super Center,Small',
    region: 'Head Office,New South Wales,Queensland,South Australia,Tasmania,Victoria,Western Australia',
    category: 'Large Format Store,Rural,Urban',
    startDate: 'Sun 22/02/2026 09:21 AM',
    endDate: 'Sat 28/02/2026 09:21 AM',
  },
];

// A row of the campaign list: a mock campaign or a summary of one saved from the wizard.
type CampaignRow = (typeof campaignsData)[number] | SavedCampaign;

const SortIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 15l5 5 5-5"></path>
    <path d="M7 9l5-5 5 5"></path>
  </svg>
);

const ViewIcon = () => (
  <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const ChartIcon = () => (
  <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

const EditIcon = () => (
  <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const CampaignTable = () => {
  const router = useRouter();
  const savedCampaigns = useSavedCampaigns();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState(campaignsData);
  const [isCreating, setIsCreating] = useState(false);
  const [currentView, setCurrentView] = useState<'table' | 'contents' | 'detail'>('table');
  const [activeCampaign, setActiveCampaign] = useState<CampaignRow | null>(null);

  const handleCreateCampaign = () => {
    setIsModalOpen(false);
    setIsCreating(true);
    setTimeout(() => {
      const newCampaign = {
        contentName: 'New AI Campaign',
        screenGroup: '1080*1920',
        tags: 'AI Generated, Promo',
        region: 'Upper North, Auckland CBD',
        category: 'Large Format',
        startDate: 'Today',
        endDate: 'Next Week',
      };
      setCampaigns(prev => [newCampaign, ...prev]);
      setIsCreating(false);
    }, 2500);
  };

  const handleOpenContents = (campaign: CampaignRow) => {
    setActiveCampaign(campaign);
    setCurrentView('contents');
  };

  if (currentView === 'contents') {
    return (
      <div className={styles.container}>
        <CampaignContents 
          campaign={activeCampaign} 
          onBack={() => setCurrentView('table')} 
          onViewDetail={() => setCurrentView('detail')} 
        />
      </div>
    );
  }

  if (currentView === 'detail') {
    return (
      <div className={styles.container}>
        <CampaignDetail 
          campaign={activeCampaign} 
          onBack={() => setCurrentView('contents')} 
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.topTabs}>
        <button className={`${styles.tabButton} ${styles.active}`}>Campaigns</button>
        <button className={styles.tabButton}>Assets</button>
        <button className={styles.tabButton}>Store Settings</button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchContainer}>
          <input 
            type="text" 
            className={styles.searchInput} 
            placeholder="Search" 
          />
          <div className={styles.searchIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>
        <div className={styles.toolbarButtons}>
          {SHOW_MODAL_CREATE_BUTTON && (
            <button className={styles.createBtn} onClick={() => setIsModalOpen(true)}>
              <div className={styles.createBtnIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
              <div className={styles.createBtnText}>
                Create Campaign
              </div>
            </button>
          )}
          <button className={styles.createBtn} onClick={() => router.push('/intelligent-campaign')}>
            <div className={styles.createBtnIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <div className={styles.createBtnText}>
              Create Campaign
            </div>
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th><div className={styles.thContent}>Content Name <SortIcon /></div></th>
              <th><div className={styles.thContent}>Screen Group <SortIcon /></div></th>
              <th><div className={styles.thContent}>Tags <SortIcon /></div></th>
              <th><div className={styles.thContent}>Region <SortIcon /></div></th>
              <th><div className={styles.thContent}>Category <SortIcon /></div></th>
              <th><div className={styles.thContent}>Start Date <SortIcon /></div></th>
              <th><div className={styles.thContent}>End Date <SortIcon /></div></th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isCreating && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '60px' }}>
                  <div style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid #f3f3f3', borderTop: '3px solid var(--success-green)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                  <div style={{ marginTop: '16px', color: '#666', fontSize: '15px', fontWeight: 500 }}>AI is generating your campaign and tickets...</div>
                </td>
              </tr>
            )}
            {savedCampaigns.map(campaign => (
              <tr key={campaign.id}>
                <td>
                  {campaign.contentName}{' '}
                  <span className={`${styles.statusBadge} ${campaign.status === 'Scheduled' ? styles.statusScheduled : ''}`}>
                    {campaign.status}
                  </span>
                </td>
                <td>{campaign.screenGroup}</td>
                <td style={{ maxWidth: '200px', whiteSpace: 'normal', wordWrap: 'break-word' }}>{campaign.tags}</td>
                <td style={{ maxWidth: '200px', whiteSpace: 'normal', wordWrap: 'break-word' }}>{campaign.region}</td>
                <td style={{ maxWidth: '200px', whiteSpace: 'normal', wordWrap: 'break-word' }}>{campaign.category}</td>
                <td>{campaign.startDate}</td>
                <td>{campaign.endDate}</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={`${styles.actionBtn} ${styles.add}`}
                      onClick={() =>
                        campaign.draft
                          ? router.push(`/intelligent-campaign/view?id=${encodeURIComponent(campaign.id)}`)
                          : handleOpenContents(campaign)
                      }
                      title="View campaign"
                      aria-label={`View ${campaign.contentName}`}
                    >
                      <ViewIcon />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.edit}`}
                      onClick={() =>
                        // Campaigns saved before full drafts were kept cannot reopen in the wizard.
                        campaign.draft
                          ? router.push(`/intelligent-campaign?edit=${encodeURIComponent(campaign.id)}`)
                          : handleOpenContents(campaign)
                      }
                      title="Edit campaign"
                      aria-label={`Edit ${campaign.contentName}`}
                    >
                      <EditIcon />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.stats}`}
                      onClick={() => router.push(`/intelligent-campaign/report?id=${encodeURIComponent(campaign.id)}`)}
                      title="Proof of play report"
                      aria-label={`Proof of play report for ${campaign.contentName}`}
                    >
                      <ChartIcon />
                    </button>
                    <button className={`${styles.actionBtn} ${styles.delete}`}>
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {campaigns.map((campaign, index) => (
              <tr key={index}>
                <td>{campaign.contentName}</td>
                <td>{campaign.screenGroup}</td>
                <td style={{ maxWidth: '200px', whiteSpace: 'normal', wordWrap: 'break-word' }}>{campaign.tags}</td>
                <td style={{ maxWidth: '200px', whiteSpace: 'normal', wordWrap: 'break-word' }}>{campaign.region}</td>
                <td style={{ maxWidth: '200px', whiteSpace: 'normal', wordWrap: 'break-word' }}>{campaign.category}</td>
                <td>{campaign.startDate}</td>
                <td>{campaign.endDate}</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={`${styles.actionBtn} ${styles.add}`}
                      onClick={() => handleOpenContents(campaign)}
                      title="View campaign"
                      aria-label={`View ${campaign.contentName}`}
                    >
                      <ViewIcon />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.edit}`}
                      onClick={() => handleOpenContents(campaign)}
                      title="Edit campaign"
                      aria-label={`Edit ${campaign.contentName}`}
                    >
                      <EditIcon />
                    </button>
                    <button className={`${styles.actionBtn} ${styles.stats}`}>
                      <ChartIcon />
                    </button>
                    <button className={`${styles.actionBtn} ${styles.delete}`}>
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateCampaignModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreateCampaign} />
    </div>
  );
};

export default CampaignTable;
