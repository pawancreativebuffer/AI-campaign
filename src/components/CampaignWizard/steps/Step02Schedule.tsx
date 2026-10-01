import React from 'react';
import styles from '../wizard.module.css';
import local from './Step02Schedule.module.css';
import { DAYS, ESL_MAX_CHANGES_PER_DAY } from '../options';
import { formatTime12, getChangeTimes, getStoreHoursRange, mediaIncludes, toggleValue } from '../helpers';
import { AlertIcon } from '../icons';
import type { StepProps } from '../types';

const QUICK_PICKS = [
  { label: 'Every day', days: DAYS },
  { label: 'Weekdays', days: DAYS.slice(0, 5) },
  { label: 'Weekends', days: DAYS.slice(5) },
];

const MAX_TIMES_SHOWN = 12;

const Step02Schedule: React.FC<StepProps> = ({ draft, update, errors, showErrors }) => {
  const errorFor = (key: string) => (showErrors ? errors[key] : undefined);
  const inputClass = (key: string) => `${styles.input} ${errorFor(key) ? styles.inputError : ''}`;

  const sameDays = (days: string[]) =>
    days.length === draft.activeDays.length && days.every(d => draft.activeDays.includes(d));

  const toggleDay = (day: string) => {
    const next = toggleValue(draft.activeDays, day);
    update({ activeDays: DAYS.filter(d => next.includes(d)) });
  };

  // Stores keep their own opening hours; the example shows how changes spread across a typical day.
  const EXAMPLE_OPEN = '08:00';
  const EXAMPLE_CLOSE = '21:00';
  const changeTimes = getChangeTimes(draft.changesPerDay, EXAMPLE_OPEN, EXAMPLE_CLOSE);
  const hours = getStoreHoursRange(draft);
  const hasEsl = mediaIncludes(draft.media, 'esl');
  const overEslLimit = draft.changesPerDay > ESL_MAX_CHANGES_PER_DAY;
  const eslNoteClass = !overEslLimit ? '' : hasEsl ? styles.alertError : styles.alertWarning;

  return (
    <div>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>Campaign Period</div>
        <div className={styles.panelBody}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="schedule-start-date">
                Start date <span className={styles.required}>*</span>
              </label>
              <input
                id="schedule-start-date"
                type="date"
                className={inputClass('startDate')}
                value={draft.startDate}
                onChange={e => update({ startDate: e.target.value })}
              />
              {errorFor('startDate') && <span className={styles.errorText}>{errorFor('startDate')}</span>}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="schedule-start-time">
                Start time <span className={styles.required}>*</span>
              </label>
              <input
                id="schedule-start-time"
                type="time"
                className={inputClass('startTime')}
                value={draft.startTime}
                onChange={e => update({ startTime: e.target.value })}
              />
              {errorFor('startTime') && <span className={styles.errorText}>{errorFor('startTime')}</span>}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="schedule-end-date">
                Finish date <span className={styles.required}>*</span>
              </label>
              <input
                id="schedule-end-date"
                type="date"
                className={inputClass('endDate')}
                value={draft.endDate}
                min={draft.startDate || undefined}
                onChange={e => update({ endDate: e.target.value })}
              />
              {errorFor('endDate') && <span className={styles.errorText}>{errorFor('endDate')}</span>}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="schedule-end-time">
                Finish time <span className={styles.required}>*</span>
              </label>
              <input
                id="schedule-end-time"
                type="time"
                className={inputClass('endTime')}
                value={draft.endTime}
                onChange={e => update({ endTime: e.target.value })}
              />
              {errorFor('endTime') && <span className={styles.errorText}>{errorFor('endTime')}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span>
            Active Days <span className={styles.required}>*</span>
          </span>
          <span className={styles.panelHeaderMeta}>
            {draft.activeDays.length} of {DAYS.length} days selected
          </span>
        </div>
        <div className={styles.panelBody}>
          <div className={local.daysRow}>
            <div className={styles.chipGroup} role="group" aria-label="Active days">
              {DAYS.map(day => {
                const selected = draft.activeDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className={local.quickPicks}>
              {QUICK_PICKS.map(pick => (
                <button
                  key={pick.label}
                  type="button"
                  className={`${styles.btnOutline} ${sameDays(pick.days) ? local.quickPickActive : ''}`}
                  onClick={() => update({ activeDays: [...pick.days] })}
                >
                  {pick.label}
                </button>
              ))}
            </div>
          </div>
          {errorFor('activeDays') && <div className={styles.errorText}>{errorFor('activeDays')}</div>}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>Content Changes</div>
        <div className={styles.panelBody}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="schedule-changes">
                Content changes per day <span className={styles.required}>*</span>
              </label>
              <input
                id="schedule-changes"
                type="number"
                min={1}
                step={1}
                className={inputClass('changesPerDay')}
                value={draft.changesPerDay > 0 ? draft.changesPerDay : ''}
                onChange={e => {
                  const value = parseInt(e.target.value, 10);
                  update({ changesPerDay: Number.isNaN(value) ? 0 : Math.max(0, value) });
                }}
              />
              {errorFor('changesPerDay') ? (
                <span className={styles.errorText}>{errorFor('changesPerDay')}</span>
              ) : (
                <span className={styles.helpText}>How often the content changes on each active day.</span>
              )}
            </div>
          </div>

          <div className={local.changeTimes}>
            <div className={local.changeTimesTitle}>When content changes</div>
            {changeTimes.length > 0 ? (
              <>
                <div className={local.changeTimesList}>
                  {changeTimes.slice(0, MAX_TIMES_SHOWN).map((time, i) => (
                    <span key={`${time}-${i}`} className={`${styles.badge} ${styles.badgePink}`}>
                      {formatTime12(time)}
                    </span>
                  ))}
                  {changeTimes.length > MAX_TIMES_SHOWN && (
                    <span className={styles.badge}>+{changeTimes.length - MAX_TIMES_SHOWN} more</span>
                  )}
                </div>
                <div className={styles.helpText}>
                  Example for a store open {formatTime12(EXAMPLE_OPEN)} - {formatTime12(EXAMPLE_CLOSE)}. Every store uses its own
                  opening hours from the store data: the first change is when the store opens and the rest are spread evenly
                  until it closes.
                  {hours &&
                    ` Your selected stores open between ${formatTime12(hours.open)} and ${formatTime12(hours.close)}.`}
                </div>
              </>
            ) : (
              <div className={styles.helpText}>
                Enter at least one content change per day to see when content changes.
              </div>
            )}
          </div>

          <div className={`${styles.alert} ${eslNoteClass} ${local.eslNote}`} role={overEslLimit && hasEsl ? 'alert' : undefined}>
            {overEslLimit && <AlertIcon />}
            <span>
              <strong>ESL rule:</strong> ESL campaigns must allow no more than {ESL_MAX_CHANGES_PER_DAY} content
              changes per day within store opening hours.
              {overEslLimit && hasEsl && (
                <>
                  {' '}
                  This campaign includes ESL and is set to {draft.changesPerDay} changes per day. Reduce it to{' '}
                  {ESL_MAX_CHANGES_PER_DAY} or fewer to continue.
                </>
              )}
              {overEslLimit && !hasEsl && (
                <>
                  {' '}
                  At {draft.changesPerDay} changes per day this campaign can only use Digital Signage.
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step02Schedule;
