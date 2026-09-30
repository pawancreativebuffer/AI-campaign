import React, { useState } from 'react';
import styles from '../wizard.module.css';
import local from './Step06Brief.module.css';
import {
  CONTENT_TYPES,
  DATA_TO_ANALYSE,
  EXTERNAL_FACTORS,
  OBJECTIVES,
  PRODUCT_SOURCES,
} from '../options';
import { PRODUCT_BRANDS, PRODUCT_CATEGORIES, PRODUCT_SUPPLIERS } from '../mockData';
import { toggleValue } from '../helpers';
import { AlertIcon, CheckIcon, EditIcon, EyeIcon, PlusIcon, RefreshIcon, SparkleIcon, TrashIcon } from '../icons';
import type { CampaignBrief, StepProps } from '../types';
import { buildCampaignPrompt, cleanRules, describeProductSource, sourceNeedsDetail } from './promptBuilder';

const RULE_MAX_LENGTH = 120;
const MAX_RULES = 8;

const RULE_EXAMPLES = [
  'Exclude products with fewer than 500 units in stock',
  'Exclude Spirits',
  'Prioritise Wine',
  'Only include products with a margin above 25%',
];

const DETAIL_OPTIONS: Record<string, string[]> = {
  Category: PRODUCT_CATEGORIES,
  Supplier: PRODUCT_SUPPLIERS,
  Brand: PRODUCT_BRANDS,
};

const Step06Brief: React.FC<StepProps> = ({ draft, update, errors, showErrors }) => {
  const { brief } = draft;
  const [editing, setEditing] = useState(!draft.prompt);
  const [generating, setGenerating] = useState(false);

  const hasPrompt = draft.prompt.trim() !== '';
  const isStale = hasPrompt && draft.prompt !== buildCampaignPrompt(draft);
  const needsDetail = sourceNeedsDetail(brief.productSource);
  const briefHasErrors = !!(errors.dataToAnalyse || errors.productSource || errors.contentRequired);
  const showAnswers = editing || !hasPrompt || briefHasErrors;

  const missing: string[] = [];
  if (!draft.objective) missing.push('campaign objective');
  if (brief.dataToAnalyse.length === 0) missing.push('data to analyse');
  if (!brief.productSource) missing.push('products to consider');
  else if (needsDetail && !brief.productSourceDetail) missing.push(brief.productSource.toLowerCase());
  if (brief.contentRequired.length === 0) missing.push('content required');

  const setBrief = (patch: Partial<CampaignBrief>) => update({ brief: { ...brief, ...patch } });

  const setRule = (index: number, value: string) =>
    setBrief({ additionalRules: brief.additionalRules.map((rule, i) => (i === index ? value : rule)) });

  const generate = () => {
    if (generating || missing.length > 0) return;
    setGenerating(true);
    const prompt = buildCampaignPrompt(draft);
    setTimeout(() => {
      update({ prompt });
      setGenerating(false);
      setEditing(false);
    }, 700);
  };

  const panelTitle = (number: number, title: string, required: boolean) => (
    <span className={local.panelTitle}>
      <span className={local.number}>{number}</span>
      <span>
        {title} {required && <span className={styles.required}>*</span>}
      </span>
    </span>
  );

  const regenerateButton = (
    <button type="button" className={`${styles.btnSmall} ${styles.btnSmallPink}`} onClick={generate} disabled={generating || missing.length > 0}>
      <RefreshIcon size={14} /> Regenerate Prompt
    </button>
  );

  if (!showAnswers) {
    const rules = cleanRules(brief.additionalRules);
    return (
      <div>
        <p className={styles.sectionIntro}>
          Ticket-IT has combined your answers with the campaign schedule, stores, media and selected devices to build
          the AI prompt. You do not need to write or edit it yourself.
        </p>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>Your answers</span>
            <button type="button" className={styles.btnOutline} onClick={() => setEditing(true)} disabled={generating}>
              <EditIcon size={14} /> Edit Answers
            </button>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.infoGrid}>
              <div>
                <div className={styles.infoLabel}>Campaign objective</div>
                <div className={styles.infoValue}>{draft.objective || '-'}</div>
              </div>
              <div>
                <div className={styles.infoLabel}>Data to analyse</div>
                <div className={styles.infoValue}>{brief.dataToAnalyse.join(', ') || '-'}</div>
              </div>
              <div>
                <div className={styles.infoLabel}>Products to consider</div>
                <div className={styles.infoValue}>{describeProductSource(brief)}</div>
              </div>
              <div>
                <div className={styles.infoLabel}>External factors</div>
                <div className={styles.infoValue}>{brief.externalFactors.join(', ') || 'None'}</div>
              </div>
              <div>
                <div className={styles.infoLabel}>Content required</div>
                <div className={styles.infoValue}>{brief.contentRequired.join(', ') || '-'}</div>
              </div>
              <div>
                <div className={styles.infoLabel}>Additional rules</div>
                <div className={styles.infoValue}>{rules.length === 0 ? 'None' : `${rules.length} rule${rules.length === 1 ? '' : 's'}`}</div>
              </div>
            </div>
            {rules.length > 0 && (
              <ul className={local.ruleSummary}>
                {rules.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {isStale && (
          <div className={`${styles.alert} ${styles.alertWarning}`}>
            <AlertIcon />
            <div className={local.alertBody}>
              This prompt is out of date. Your answers or the campaign setup (schedule, stores, media or devices) have
              changed since it was generated. Regenerate the prompt before you continue.
              <div className={local.alertAction}>{regenerateButton}</div>
            </div>
          </div>
        )}

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>Generated AI prompt</span>
            <span className={`${styles.badge} ${isStale ? styles.badgeAmber : styles.badgeGreen}`}>
              {isStale ? 'Out of date' : 'Up to date'}
            </span>
          </div>
          <div className={styles.panelBody}>
            {generating ? (
              <div className={local.generating}>
                <span className={styles.spinner}></span> Building the prompt from your answers...
              </div>
            ) : (
              <textarea
                className={styles.promptTextarea}
                value={draft.prompt}
                rows={20}
                readOnly
                aria-label="Generated AI prompt"
              />
            )}
            <div className={local.promptActions}>
              <button type="button" className={styles.btnOutline} onClick={() => setEditing(true)} disabled={generating}>
                <EditIcon size={14} /> Edit Answers
              </button>
              {regenerateButton}
              {!isStale && !generating && (
                <span className={local.continueHint}>Happy with the prompt? Select Continue to see the recommended products.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className={styles.sectionIntro}>
        Answer the questions below instead of writing an AI prompt. Ticket-IT combines your answers with the campaign
        schedule, stores, media and selected devices to generate the complete prompt for you.
      </p>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>{panelTitle(1, 'Campaign objective', true)}</div>
        <div className={styles.panelBody}>
          <div className={styles.chipGroup}>
            {OBJECTIVES.map(objective => (
              <button
                key={objective}
                type="button"
                className={`${styles.chip} ${draft.objective === objective ? styles.chipSelected : ''}`}
                aria-pressed={draft.objective === objective}
                onClick={() => update({ objective })}
              >
                {objective}
              </button>
            ))}
          </div>
          <div className={styles.helpText}>Carried over from the Create Campaign screen. Changing it here updates the campaign.</div>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          {panelTitle(2, 'Data to analyse', true)}
          <span className={styles.panelHeaderMeta}>{brief.dataToAnalyse.length} selected</span>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.chipGroup}>
            {DATA_TO_ANALYSE.map(source => (
              <button
                key={source}
                type="button"
                className={`${styles.chip} ${brief.dataToAnalyse.includes(source) ? styles.chipSelected : ''}`}
                aria-pressed={brief.dataToAnalyse.includes(source)}
                onClick={() => setBrief({ dataToAnalyse: toggleValue(brief.dataToAnalyse, source) })}
              >
                {source}
              </button>
            ))}
          </div>
          {showErrors && errors.dataToAnalyse && <div className={styles.errorText}>{errors.dataToAnalyse}</div>}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>{panelTitle(3, 'Products to consider', true)}</div>
        <div className={styles.panelBody}>
          <div className={styles.chipGroup}>
            {PRODUCT_SOURCES.map(source => (
              <button
                key={source}
                type="button"
                className={`${styles.chip} ${brief.productSource === source ? styles.chipSelected : ''}`}
                aria-pressed={brief.productSource === source}
                onClick={() => {
                  if (source !== brief.productSource) setBrief({ productSource: source, productSourceDetail: '' });
                }}
              >
                {source}
              </button>
            ))}
          </div>
          {showErrors && errors.productSource && <div className={styles.errorText}>{errors.productSource}</div>}

          {needsDetail && (
            <div className={`${styles.formGroup} ${local.detailRow}`}>
              <label className={styles.label} htmlFor="brief-source-detail">
                {brief.productSource} <span className={styles.required}>*</span>
              </label>
              <select
                id="brief-source-detail"
                className={`${styles.select} ${showErrors && !brief.productSourceDetail ? styles.inputError : ''}`}
                value={brief.productSourceDetail}
                onChange={e => setBrief({ productSourceDetail: e.target.value })}
              >
                <option value="">Select a {brief.productSource.toLowerCase()}</option>
                {(DETAIL_OPTIONS[brief.productSource] ?? []).map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}
          {brief.productSource === 'User-selected products' && (
            <div className={styles.helpText}>You will add the products yourself on the next screen.</div>
          )}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          {panelTitle(4, 'External factors', false)}
          <span className={styles.panelHeaderMeta}>Optional</span>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.chipGroup}>
            {EXTERNAL_FACTORS.map(factor => (
              <button
                key={factor}
                type="button"
                className={`${styles.chip} ${brief.externalFactors.includes(factor) ? styles.chipSelected : ''}`}
                aria-pressed={brief.externalFactors.includes(factor)}
                onClick={() => setBrief({ externalFactors: toggleValue(brief.externalFactors, factor) })}
              >
                {factor}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          {panelTitle(5, 'Content required', true)}
          <span className={styles.panelHeaderMeta}>{brief.contentRequired.length} selected</span>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.chipGroup}>
            {CONTENT_TYPES.map(type => (
              <button
                key={type}
                type="button"
                className={`${styles.chip} ${brief.contentRequired.includes(type) ? styles.chipSelected : ''}`}
                aria-pressed={brief.contentRequired.includes(type)}
                onClick={() => setBrief({ contentRequired: toggleValue(brief.contentRequired, type) })}
              >
                {type}
              </button>
            ))}
          </div>
          {showErrors && errors.contentRequired && <div className={styles.errorText}>{errors.contentRequired}</div>}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          {panelTitle(6, 'Additional rules', false)}
          <span className={styles.panelHeaderMeta}>Optional</span>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.helpText} style={{ marginTop: 0, marginBottom: 12 }}>
            One short sentence per rule, for stock thresholds, exclusions or campaign priorities.
          </div>
          {brief.additionalRules.length > 0 && (
            <div className={local.ruleList}>
              {brief.additionalRules.map((rule, index) => (
                <div key={index} className={local.ruleRow}>
                  <span className={local.ruleIndex}>{index + 1}</span>
                  <input
                    type="text"
                    className={styles.input}
                    value={rule}
                    maxLength={RULE_MAX_LENGTH}
                    placeholder={`e.g. ${RULE_EXAMPLES[index % RULE_EXAMPLES.length]}`}
                    aria-label={`Additional rule ${index + 1}`}
                    onChange={e => setRule(index, e.target.value)}
                  />
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnGhost}`}
                    aria-label={`Remove rule ${index + 1}`}
                    onClick={() => setBrief({ additionalRules: brief.additionalRules.filter((_, i) => i !== index) })}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
          {brief.additionalRules.length < MAX_RULES && (
            <button
              type="button"
              className={styles.btnDashed}
              onClick={() => setBrief({ additionalRules: [...brief.additionalRules, ''] })}
            >
              <PlusIcon /> Add rule
            </button>
          )}
        </div>
      </div>

      {hasPrompt && isStale && (
        <div className={`${styles.alert} ${styles.alertWarning}`}>
          <AlertIcon />
          <div className={local.alertBody}>
            Your answers or the campaign setup have changed since the prompt was generated, so the current prompt is
            out of date. Regenerate it before you continue.
          </div>
        </div>
      )}
      {hasPrompt && !isStale && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>
          <CheckIcon />
          <div className={local.alertBody}>The generated prompt matches these answers. You can view it or continue.</div>
        </div>
      )}

      <div className={local.generateBar}>
        {generating ? (
          <div className={local.generating}>
            <span className={styles.spinner}></span> Building the prompt from your answers...
          </div>
        ) : (
          <>
            <button
              type="button"
              className={`${styles.btnWithIcon} ${styles.btnPink}`}
              onClick={generate}
              disabled={missing.length > 0}
            >
              <div className={styles.btnIcon}>{hasPrompt ? <RefreshIcon /> : <SparkleIcon />}</div>
              <div className={styles.btnText}>{hasPrompt ? 'Regenerate Prompt' : 'Generate Prompt'}</div>
            </button>
            {hasPrompt && !briefHasErrors && (
              <button type="button" className={styles.btnOutline} onClick={() => setEditing(false)}>
                <EyeIcon size={14} /> View Prompt
              </button>
            )}
            {missing.length > 0 && (
              <span className={styles.helpText}>To generate the prompt, complete: {missing.join(', ')}.</span>
            )}
          </>
        )}
      </div>
      {showErrors && errors.prompt && <div className={styles.errorText}>{errors.prompt}</div>}
    </div>
  );
};

export default Step06Brief;
