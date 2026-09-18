"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CreateCampaignForm.module.css';

const CreateCampaignForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const router = useRouter();

  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  const regionOptions = [
    'Upper North',
    'Central North',
    'Lower North',
    'Upper South',
    'Lower South',
    'Auckland CBD',
    'Wellington CBD'
  ];

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );
  };

  const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);

  const formatOptions = [
    'Large Format',
    'Small Format',
    'Large Catalogue',
    'Small Catalogue',
    'Boutique',
    'Superstores'
  ];

  const toggleFormat = (format: string) => {
    setSelectedFormats(prev => 
      prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]
    );
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);
  const handleGoBack = () => router.push('/'); // Or wherever the back button should go

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <span>Content Management</span> / Create Campaign
      </div>

      <div className={styles.header}>
        <button className={styles.goBackBtn} onClick={handleGoBack}>
          &larr; Go Back
        </button>
        <div className={styles.pageTitle}>Create Campaign</div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          {step === 1 && 'Campaign Details'}
          {step === 2 && 'Campaign Stores'}
          {step === 3 && 'Campaign Screens'}
        </div>
        
        <div className={styles.panelBody}>
          {step === 1 && (
            <>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Campaign Name <span className={styles.required}>*</span></label>
                  <input type="text" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Commercials <span className={styles.required}>*</span></label>
                  <input type="text" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Brand Owner <span className={styles.required}>*</span></label>
                  <input type="text" className={styles.input} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Start Date <span className={styles.required}>*</span></label>
                  <input type="date" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Start Time <span className={styles.required}>*</span></label>
                  <input type="time" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>End Date <span className={styles.required}>*</span></label>
                  <input type="date" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>End Time <span className={styles.required}>*</span></label>
                  <input type="time" className={styles.input} />
                </div>
              </div>
              <div className={styles.actions}>
                <button className={styles.btnNext} onClick={handleNext}>
                  &gt; Next
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className={styles.formRow}>
                <div className={styles.formGroup} style={{ position: 'relative' }}>
                  <label className={styles.label}>Regions</label>
                  <div 
                    className={styles.multiSelectHeader} 
                    onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
                  >
                    Select Regions
                    <span className={styles.dropdownIcon}>▼</span>
                  </div>
                  {isRegionDropdownOpen && (
                    <div className={styles.multiSelectDropdown}>
                      {regionOptions.map(option => (
                        <label key={option} className={styles.multiSelectOption}>
                          <span>{option}</span>
                          <input 
                            type="checkbox" 
                            checked={selectedRegions.includes(option)}
                            onChange={() => toggleRegion(option)}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.formGroup} style={{ position: 'relative' }}>
                  <label className={styles.label}>Store Format Type</label>
                  <div 
                    className={styles.multiSelectHeader} 
                    onClick={() => setIsFormatDropdownOpen(!isFormatDropdownOpen)}
                  >
                    Select Screen Format
                    <span className={styles.dropdownIcon}>▼</span>
                  </div>
                  {isFormatDropdownOpen && (
                    <div className={styles.multiSelectDropdown}>
                      {formatOptions.map(option => (
                        <label key={option} className={styles.multiSelectOption}>
                          <span>{option}</span>
                          <input 
                            type="checkbox" 
                            checked={selectedFormats.includes(option)}
                            onChange={() => toggleFormat(option)}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tags</label>
                  <select className={styles.select}>
                    <option>Select</option>
                  </select>
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Select Specific Stores <span className={styles.required}>*</span></label>
                  <select className={styles.select}>
                    <option>Select</option>
                  </select>
                  <span className={styles.errorText}>Minimum one value required</span>
                </div>
              </div>
              <div className={styles.actions}>
                <button className={styles.btnPrev} onClick={handlePrev}>
                  &lt; Prev
                </button>
                <button className={styles.btnNext} onClick={handleNext}>
                  &gt; Next
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tags</label>
                  <select className={styles.select}>
                    <option>Select</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Select Screens <span className={styles.required}>*</span></label>
                  <select className={styles.select}>
                    <option>Select</option>
                  </select>
                  <span className={styles.errorText}>Minimum one value required</span>
                </div>
              </div>
              <div className={styles.actions}>
                <button className={styles.btnPrev} onClick={handlePrev}>
                  &lt; Prev
                </button>
                <button className={styles.btnSave} onClick={() => router.push('/')}>
                  &#10003; Save Campaign
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateCampaignForm;
