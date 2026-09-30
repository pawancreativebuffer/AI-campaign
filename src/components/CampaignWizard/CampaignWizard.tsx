"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './wizard.module.css';
import { WIZARD_STEPS } from './options';
import { applyDraftPatch, createEmptyDraft } from './helpers';
import { VALIDATION_ENABLED, getStepErrors, runScheduleValidation } from './validation';
import { saveCampaign } from './campaignStore';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from './icons';
import type { CampaignDraft, StepProps } from './types';
import Step01CreateCampaign from './steps/Step01CreateCampaign';
import Step02Schedule from './steps/Step02Schedule';
import Step03Stores from './steps/Step03Stores';
import Step04Media from './steps/Step04Media';
import Step05Devices from './steps/Step05Devices';
import Step06Brief from './steps/Step06Brief';
import Step07Products from './steps/Step07Products';
import Step08Templates from './steps/Step08Templates';
import Step09Preview from './steps/Step09Preview';
import Step10Review from './steps/Step10Review';
import Step11Schedule from './steps/Step11Schedule';

const STEP_COMPONENTS: Record<number, React.ComponentType<StepProps>> = {
  1: Step01CreateCampaign,
  2: Step02Schedule,
  3: Step03Stores,
  4: Step04Media,
  5: Step05Devices,
  6: Step06Brief,
  7: Step07Products,
  8: Step08Templates,
  9: Step09Preview,
  10: Step10Review,
  11: Step11Schedule,
};

const LAST_STEP = WIZARD_STEPS.length;

const CampaignWizard: React.FC = () => {
  const router = useRouter();
  const [draft, setDraft] = useState<CampaignDraft>(createEmptyDraft);
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const [scheduleBlocked, setScheduleBlocked] = useState(false);

  const isScheduled = draft.status === 'Scheduled';
  const errors = useMemo(() => getStepErrors(step, draft), [step, draft]);
  const firstError = Object.values(errors)[0];

  const update = useCallback((patch: Partial<CampaignDraft>) => {
    setDraft(prev => applyDraftPatch(prev, patch));
    setScheduleBlocked(false);
  }, []);

  const showStep = (target: number, withErrors = false) => {
    setStep(target);
    setShowErrors(withErrors);
    setScheduleBlocked(false);
    window.scrollTo({ top: 0 });
  };

  /** Returns the first screen before `target` that still has errors, if any. */
  const firstInvalidStepBefore = (target: number) => {
    for (let s = 1; s < target; s++) {
      if (Object.keys(getStepErrors(s, draft)).length > 0) return s;
    }
    return null;
  };

  const goToStep = (target: number) => {
    if (isScheduled) return;
    const bounded = Math.max(1, Math.min(target, maxStep));
    const invalid = firstInvalidStepBefore(bounded);
    if (invalid !== null) showStep(invalid, true);
    else showStep(bounded);
  };

  const handleNext = () => {
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    // The campaign is saved as a Draft as soon as Screen 1 is complete.
    const saved = draft.id ? draft : { ...draft, id: `CMP-${Date.now()}` };
    if (saved !== draft) setDraft(saved);
    saveCampaign(saved);
    setMaxStep(prev => Math.max(prev, step + 1));
    showStep(step + 1);
  };

  const handleSchedule = () => {
    const invalid = firstInvalidStepBefore(LAST_STEP);
    if (invalid !== null) {
      showStep(invalid, true);
      return;
    }
    if (VALIDATION_ENABLED && runScheduleValidation(draft).some(check => check.status === 'fail')) {
      setScheduleBlocked(true);
      return;
    }
    const scheduled: CampaignDraft = { ...draft, status: 'Scheduled' };
    setDraft(scheduled);
    saveCampaign(scheduled);
  };

  const current = WIZARD_STEPS[step - 1];
  const StepComponent = STEP_COMPONENTS[step];
  const progress = (Math.max(maxStep, step) - 1) / (LAST_STEP - 1);

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <span onClick={() => router.push('/')}>Content Management</span> / Create Campaign
      </div>

      <div className={styles.pageHeader}>
        <button className={styles.goBackBtn} onClick={() => router.push('/')}>
          <ArrowLeftIcon /> Go Back
        </button>
        <div className={styles.pageTitle}>{draft.name.trim() || 'Create Campaign'}</div>
        {draft.id && (
          <span className={`${styles.badge} ${isScheduled ? styles.badgeGreen : styles.badgeAmber} ${styles.pageStatus}`}>
            {draft.status}
          </span>
        )}
      </div>

      <div className={styles.wizard}>
        <div className={styles.wizardHeader}>
          <span className={styles.wizardTitle}>{current.title}</span>
          <span className={styles.wizardStepCount}>
            Step {step} of {LAST_STEP}
          </span>
        </div>

        <div className={styles.wizardBody}>
          <aside className={styles.sidebar}>
            <div className={styles.stepper}>
              <div className={styles.stepperProgress} style={{ height: `calc((100% - 32px) * ${progress})` }}></div>
              {WIZARD_STEPS.map(item => {
                const done = isScheduled || (item.step < maxStep && item.step !== step);
                const isCurrent = item.step === step && !isScheduled;
                const clickable = !isScheduled && item.step <= maxStep && item.step !== step;
                return (
                  <button
                    key={item.step}
                    type="button"
                    className={`${styles.stepItem} ${clickable ? styles.stepItemClickable : ''}`}
                    onClick={() => clickable && goToStep(item.step)}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    <div
                      className={`${styles.stepCircle} ${done ? styles.stepCircleDone : ''} ${isCurrent ? styles.stepCircleCurrent : ''}`}
                    >
                      {done ? <CheckIcon size={14} /> : item.step}
                    </div>
                    <div className={`${styles.stepLabel} ${done || isCurrent ? styles.stepLabelActive : ''}`}>
                      {item.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={styles.main}>
            <div className={styles.content}>
              <StepComponent
                draft={draft}
                update={update}
                errors={errors}
                showErrors={showErrors}
                goToStep={goToStep}
              />
            </div>

            <div className={styles.footer}>
              {step > 1 && !isScheduled && (
                <button className={`${styles.btnWithIcon} ${styles.btnPrev}`} onClick={() => showStep(step - 1)}>
                  <div className={styles.btnIcon}>
                    <ArrowLeftIcon />
                  </div>
                  <div className={styles.btnText}>Prev</div>
                </button>
              )}

              <div className={styles.footerRight}>
                {showErrors && firstError && <span className={styles.footerError}>{firstError}</span>}
                {scheduleBlocked && (
                  <span className={styles.footerError}>Resolve the failed checks before scheduling.</span>
                )}

                {isScheduled ? (
                  <button className={`${styles.btnWithIcon} ${styles.btnGreen}`} onClick={() => router.push('/')}>
                    <div className={styles.btnIcon}>
                      <CheckIcon />
                    </div>
                    <div className={styles.btnText}>Back to Campaigns</div>
                  </button>
                ) : step === LAST_STEP ? (
                  <button className={`${styles.btnWithIcon} ${styles.btnGreen}`} onClick={handleSchedule}>
                    <div className={styles.btnIcon}>
                      <CheckIcon />
                    </div>
                    <div className={styles.btnText}>Create and Schedule Campaign</div>
                  </button>
                ) : (
                  <button className={`${styles.btnWithIcon} ${styles.btnGreen}`} onClick={handleNext}>
                    <div className={styles.btnIcon}>
                      <ArrowRightIcon />
                    </div>
                    <div className={styles.btnText}>{step === 6 ? 'Continue' : 'Next'}</div>
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CampaignWizard;
