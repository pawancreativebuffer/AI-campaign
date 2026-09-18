import React, { useState } from 'react';
import styles from './CampaignContents.module.css';

const SortIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginLeft: '4px' }}>
    <polyline points="7 15 12 20 17 15"></polyline>
    <polyline points="7 9 12 4 17 9"></polyline>
  </svg>
);

interface CampaignContentsProps {
  campaign: any;
  onBack: () => void;
  onViewDetail: () => void;
}

const CampaignContents: React.FC<CampaignContentsProps> = ({ campaign, onBack, onViewDetail }) => {
  const [contents, setContents] = useState([
    { id: 1, name: '1080P 1920 x 1080 screen 1.png', type: 'IMAGE/PNG', resolution: '1920*1080 - 1071', seconds: '5', isVideo: false, image: '/promo_ticket_one.png' },
    { id: 2, name: '1080P 1920 x 1080 screen 2.png', type: 'IMAGE/PNG', resolution: '1920*1080 - 1071', seconds: '5', isVideo: false, image: '/promo_ticket_two.png' },
    { id: 3, name: '1080P 1920 x 1080 screen 3.png', type: 'IMAGE/PNG', resolution: '1920*1080 - 1071', seconds: '5', isVideo: false, image: '/promo_ticket_one.png' },
    { id: 4, name: 'All Outdoor On Sale-3-1080x1920.mp4', type: 'VIDEO/MP4', resolution: '1920*1080 - 1071', seconds: '15', isVideo: true, videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
    { id: 5, name: 'Unlock 20% Off-3-1080x1920.mp4', type: 'VIDEO/MP4', resolution: '1920*1080 - 1071', seconds: '15', isVideo: true, videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  ]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    setContents(contents.filter(item => item.id !== id));
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newContents = [...contents];
    const draggedItem = newContents[draggedIndex];
    newContents.splice(draggedIndex, 1);
    newContents.splice(index, 0, draggedItem);
    
    setContents(newContents);
    setDraggedIndex(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <span style={{ color: '#666', fontSize: '13px' }}>Content Management / <span style={{ color: '#999' }}>Add Campaign content</span></span>
        </div>
      </div>

      <div className={styles.header} style={{ marginBottom: '32px' }}>
        <div className={styles.titleWrapper}>
          <button className={styles.goBackBtn} onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Go Back
          </button>
          <button className={styles.updateDataBtn}>Update Data To Campaign</button>
        </div>
      </div>

      <div className={styles.topActions}>
        <button className={`${styles.actionBtn} ${styles.btnBatch}`}>
          <div className={styles.iconWrapper}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          Create Content From Batch
        </button>
        <button className={`${styles.actionBtn} ${styles.btnAdhoc}`}>
          <div className={styles.iconWrapper}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </div>
          Create Content From Adhoc
        </button>
        <button className={`${styles.actionBtn} ${styles.btnUpload}`}>
          <div className={styles.iconWrapper}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          Upload Custom Content
        </button>
        <button className={`${styles.actionBtn} ${styles.btnDam}`}>
          <div className={styles.iconWrapper}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          Use Content From DAM
        </button>
      </div>

      <div className={styles.sectionTitle}>
        Campaign Contents
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '70px' }}><div className={styles.thContent}>Order <SortIcon /></div></th>
              <th><div className={styles.thContent}>Name <SortIcon /></div></th>
              <th><div className={styles.thContent}>Type <SortIcon /></div></th>
              <th><div className={styles.thContent}>Resolution <SortIcon /></div></th>
              <th><div className={styles.thContent}>Seconds <SortIcon /></div></th>
              <th><div className={styles.thContent}>Preview <SortIcon /></div></th>
              <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {contents.map((item, index) => (
              <tr 
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                style={{ 
                  opacity: draggedIndex === index ? 0.5 : 1,
                  backgroundColor: draggedIndex === index ? '#f9fafb' : 'transparent',
                  transition: 'background-color 0.2s ease, opacity 0.2s ease'
                }}
              >
                <td>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'grab' }}>
                    <circle cx="9" cy="12" r="1"></circle>
                    <circle cx="9" cy="5" r="1"></circle>
                    <circle cx="9" cy="19" r="1"></circle>
                    <circle cx="15" cy="12" r="1"></circle>
                    <circle cx="15" cy="5" r="1"></circle>
                    <circle cx="15" cy="19" r="1"></circle>
                  </svg>
                </td>
                <td style={{ fontWeight: 500 }}>{item.name}</td>
                <td>{item.type}</td>
                <td>
                  <select className={styles.inputControl} defaultValue={item.resolution}>
                    <option value={item.resolution}>{item.resolution}</option>
                  </select>
                </td>
                <td>
                  <input type="text" className={styles.inputControl} defaultValue={item.seconds} style={{ maxWidth: '60px' }} />
                </td>
                <td>
                  {!item.isVideo ? (
                    <div className={styles.previewContainer}>
                      <img src={item.image} alt="Preview" className={styles.previewThumb} />
                      <div className={styles.hoverPreview}>
                        <img src={item.image} alt="Large Preview" />
                      </div>
                    </div>
                  ) : (
                    <div className={styles.previewContainer}>
                      <video src={item.videoUrl} className={styles.previewThumb} muted loop autoPlay playsInline />
                      <div className={styles.hoverPreview}>
                        <video src={item.videoUrl} className={styles.largeVideo} muted loop autoPlay playsInline />
                      </div>
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(item.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.footerActions}>
        <button className={styles.viewDetailBtn} onClick={onViewDetail}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          View Detail
        </button>
        <button className={styles.updateCampaignBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Update Campaign
        </button>
      </div>
    </div>
  );
};

export default CampaignContents;
