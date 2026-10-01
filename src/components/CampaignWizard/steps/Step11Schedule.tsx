import React from 'react';
import styles from '../wizard.module.css';
import local from './Step11Schedule.module.css';
import { STORES } from '../mockData';
import { WIZARD_STEPS } from '../options';
import { formatDateTime, getCampaignShelfLabels, getLoopSeconds, getSelectedDevices, getSelectedStores } from '../helpers';
import { getSlotOutputs } from './ticketContent';
import { getClientPack } from '../clients';
import { runScheduleValidation } from '../validation';
import { AlertIcon, ArrowRightIcon, CheckIcon, CloseIcon } from '../icons';
import type { StepProps, ValidationCheck } from '../types';

// Screen where each failed check is fixed.
const FIX_STEP: Record<ValidationCheck['id'], number> = {
  devices: 5,
  templates: 8,
  conflicts: 2,
  eslLimits: 2,
};

const STATUS_META: Record<ValidationCheck['status'], { text: string; badge: string; icon: string }> = {
  pass: { text: 'Passed', badge: styles.badgeGreen, icon: local.pass },
  warning: { text: 'Warning', badge: styles.badgeAmber, icon: local.warning },
  fail: { text: 'Failed', badge: styles.badgeRed, icon: local.fail },
};

const StatusIcon = ({ status }: { status: ValidationCheck['status'] }) => {
  if (status === 'pass') return <CheckIcon size={14} />;
  if (status === 'warning') return <AlertIcon size={14} />;
  return <CloseIcon size={14} />;
};

const Info = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className={styles.infoLabel}>{label}</div>
    <div className={styles.infoValue}>{children}</div>
  </div>
);

const Step11Schedule: React.FC<StepProps> = ({ draft, goToStep }) => {
  const stores = getSelectedStores(draft);
  const devices = getSelectedDevices(draft);
  const outputs = getSlotOutputs(draft);
  const signageOutputs = outputs.filter(o => o.format.media === 'signage').length;
  const approvedCount = draft.products.filter(p => p.approved).length;
  const labelCount = getCampaignShelfLabels(draft).length;

  const start = formatDateTime(draft.startDate, draft.startTime) || '-';
  const finish = formatDateTime(draft.endDate, draft.endTime) || '-';
  const storesText = `${stores.length} of ${STORES.length}`;
  const devicesText = `${devices.length} screens, ${labelCount} ESL shelf labels`;
  const slotsText = `${draft.slots.length} x ${draft.slotSeconds} sec (${getLoopSeconds(draft)} sec loop)`;
  const outputsText = `${outputs.length} (${signageOutputs} Digital Signage, ${outputs.length - signageOutputs} ESL)`;

  if (draft.status === 'Scheduled') {
    return (
      <div>
        <div className={local.success} role="status">
          <div className={local.successIcon}>
            <CheckIcon size={32} />
          </div>
          <div className={local.successTitle}>Campaign created and scheduled</div>
          <p className={local.successText}>
            &quot;{draft.name}&quot; has been created and its status is now{' '}
            <span className={`${styles.badge} ${styles.badgeGreen}`}>Scheduled</span>. Content will be sent to the
            selected devices when the campaign starts. The campaign can no longer be edited from this wizard.
          </p>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>Scheduled campaign</div>
          <div className={styles.panelBody}>
            <div className={styles.infoGrid}>
              <Info label="Campaign name">{draft.name}</Info>
              <Info label="Status">
                <span className={`${styles.badge} ${styles.badgeGreen}`}>Scheduled</span>
              </Info>
              <Info label="Schedule window">
                {start} to {finish}
              </Info>
              <Info label="Client">{getClientPack(draft.clientId).name}</Info>
              <Info label="Stores">{storesText}</Info>
              <Info label="Devices">{devicesText}</Info>
              <Info label="Slots">{slotsText}</Info>
              <Info label="Content outputs">{outputsText}</Info>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const checks = runScheduleValidation(draft);
  const failed = checks.filter(c => c.status === 'fail').length;
  const warnings = checks.filter(c => c.status === 'warning').length;

  return (
    <div>
      <p className={styles.sectionIntro}>
        Confirm the campaign. Ticket-IT validates device availability, template compatibility, scheduling conflicts
        and ESL update limits before the campaign status is set to Scheduled.
      </p>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          Campaign summary
          <span className={`${styles.badge} ${styles.badgeAmber}`}>{draft.status}</span>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.infoGrid}>
            <Info label="Campaign name">{draft.name || '-'}</Info>
            <Info label="Start">{start}</Info>
            <Info label="Finish">{finish}</Info>
            <Info label="Client">{getClientPack(draft.clientId).name}</Info>
            <Info label="Stores">{storesText}</Info>
            <Info label="Devices">{devicesText}</Info>
            <Info label="Slots">{slotsText}</Info>
            <Info label="Approved products">{approvedCount}</Info>
            <Info label="Content outputs">{outputsText}</Info>
          </div>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          Validation checks
          <span className={styles.panelHeaderMeta}>
            {checks.length - failed - warnings} passed, {warnings} warning(s), {failed} failed
          </span>
        </div>
        <div className={styles.panelBody}>
          <p className={styles.sectionIntro}>
            Failed checks block scheduling and must be fixed first. Warnings do not block scheduling.
          </p>
          <ul className={local.checklist}>
            {checks.map(check => {
              const meta = STATUS_META[check.status];
              const fixStep = FIX_STEP[check.id];
              return (
                <li key={check.id} className={local.checkItem}>
                  <div className={`${local.checkIcon} ${meta.icon}`} aria-hidden="true">
                    <StatusIcon status={check.status} />
                  </div>
                  <div className={local.checkBody}>
                    <div className={local.checkHead}>
                      <span className={local.checkLabel}>{check.label}</span>
                      <span className={`${styles.badge} ${meta.badge}`}>{meta.text}</span>
                    </div>
                    <div className={local.checkDetail}>{check.detail}</div>
                  </div>
                  {check.status === 'fail' ? (
                    <button
                      type="button"
                      className={`${styles.btnSmall} ${styles.btnSmallPink}`}
                      onClick={() => goToStep(fixStep)}
                    >
                      Fix on {WIZARD_STEPS[fixStep - 1].label} <ArrowRightIcon size={14} />
                    </button>
                  ) : check.status === 'warning' ? (
                    <button
                      type="button"
                      className={styles.btnOutline}
                      onClick={() => goToStep(fixStep)}
                    >
                      Review on {WIZARD_STEPS[fixStep - 1].label} <ArrowRightIcon size={14} />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {failed > 0 ? (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          <AlertIcon />
          <div>
            <span className={local.alertTitle}>
              {failed} check(s) failed - the campaign cannot be scheduled yet.
            </span>{' '}
            Fix the failed checks above, then return to this step and confirm with the &quot;Create and Schedule
            Campaign&quot; button below.
          </div>
        </div>
      ) : warnings > 0 ? (
        <div className={`${styles.alert} ${styles.alertWarning}`} role="status">
          <AlertIcon />
          <div>
            <span className={local.alertTitle}>Ready to schedule with {warnings} warning(s).</span> Warnings do not
            block scheduling. To confirm, click the &quot;Create and Schedule Campaign&quot; button below.
          </div>
        </div>
      ) : (
        <div className={`${styles.alert} ${styles.alertSuccess}`} role="status">
          <CheckIcon />
          <div>
            <span className={local.alertTitle}>All checks passed.</span> To confirm, click the &quot;Create and
            Schedule Campaign&quot; button below. The campaign status will be set to Scheduled.
          </div>
        </div>
      )}
    </div>
  );
};

export default Step11Schedule;
