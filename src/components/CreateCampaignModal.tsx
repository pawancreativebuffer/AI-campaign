import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CreateCampaignModal.module.css';
import formStyles from './CreateCampaignForm/CreateCampaignForm.module.css';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate?: () => void;
}

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [step, setStep] = useState<number>(1);
  const router = useRouter();

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = (dropdownName: string) => {
    setOpenDropdown(prev => prev === dropdownName ? null : dropdownName);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`.${styles.multiSelectHeader}`) && !target.closest(`.${styles.multiSelectDropdown}`)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [selectedModalRegions, setSelectedModalRegions] = useState<string[]>(['Upper North', 'Auckland CBD']);
  const modalRegionOptions = [
    'Upper North', 'Central North', 'Lower North', 
    'Upper South', 'Lower South', 'Auckland CBD', 'Wellington CBD'
  ];
  const toggleModalRegion = (region: string) => {
    setSelectedModalRegions(prev => 
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );
  };

  const [selectedModalFormats, setSelectedModalFormats] = useState<string[]>(['Large Format', 'Superstores']);
  const modalFormatOptions = [
    'Large Format', 'Small Format', 'Large Catalogue',
    'Small Catalogue', 'Boutique', 'Superstores'
  ];
  const toggleModalFormat = (format: string) => {
    setSelectedModalFormats(prev => 
      prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]
    );
  };

  const [selectedModalScreenFormats, setSelectedModalScreenFormats] = useState<string[]>(['Promo']);
  const modalScreenFormatOptions = [
    'Promo', 'Discount', 'Sale',
    'New Arrival', 'Clearance'
  ];
  const toggleModalScreenFormat = (format: string) => {
    setSelectedModalScreenFormats(prev => 
      prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]
    );
  };

  const [selectedModalScreenTypes, setSelectedModalScreenTypes] = useState<string[]>(['Screen 1 - Entrance']);
  const modalScreenTypeOptions = [
    'Screen 1 - Entrance', 'Screen 2 - Aisle', 'Screen 3 - Checkout', 'Screen 4 - Window', 'Screen 5 - Display'
  ];
  const toggleModalScreenType = (type: string) => {
    setSelectedModalScreenTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const [selectedModalAdverts, setSelectedModalAdverts] = useState<string>('');
  const [aiSelectionRows, setAiSelectionRows] = useState<any[]>([
    { id: 1, category: 'On Promotion', logic: 'Most Profit', fallback: 'Low stock replace', format: 'Static', duration: '10 Sec' },
    { id: 2, category: 'On Promotion', logic: 'Most Profit', fallback: 'Low stock replace', format: 'Static', duration: '10 Sec' },
    { id: 3, category: 'On Promotion', logic: 'Most Profit', fallback: 'Low stock replace', format: 'Static', duration: '10 Sec' },
    { id: 4, category: 'On Promotion', logic: 'Most Profit', fallback: 'Low stock replace', format: 'Static', duration: '10 Sec' },
    { id: 5, category: 'On Promotion', logic: 'Most Profit', fallback: 'Low stock replace', format: 'Static', duration: '10 Sec' },
    { id: 6, category: 'On Promotion', logic: 'Most Profit', fallback: 'Low stock replace', format: 'Static', duration: '10 Sec' }
  ]);
  const [isPromptGenerated, setIsPromptGenerated] = useState(false);
  const [promptText, setPromptText] = useState('');

  const updateAiRow = (id: number, field: string, value: string) => {
    setAiSelectionRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const generateDynamicPrompt = () => {
    let prompt = `SYSTEM DIRECTIVE:\nGenerate a comprehensive retail digital signage advertising campaign consisting of ${aiSelectionRows.length} unique display slots.\n\n`;
    
    prompt += `MANDATORY CAMPAIGN CONTEXT (DO NOT DEVIATE):\n`;
    prompt += `- Target Regions: ${selectedModalRegions.length > 0 ? selectedModalRegions.join(', ') : 'All Regions'}\n`;
    prompt += `- Store Formats: ${selectedModalFormats.length > 0 ? selectedModalFormats.join(', ') : 'All Formats'}\n`;
    prompt += `- Screen Aspect Ratios / Dimensions: MUST exactly fit [ ${selectedModalScreenFormats.length > 0 ? selectedModalScreenFormats.join(', ') : 'Standard Display'} ]. Do NOT generate assets for unapproved dimensions.\n`;
    prompt += `- Screen Physical Placements: ${selectedModalScreenTypes.length > 0 ? selectedModalScreenTypes.join(', ') : 'In-store generic'}\n\n`;
    
    prompt += `SLOT CONFIGURATIONS:\n`;
    aiSelectionRows.forEach((row, index) => {
      prompt += `[Slot ${index + 1}] Trigger: "${row.category}" | Optimization: "${row.logic}" | Fallback: "${row.fallback}" | Format: "${row.format}" | Duration: ${row.duration}\n`;
    });
    
    prompt += `\nCRITICAL INSTRUCTION:\nEnsure all generated assets strictly adhere to the exact screen dimensions and physical placements specified above. The creatives MUST perfectly suit the store formats and regional context.`;
    return prompt;
  };

  useEffect(() => {
    if (step === 4) {
      setPromptText(generateDynamicPrompt());
    }
  }, [step]);

  const mockProducts = [
    { name: 'Harbour Master Reserve Gin', sku: '184527', size: '700ml', regPrice: '$59.99', offerPrice: '$49.99', save: '$10.00' },
    { name: 'Southern Peaks Sauvignon Blanc', sku: '216843', size: '750ml', regPrice: '$18.99', offerPrice: '$14.99', save: '$4.00' },
    { name: '"Open late this Friday until 10pm"', sku: 'N/A', size: 'N/A', regPrice: 'N/A', offerPrice: 'N/A', save: 'N/A' },
    { name: 'Coastal Road Pinot Noir', sku: '197624', size: '750ml', regPrice: '$27.99', offerPrice: '$21.99', save: '$6.00' },
    { name: 'Kauri Creek Chardonnay', sku: '208451', size: '750ml', regPrice: '$24.99', offerPrice: '$19.99', save: '$5.00' },
    { name: 'Heritage Hills Single Malt', sku: '192365', size: '700ml', regPrice: '$79.99', offerPrice: '$69.99', save: '$10.00' },
    { name: 'Premium Angus Beef Steak', sku: '304958', size: '500g', regPrice: '$15.99', offerPrice: '$12.99', save: '$3.00' },
    { name: 'Organic Avocados', sku: '495832', size: '3 Pack', regPrice: '$6.99', offerPrice: '$4.99', save: '$2.00' }
  ];

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setSelectedOption(null);
    setIsPromptGenerated(false);
    onClose();
  };

  const isStep2Complete = 
    selectedModalRegions.length > 0 &&
    selectedModalFormats.length > 0 &&
    selectedModalScreenFormats.length > 0 &&
    selectedModalScreenTypes.length > 0 &&
    selectedModalAdverts !== '';

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {step > 1 && (
              <button className={styles.backBtn} onClick={() => setStep(step - 1)}>
                &larr;
              </button>
            )}
            <span className={styles.title}>
              {step === 1 ? 'Select Your Datasource' : step === 3 ? 'Review Campaign' : 'Prepare AI Prompt'}
            </span>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.closeBtn} onClick={handleClose}>&times;</button>
          </div>
        </div>

        <div className={styles.contentWrapper}>
          <div className={styles.sidebar}>
            <div className={styles.stepper}>
              <div className={styles.stepperProgress} style={{ height: step === 1 ? '0%' : step === 2 ? '25%' : step === 3 ? '50%' : step === 4 ? '75%' : '100%' }}></div>
              
              <div className={styles.stepItem}>
                <div className={`${styles.stepCircle} ${step >= 1 ? styles.activeStep : ''}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <div className={styles.stepLabelContainer}>
                  <div className={`${styles.stepLabel} ${step >= 1 ? styles.activeLabel : ''}`}>Select Datasource</div>
                </div>
              </div>

              <div className={styles.stepItem}>
                <div className={`${styles.stepCircle} ${step >= 2 ? styles.activeStep : ''}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <div className={styles.stepLabelContainer}>
                  <div className={`${styles.stepLabel} ${step >= 2 ? styles.activeLabel : ''}`}>Campaign Details</div>
                </div>
              </div>

              <div className={styles.stepItem}>
                <div className={`${styles.stepCircle} ${step >= 3 ? styles.activeStep : ''}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                    <polyline points="2 17 12 22 22 17"></polyline>
                    <polyline points="2 12 12 17 22 12"></polyline>
                  </svg>
                </div>
                <div className={styles.stepLabelContainer}>
                  <div className={`${styles.stepLabel} ${step >= 3 ? styles.activeLabel : ''}`}>AI Selection</div>
                </div>
              </div>

              <div className={styles.stepItem}>
                <div className={`${styles.stepCircle} ${step >= 4 ? styles.activeStep : ''}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <div className={styles.stepLabelContainer}>
                  <div className={`${styles.stepLabel} ${step >= 4 ? styles.activeLabel : ''}`}>AI Prompt</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.mainContent}>
            <div className={styles.body} style={step === 2 ? { padding: '16px' } : undefined}>
          {step === 1 ? (
            <>
              <div className={styles.optionsContainer}>
            {/* Option 1: 11ANTS */}
            <div 
              className={`${styles.option} ${selectedOption === 'ants' ? styles.selected : ''}`}
              onClick={() => setSelectedOption('ants')}
            >
              <div className={styles.iconWrapper}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className={styles.antsTitle}>11ANTS</div>
                  <div className={styles.antsSub}>Put Your Retail Loyalty Data to Work</div>
                </div>
              </div>
              <div className={styles.radioCircle}>
                <div className={styles.radioCircleInner}></div>
              </div>
              <div className={styles.optionLabel}>Retail<br/>Intelligence</div>
            </div>

            {/* Option 2: Ticket IT */}
            <div 
              className={`${styles.option} ${selectedOption === 'ticket' ? styles.selected : ''}`}
              onClick={() => setSelectedOption('ticket')}
            >
              <div className={styles.iconWrapper}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                   <svg width="40" height="40" viewBox="0 0 40 40">
                      <path d="M5 10 C 5 5, 10 5, 10 5 L 30 5 C 35 5, 35 10, 35 10 L 35 25 C 35 30, 30 30, 30 30 L 15 30 L 10 35 L 10 30 C 5 30, 5 25, 5 25 Z" fill="#eb2771" />
                      <text x="20" y="22" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">IT</text>
                   </svg>
                   <div className={styles.ticketText}>Ticket</div>
                </div>
              </div>
              <div className={styles.radioCircle}>
                <div className={styles.radioCircleInner}></div>
              </div>
              <div className={styles.optionLabel}>Ticket-IT POS<br/>Integration</div>
            </div>

            {/* Option 3: XLS */}
            <div 
              className={`${styles.option} ${selectedOption === 'xls' ? styles.selected : ''}`}
              onClick={() => setSelectedOption('xls')}
            >
              <div className={styles.iconWrapper}>
                <div style={{ position: 'relative' }}>
                  <svg width="40" height="50" viewBox="0 0 40 50" fill="none" stroke="#333" strokeWidth="2">
                    <path d="M5 5 L 25 5 L 35 15 L 35 45 L 5 45 Z" fill="white" />
                    <path d="M25 5 L 25 15 L 35 15" fill="none" />
                    <text x="20" y="28" fill="#333" stroke="none" fontSize="14" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">XLS</text>
                    <line x1="10" y1="35" x2="30" y2="35" />
                    <line x1="10" y1="40" x2="25" y2="40" />
                  </svg>
                  <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: 'absolute', bottom: -5, right: -12 }}>
                    <circle cx="12" cy="12" r="10" fill="red" stroke="white" strokeWidth="2" />
                    <path d="M12 16 L 12 8 M 9 11 L 12 8 L 15 11" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className={styles.radioCircle}>
                <div className={styles.radioCircleInner}></div>
              </div>
              <div className={styles.optionLabel}>Supplemental Data<br/>Upload</div>
            </div>
          </div>

          <div className={styles.actions}>
            <button 
              className={`${styles.actionBtnWithIcon} ${styles.btnManual} ${selectedOption ? styles.disabledBtn : ''}`}
              onClick={() => {
                if (!selectedOption) {
                  onClose();
                  router.push('/create-campaign');
                }
              }}
              disabled={!!selectedOption}
            >
              <div className={styles.btnIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </div>
              <div className={styles.btnText}>
                Manual Campaign
              </div>
            </button>
            <button 
              className={`${styles.actionBtnWithIcon} ${styles.btnData} ${!selectedOption ? styles.disabledBtn : ''}`}
              onClick={() => selectedOption && setStep(2)}
              disabled={!selectedOption}
            >
              <div className={styles.btnIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                </svg>
              </div>
              <div className={styles.btnText}>
                Data Campaign
              </div>
            </button>
          </div>
            </>
          ) : step === 2 ? (
            <>
              
              {/* Campaign Details */}
              <div className={formStyles.panel}>
                <div className={formStyles.panelHeader}>Campaign Details</div>
                <div className={formStyles.panelBody}>
                  <div className={formStyles.formRow}>
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.label}>Campaign Name <span className={formStyles.required}>*</span></label>
                      <input type="text" className={formStyles.input} defaultValue="AI Generated Campaign" />
                    </div>
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.label}>Commercials <span className={formStyles.required}>*</span></label>
                      <input type="text" className={formStyles.input} />
                    </div>
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.label}>Brand Owner <span className={formStyles.required}>*</span></label>
                      <input type="text" className={formStyles.input} />
                    </div>
                  </div>
                  <div className={formStyles.formRow}>
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.label}>Start Date <span className={formStyles.required}>*</span></label>
                      <input type="date" className={formStyles.input} />
                    </div>
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.label}>Start Time <span className={formStyles.required}>*</span></label>
                      <input type="time" className={formStyles.input} />
                    </div>
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.label}>End Date <span className={formStyles.required}>*</span></label>
                      <input type="date" className={formStyles.input} />
                    </div>
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.label}>End Time <span className={formStyles.required}>*</span></label>
                      <input type="time" className={formStyles.input} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Campaign Stores */}
              <div className={formStyles.panel} style={{ marginTop: '16px' }}>
                <div className={formStyles.panelHeader}>Campaign Stores</div>
                <div className={formStyles.panelBody}>
                  <div className={formStyles.formRow}>
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.label}>Regions</label>
                      <select 
                        className={formStyles.select} 
                        value={selectedModalRegions[0] || ''}
                        onChange={(e) => setSelectedModalRegions([e.target.value])}
                      >
                        <option value="">Select Regions</option>
                        {modalRegionOptions.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.label}>Store Format Type</label>
                      <select 
                        className={formStyles.select}
                        value={selectedModalFormats[0] || ''}
                        onChange={(e) => setSelectedModalFormats([e.target.value])}
                      >
                        <option value="">Select Format</option>
                        {modalFormatOptions.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.label}>Tags</label>
                      <select className={formStyles.select} defaultValue="High Traffic">
                        <option>Select</option>
                        <option value="High Traffic">High Traffic</option>
                        <option value="VIP Stores">VIP Stores</option>
                      </select>
                    </div>
                  </div>
                  <div className={formStyles.formRow}>
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.label}>Select Specific Stores <span className={formStyles.required}>*</span></label>
                      <select className={formStyles.select} defaultValue="Store 101, Store 202">
                        <option>Store 101, Store 202</option>
                        <option>All Stores in Region</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campaign Screens */}
              <div className={formStyles.panel} style={{ marginTop: '16px' }}>
                <div className={formStyles.panelHeader}>Campaign Screens</div>
                <div className={formStyles.panelBody}>
                  <div className={formStyles.formRow}>
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.label}>Select Tags</label>
                      <select 
                        className={formStyles.select}
                        value={selectedModalScreenFormats[0] || ''}
                        onChange={(e) => setSelectedModalScreenFormats([e.target.value])}
                      >
                        <option value="">Select Tags</option>
                        {modalScreenFormatOptions.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.label}>Select Screens <span className={formStyles.required}>*</span></label>
                      <select 
                        className={formStyles.select}
                        value={selectedModalScreenTypes[0] || ''}
                        onChange={(e) => setSelectedModalScreenTypes([e.target.value])}
                      >
                        <option value="">Select</option>
                        {modalScreenTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.actions} style={{ justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px' }}>
                <button className={`${styles.actionBtnWithIcon} ${styles.btnData}`} onClick={() => setStep(3)}>
                  <div className={styles.btnIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </div>
                  <div className={styles.btnText}>
                    Proceed
                  </div>
                </button>
              </div>
            </>
          ) : step === 3 ? (
            <>
              <div className={styles.aiSelectionHeader}>Refine Product AI Selection</div>
              <div className={styles.aiSelectionTable}>
                {aiSelectionRows.map((row, i) => (
                  <div key={row.id} className={styles.aiSelectionRow}>
                    <div className={styles.aiSelectionRowNumber}>{i + 1}</div>
                    <select className={styles.aiSelectionSelect} value={row.category} onChange={(e) => updateAiRow(row.id, 'category', e.target.value)}>
                      <option>On Promotion</option>
                      <option>Brand supplied</option>
                      <option>Opening Hours</option>
                      <option>Story</option>
                    </select>
                    <select className={styles.aiSelectionSelect} value={row.logic} onChange={(e) => updateAiRow(row.id, 'logic', e.target.value)}>
                      <option>Most Profit</option>
                      <option>Select content from DAM Module</option>
                      <option>Loyalty Advert</option>
                    </select>
                    <select className={styles.aiSelectionSelect} value={row.fallback} onChange={(e) => updateAiRow(row.id, 'fallback', e.target.value)}>
                      <option>Low stock replace</option>
                      <option>Not Applicable</option>
                    </select>
                    <select className={styles.aiSelectionSelect} value={row.format} onChange={(e) => updateAiRow(row.id, 'format', e.target.value)}>
                      <option>Static</option>
                      <option>PP Animation</option>
                      <option>AI Animation</option>
                    </select>
                    <select className={styles.aiSelectionSelect} value={row.duration} onChange={(e) => updateAiRow(row.id, 'duration', e.target.value)}>
                      <option value="5 Sec">5 Sec</option>
                      <option value="10 Sec">10 Sec</option>
                      <option value="15 Sec">15 Sec</option>
                      <option value="30 Sec">30 Sec</option>
                    </select>
                    <button 
                      className={styles.btnRemoveRow} 
                      onClick={() => setAiSelectionRows(prev => prev.filter(r => r.id !== row.id))}
                      title="Remove Ad Slot"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                <button 
                  className={styles.btnAddRow}
                  onClick={() => setAiSelectionRows(prev => [...prev, { id: Date.now(), category: 'On Promotion', logic: 'Most Profit', fallback: 'Low stock replace', format: 'Static', duration: '10 Sec' }])}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Ad Slot
                </button>
              </div>
              <div className={styles.actions} style={{ justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                <button className={`${styles.actionBtnWithIcon} ${styles.btnData}`} onClick={() => {
                  setPromptText(generateDynamicPrompt());
                  setStep(4);
                }}>
                  <div className={styles.btnIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </div>
                  <div className={styles.btnText}>
                    AI Build Product List
                  </div>
                </button>
              </div>
            </>
          ) : step === 5 ? (
            <>
              <div className={styles.aiSelectionHeader}>Generated Campaign Tickets</div>
              <div className={styles.ticketsGrid}>
                {aiSelectionRows.map((row, i) => (
                  <div key={row.id} className={styles.ticketCard}>
                    <div className={styles.ticketYellowCorner}></div>
                    <div className={styles.ticketCornerText}>SPECIAL<br/>PRICE</div>
                    <div className={styles.ticketPrice}><span className={styles.ticketPriceSmall}>$</span>89<span className={styles.ticketPriceSmall}>.99</span></div>
                    <div className={styles.ticketSaveRow}>
                      <div className={styles.ticketSaveTag}>SAVE $10</div>
                      <div className={styles.ticketPerUnit}>$99.99 / 100ml</div>
                    </div>
                    <div className={styles.ticketProductName}>Macro Organic Olive Oil<br/>Spanish Extra Virgin 500ml</div>
                    <div className={styles.ticketFooter}>
                      <div>Ends 24/06/26</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>12312323</span>
                        <div className={styles.ticketBarcode}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.actions} style={{ justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                <button className={`${styles.actionBtnWithIcon} ${styles.btnData}`} onClick={handleClose}>
                  <div className={styles.btnIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div className={styles.btnText}>
                    Save Campaign
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              <>
                <div className={styles.aiSelectionHeader}>
                  Fetched Product Data from {selectedOption === 'ants' ? '11ANTS Engine' : selectedOption === 'ticket' ? 'Ticket-IT POS' : 'Database'}
                </div>
                <table className={styles.fetchedProductsTable}>
                  <thead>
                    <tr>
                      <th>Selection</th>
                      <th>Product / advert</th>
                      <th>SKU</th>
                      <th>Size</th>
                      <th>Regular price</th>
                      <th>Offer price</th>
                      <th>Saving</th>
                      <th>Artwork</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiSelectionRows.map((row, index) => {
                      const product = mockProducts[index % mockProducts.length];
                      return (
                        <tr key={index}>
                          <td>{row.category} {row.logic !== 'Not applicable' ? `– ${row.logic}` : ''}</td>
                          <td>{product.name}</td>
                          <td>{product.sku}</td>
                          <td>{product.size}</td>
                          <td>{product.regPrice}</td>
                          <td>{product.offerPrice}</td>
                          <td>{product.save}</td>
                          <td>{row.format}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className={styles.aiSelectionHeader}>Prompt as per previous data</div>
                <textarea 
                  className={styles.promptTextarea}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={18}
                />
                <div className={styles.actions} style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button 
                    className={`${styles.actionBtnWithIcon} ${styles.btnData}`}
                    onClick={() => {
                      if (onCreate) onCreate();
                      else onClose();
                    }}
                  >
                    <div className={styles.btnIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                    </div>
                    <div className={styles.btnText}>
                      Create Campaign
                    </div>
                  </button>
                </div>
              </>
          </>
          )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCampaignModal;
