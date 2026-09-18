import React, { useState } from 'react';
import styles from './CampaignDetail.module.css';

interface CampaignDetailProps {
  campaign: any;
  onBack: () => void;
}

const mockSlides = [
  { id: 1, name: '1080P 1920 x 1080 screen 1.png', url: '/promo_ticket_one.png', isVideo: false },
  { id: 2, name: 'All Outdoor On Sale-3-1080x1920.mp4', url: 'https://www.w3schools.com/html/mov_bbb.mp4', isVideo: true },
  { id: 3, name: '1080P 1920 x 1080 screen 2.png', url: '/promo_ticket_two.png', isVideo: false },
];

const CampaignDetail: React.FC<CampaignDetailProps> = ({ campaign, onBack }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const handlePrev = () => {
    setCurrentSlideIndex((prev) => (prev === 0 ? mockSlides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlideIndex((prev) => (prev === mockSlides.length - 1 ? 0 : prev + 1));
  };

  const currentSlide = mockSlides[currentSlideIndex];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <span style={{ color: '#666', fontSize: '13px' }}>Content Management / <span style={{ color: '#ff3b6a' }}>Add Campaign content</span></span>
        </div>
      </div>

      <div className={styles.header} style={{ marginBottom: '32px' }}>
        <div className={styles.breadcrumb}>
          <button className={styles.goBackBtn} onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Go Back
          </button>
          <div className={styles.overviewLabel}>Overview</div>
        </div>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.leftPanel}>
          <div className={styles.infoRow}>
            <div className={styles.infoCard} style={{ flex: 1 }}>
              <div className={styles.infoCardLabel}>Name:</div>
              <div className={styles.infoCardValue}>{campaign?.contentName || 'Week 27 Promotion Chris'}</div>
            </div>
            <div className={styles.infoCard} style={{ flex: 1 }}>
              <div className={styles.infoCardLabel}>Date and Times Active:</div>
              <div className={styles.infoCardValue}>Sun 22/02/2026 08:52 AM - Sat 28/02/2026 08:52 AM</div>
            </div>
          </div>
          
          <div className={styles.infoRow}>
            <div className={styles.infoCard} style={{ flex: 1 }}>
              <div className={styles.infoCardLabel}>Commercials:</div>
              <div className={styles.infoCardValue}>2600</div>
            </div>
            <div className={styles.infoCard} style={{ flex: 1 }}>
              <div className={styles.infoCardLabel}>Brand Owner:</div>
              <div className={styles.infoCardValue}>-</div>
            </div>
          </div>

          <div className={styles.infoRow}>
            <div className={styles.infoCard} style={{ flex: 1 }}>
              <div className={styles.infoCardLabel}>Screen Tags:</div>
              <div className={styles.infoCardValue}>{campaign?.tags || 'test,Showroom,Large,Workshop,036137'}</div>
            </div>
            <div className={styles.infoCard} style={{ flex: 1 }}>
              <div className={styles.infoCardLabel}>Total Stores Selected:</div>
              <div className={styles.infoCardValue} style={{ color: '#0070f3' }}>1</div>
            </div>
          </div>

          <div className={styles.infoCard}>
            <div className={styles.infoCardLabel}>Total Screens Selected:</div>
            <div className={styles.infoCardValue}>2</div>
          </div>
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.carouselHeader}>
            {currentSlide.name}
          </div>
          <div className={styles.carouselBody}>
            <button className={styles.navBtn} onClick={handlePrev}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            {mockSlides[currentSlideIndex].isVideo ? (
              <video src={mockSlides[currentSlideIndex].url} className={styles.slideImage} controls autoPlay muted loop playsInline />
            ) : (
              <img src={mockSlides[currentSlideIndex].url} alt={mockSlides[currentSlideIndex].name} className={styles.slideImage} />
            )}
            <button className={styles.navBtn} onClick={handleNext}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
