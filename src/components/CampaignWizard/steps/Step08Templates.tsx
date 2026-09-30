import React from 'react';
import styles from '../wizard.module.css';
import css from './Step08Templates.module.css';
import ContentPreview from './ContentPreview';
import { TEMPLATE_BY_ID, getCompatibleTemplates, getRequiredFormats, mediaLabel } from '../helpers';
import { AlertIcon, CheckIcon } from '../icons';
import type { ContentFormat, DeviceMedia, StepProps } from '../types';

const MEDIA_GROUPS: { media: DeviceMedia; rule: string }[] = [
  { media: 'signage', rule: 'Static or animated templates' },
  { media: 'esl', rule: 'Static templates only' },
];

const Step08Templates: React.FC<StepProps> = ({ draft, update, errors, showErrors, goToStep }) => {
  const formats = getRequiredFormats(draft);

  if (formats.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={css.emptyText}>
          No devices are selected, so there are no content formats to choose templates for.
        </p>
        <button type="button" className={`${styles.btnSmall} ${styles.btnSmallPink}`} onClick={() => goToStep(5)}>
          Select Devices
        </button>
      </div>
    );
  }

  const selectedTemplate = (format: ContentFormat) => TEMPLATE_BY_ID.get(draft.templateSelections[format.key] ?? '');
  const doneCount = formats.filter(f => selectedTemplate(f)).length;

  const selectTemplate = (format: ContentFormat, templateId: string) => {
    if (draft.templateSelections[format.key] === templateId) return;
    update({ templateSelections: { ...draft.templateSelections, [format.key]: templateId } });
  };

  return (
    <div>
      <p className={styles.sectionIntro}>
        Choose one approved template for each content format this campaign needs. Only templates compatible with the
        selected media, device formats and sizes are shown.
      </p>

      <div className={styles.alert}>
        <AlertIcon />
        <div>
          <strong>Digital Signage</strong> may use static or animated templates. <strong>ESL</strong> content must
          always be static, so only static templates are offered for ESL formats.
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.counter}>
          <strong>{doneCount}</strong> of {formats.length} {formats.length === 1 ? 'format has' : 'formats have'} a
          template
        </div>
        <div className={css.progressTrack} aria-hidden="true">
          <div className={css.progressFill} style={{ width: `${(doneCount / formats.length) * 100}%` }}></div>
        </div>
      </div>

      {showErrors && errors.templates && (
        <div className={`${styles.alert} ${styles.alertError}`}>
          <AlertIcon />
          <div>{errors.templates}</div>
        </div>
      )}

      {MEDIA_GROUPS.map(group => {
        const groupFormats = formats.filter(f => f.media === group.media);
        if (groupFormats.length === 0) return null;
        return (
          <section key={group.media} className={css.mediaGroup}>
            <div className={css.mediaHeader}>
              <h3 className={css.mediaTitle}>{mediaLabel(group.media)}</h3>
              <span className={`${styles.badge} ${group.media === 'esl' ? styles.badgeDark : styles.badgeBlue}`}>
                {group.rule}
              </span>
              <span className={styles.panelHeaderMeta}>
                {groupFormats.length} {groupFormats.length === 1 ? 'format' : 'formats'}
              </span>
            </div>

            {groupFormats.map(format => {
              const templates = getCompatibleTemplates(format);
              const selected = selectedTemplate(format);
              return (
                <div key={format.key} className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <span>{format.label}</span>
                    <span className={styles.toolbarGroup}>
                      <span className={styles.panelHeaderMeta}>
                        {format.deviceCount} {format.deviceCount === 1 ? 'device' : 'devices'}
                      </span>
                      {selected ? (
                        <span className={`${styles.badge} ${styles.badgeGreen}`}>
                          <CheckIcon size={12} /> {selected.name}
                        </span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeAmber}`}>No template selected</span>
                      )}
                    </span>
                  </div>
                  <div className={styles.panelBody}>
                    {templates.length === 0 ? (
                      <div className={`${styles.alert} ${styles.alertWarning} ${css.noTemplates}`}>
                        <AlertIcon />
                        <div>
                          No approved template is compatible with this format. Remove these devices from the campaign
                          or have a compatible template approved before continuing.{' '}
                          <button type="button" className={css.linkBtn} onClick={() => goToStep(5)}>
                            Change devices
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={css.templateGrid}>
                        {templates.map(template => {
                          const isSelected = selected?.id === template.id;
                          return (
                            <button
                              key={template.id}
                              type="button"
                              className={`${css.templateCard} ${isSelected ? css.templateCardSelected : ''}`}
                              onClick={() => selectTemplate(format, template.id)}
                              aria-pressed={isSelected}
                            >
                              {isSelected && (
                                <span className={css.selectedMark}>
                                  <CheckIcon size={12} />
                                </span>
                              )}
                              <div className={css.thumb}>
                                <ContentPreview template={template} format={format} size="thumb" />
                              </div>
                              <div className={css.templateName}>{template.name}</div>
                              <div className={css.templateMeta}>
                                <span
                                  className={`${styles.badge} ${template.kind === 'Animated' ? styles.badgeBlue : ''}`}
                                >
                                  {template.kind}
                                </span>
                                <span className={css.templateId}>{template.id}</span>
                              </div>
                              <div className={css.contentTypes}>
                                <span className={css.contentTypesLabel}>Supports:</span>{' '}
                                {template.contentTypes.join(', ')}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {showErrors && errors.templates && !selected && templates.length > 0 && (
                      <div className={styles.errorText}>Select a template for this format</div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
};

export default Step08Templates;
