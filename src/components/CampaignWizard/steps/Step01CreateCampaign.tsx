import React from 'react';
import styles from '../wizard.module.css';
import { OBJECTIVES } from '../options';
import type { StepProps } from '../types';

const Step01CreateCampaign: React.FC<StepProps> = ({ draft, update, errors, showErrors }) => {
  const errorFor = (key: string) => (showErrors ? errors[key] : undefined);
  const controlClass = (base: string, key: string) => `${base} ${errorFor(key) ? styles.inputError : ''}`;

  return (
    <div>
      <p className={styles.sectionIntro}>
        Give the campaign a name, say what it should achieve and who owns it. You can add a description or a
        reference to help others recognise it.
      </p>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>Campaign Details</div>
        <div className={styles.panelBody}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="campaign-name">
                Campaign name <span className={styles.required}>*</span>
              </label>
              <input
                id="campaign-name"
                type="text"
                className={controlClass(styles.input, 'name')}
                placeholder="e.g. Spring Liquor Specials"
                value={draft.name}
                onChange={e => update({ name: e.target.value })}
                maxLength={80}
              />
              {errorFor('name') && <span className={styles.errorText}>{errorFor('name')}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="campaign-objective">
                Campaign objective <span className={styles.required}>*</span>
              </label>
              <select
                id="campaign-objective"
                className={controlClass(styles.select, 'objective')}
                value={draft.objective}
                onChange={e => update({ objective: e.target.value })}
              >
                <option value="">Select an objective</option>
                {OBJECTIVES.map(objective => (
                  <option key={objective} value={objective}>
                    {objective}
                  </option>
                ))}
              </select>
              {errorFor('objective') && <span className={styles.errorText}>{errorFor('objective')}</span>}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="campaign-owner">
                Campaign owner <span className={styles.required}>*</span>
              </label>
              <input
                id="campaign-owner"
                type="text"
                className={controlClass(styles.input, 'owner')}
                placeholder="Person or team responsible for the campaign"
                value={draft.owner}
                onChange={e => update({ owner: e.target.value })}
                maxLength={80}
              />
              {errorFor('owner') && <span className={styles.errorText}>{errorFor('owner')}</span>}
            </div>
            <div className={styles.formGroup}></div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="campaign-description">
                Description or reference (optional)
              </label>
              <textarea
                id="campaign-description"
                className={styles.textarea}
                rows={4}
                placeholder="Background, promotion reference, supplier agreement number..."
                value={draft.description}
                onChange={e => update({ description: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.alert}>
        <span>
          The campaign is saved initially as a <strong>Draft</strong> when you continue. Nothing is sent to stores
          until it is scheduled on the final step.
        </span>
      </div>
    </div>
  );
};

export default Step01CreateCampaign;
