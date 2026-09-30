import React from 'react';
import styles from '../wizard.module.css';
import local from './Step04Media.module.css';
import { MEDIA_OPTIONS } from '../options';
import { DEVICES } from '../mockData';
import { AlertIcon } from '../icons';
import type { MediaChoice, StepProps } from '../types';

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const SignageIcon = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" {...iconProps}>
    <rect x="5" y="8" width="38" height="24" rx="2"></rect>
    <line x1="24" y1="32" x2="24" y2="39"></line>
    <line x1="15" y1="40" x2="33" y2="40"></line>
    <polyline points="12 25 19 18 24 22 31 14 36 19"></polyline>
  </svg>
);

const EslIcon = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" {...iconProps}>
    <rect x="5" y="13" width="38" height="22" rx="2"></rect>
    <line x1="10" y1="19" x2="24" y2="19"></line>
    <line x1="10" y1="24" x2="20" y2="24"></line>
    <line x1="10" y1="29" x2="13" y2="29"></line>
    <line x1="16" y1="29" x2="17" y2="29"></line>
    <line x1="20" y1="29" x2="22" y2="29"></line>
    <path d="M37 20.5c-1-1.5-5.5-1.5-5.5 1.2 0 3 6 1.6 6 4.8 0 2.8-5 2.8-6.3 1"></path>
    <line x1="34.3" y1="17.5" x2="34.3" y2="30.5"></line>
  </svg>
);

const MEDIA_ICONS: Record<Exclude<MediaChoice, ''>, React.ReactNode> = {
  signage: <SignageIcon />,
  esl: <EslIcon />,
  both: (
    <>
      <SignageIcon size={46} />
      <EslIcon size={46} />
    </>
  ),
};

const plural = (count: number, word: string) => `${word}${count === 1 ? '' : 's'}`;

const Step04Media: React.FC<StepProps> = ({ draft, update, errors, showErrors, goToStep }) => {
  const storeIds = new Set(draft.storeIds);
  let signageCount = 0;
  let eslCount = 0;
  for (const device of DEVICES) {
    if (!storeIds.has(device.storeId)) continue;
    if (device.media === 'signage') signageCount += 1;
    else eslCount += 1;
  }
  const storeCount = storeIds.size;
  const storesText = `${storeCount} selected ${plural(storeCount, 'store')}`;

  const renderCount = (value: Exclude<MediaChoice, ''>) => {
    if (value === 'both') {
      return (
        <>
          <strong>{signageCount + eslCount}</strong> {plural(signageCount + eslCount, 'device')} in {storesText}
          <br />
          {signageCount} Digital Signage + {eslCount} ESL
        </>
      );
    }
    const count = value === 'signage' ? signageCount : eslCount;
    const noun = value === 'signage' ? plural(count, 'screen') : `ESL ${plural(count, 'group')}`;
    return (
      <>
        <strong>{count}</strong> {noun} in {storesText}
      </>
    );
  };

  return (
    <div>
      <p className={styles.sectionIntro}>
        Choose where this campaign will be shown. The devices you can pick on the next screen depend on this choice.
      </p>

      {storeCount === 0 && (
        <div className={`${styles.alert} ${styles.alertWarning}`}>
          <AlertIcon />
          <span>No stores are selected yet, so no devices are available for any media.</span>
        </div>
      )}

      <div className={`${styles.optionCards} ${local.cards}`} role="radiogroup" aria-label="Campaign media">
        {MEDIA_OPTIONS.map(option => {
          const selected = draft.media === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`${styles.optionCard} ${local.card} ${selected ? `${styles.optionCardSelected} ${local.cardSelected}` : ''}`}
              onClick={() => update({ media: option.value })}
            >
              <div className={`${styles.optionCardIcon} ${local.icon}`}>{MEDIA_ICONS[option.value]}</div>
              <div className={styles.radioCircle}>
                <div className={styles.radioCircleInner}></div>
              </div>
              <div className={styles.optionCardTitle}>{option.label}</div>
              <div className={styles.optionCardText}>{option.description}</div>
              <div className={local.deviceCount}>{renderCount(option.value)}</div>
            </button>
          );
        })}
      </div>

      {showErrors && errors.media && <div className={`${styles.errorText} ${local.cardsError}`}>{errors.media}</div>}

      {showErrors && errors.eslLimit && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          <AlertIcon />
          <span className={local.alertBody}>
            {errors.eslLimit} The schedule is currently set to {draft.changesPerDay} changes per day.
          </span>
          <button
            type="button"
            className={`${styles.btnSmall} ${styles.btnSmallPink} ${local.alertAction}`}
            onClick={() => goToStep(2)}
          >
            Change frequency
          </button>
        </div>
      )}

      {draft.media === 'both' && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Separate Content Requirements</div>
          <div className={styles.panelBody}>
            <p className={styles.sectionIntro}>
              Selecting both creates separate content requirements within one campaign. Digital Signage and ESL share
              the same schedule, stores and products, but devices, templates and generated content are handled
              separately for each.
            </p>
            <div className={local.requirements}>
              <div className={local.requirement}>
                <div className={local.requirementTitle}>Digital Signage content</div>
                <div className={local.requirementText}>
                  Static or animated content, produced for each screen orientation and resolution you select.
                </div>
              </div>
              <div className={local.requirement}>
                <div className={local.requirementTitle}>ESL content</div>
                <div className={local.requirementText}>
                  Static content only, produced for each label size and colour capability you select.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step04Media;
