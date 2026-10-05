'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../CampaignWizard/wizard.module.css';
import local from './CampaignReport.module.css';
import { formatDate, formatDateTime, formatTime12 } from '../CampaignWizard/helpers';
import { getClientPack } from '../CampaignWizard/clients';
import { ArrowLeftIcon, EditIcon } from '../CampaignWizard/icons';
import { buildProofOfPlay } from './proofOfPlay';
import type { CampaignDraft } from '../CampaignWizard/types';

interface CampaignReportProps {
  draft: CampaignDraft;
  today: string; // 'YYYY-MM-DD'
}

const number = (value: number) => Math.round(value).toLocaleString('en-NZ');
const hours = (value: number) => value.toLocaleString('en-NZ', { maximumFractionDigits: 1 });
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

const Info = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className={styles.infoLabel}>{label}</div>
    <div className={styles.infoValue}>{children}</div>
  </div>
);

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className={styles.statCard}>
    <div className={styles.statLabel}>{label}</div>
    <div className={styles.statValue}>{value}</div>
    {sub && <div className={local.statSub}>{sub}</div>}
  </div>
);

/** Proof-of-play report for a campaign created in the wizard. */
const CampaignReport: React.FC<CampaignReportProps> = ({ draft, today }) => {
  const router = useRouter();
  const report = useMemo(() => buildProofOfPlay(draft, today), [draft, today]);
  const scheduled = draft.status === 'Scheduled';
  const projected = report.mode === 'projected';
  const period =
    report.daysCounted > 0 ? `${formatDate(report.periodStart)} to ${formatDate(report.periodEnd)}` : 'No active days';
  const playsLabel = projected ? 'Projected plays' : 'Plays';

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <span onClick={() => router.push('/')}>Content Management</span> / Proof of Play Report
      </div>

      <div className={styles.pageHeader}>
        <button className={styles.goBackBtn} onClick={() => router.push('/')}>
          <ArrowLeftIcon /> Go Back
        </button>
        <div className={styles.pageTitle}>Proof of Play: {draft.name || draft.id}</div>
        <div className={local.headerBadges}>
          <span className={`${styles.badge} ${scheduled ? styles.badgeGreen : styles.badgeAmber}`}>{draft.status}</span>
          <span className={`${styles.badge} ${projected ? styles.badgeBlue : styles.badgePink}`}>{report.label}</span>
        </div>
      </div>

      <div className={styles.alert} role="note">
        <div>
          <strong>Simulated proof-of-play data (prototype).</strong> There are no player logs yet, so plays are worked
          out from the campaign: every selected screen plays each slot in turn ({draft.slotSeconds} sec each) while its
          store is open, and each ESL shelf label updates {draft.changesPerDay} time(s) a day, on the active days only.{' '}
          {projected
            ? 'The campaign has not started yet, so the numbers are projected for the whole campaign.'
            : `Counted up to ${formatDate(report.periodEnd || today)}.`}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          Campaign
          <button
            type="button"
            className={styles.btnOutline}
            onClick={() => router.push(`/intelligent-campaign?edit=${encodeURIComponent(draft.id)}`)}
          >
            <EditIcon size={14} /> Edit campaign
          </button>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.infoGrid}>
            <Info label="Campaign name">{draft.name || '-'}</Info>
            <Info label="Client">{getClientPack(draft.clientId).name}</Info>
            <Info label="Status">{draft.status}</Info>
            <Info label="Start">{formatDateTime(draft.startDate, draft.startTime) || '-'}</Info>
            <Info label="Finish">{formatDateTime(draft.endDate, draft.endTime) || '-'}</Info>
            <Info label="Active days">{draft.activeDays.length === 7 ? 'Every day' : draft.activeDays.join(', ')}</Info>
            <Info label={projected ? 'Period projected' : 'Period counted'}>{period}</Info>
            <Info label="Data">Simulated proof-of-play data (prototype)</Info>
          </div>
        </div>
      </div>

      <div className={styles.statGrid}>
        <Stat label={`${playsLabel} (Digital Signage)`} value={number(report.totalPlays)} sub={report.label} />
        <Stat label="Screens" value={number(report.screens)} />
        <Stat label="Stores" value={number(report.stores)} />
        <Stat
          label="ESL label updates"
          value={number(report.eslUpdates)}
          sub={`${number(report.shelfLabels)} labels x ${draft.changesPerDay} a day`}
        />
        <Stat
          label="Days counted"
          value={number(report.daysCounted)}
          sub={`of ${report.activeDaysTotal} active day(s) in the campaign`}
        />
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          By store
          <span className={styles.panelHeaderMeta}>{report.byStore.length} store(s)</span>
        </div>
        <div className={styles.panelBody}>
          {report.byStore.length === 0 ? (
            <div className={styles.emptyState}>No stores are selected in this campaign.</div>
          ) : (
            <div className={`${styles.tableWrapper} ${styles.tableScroll}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Opening hours</th>
                    <th className={styles.numeric}>Screens</th>
                    <th className={styles.numeric}>{playsLabel}</th>
                    <th className={styles.numeric}>Screen hours on air</th>
                    <th className={styles.numeric}>ESL label updates</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byStore.map(row => (
                    <tr key={row.store.id}>
                      <td>
                        {row.store.name} <span className={local.muted}>{row.store.code}</span>
                      </td>
                      <td>
                        {formatTime12(row.store.openingTime)} - {formatTime12(row.store.closingTime)}
                      </td>
                      <td className={styles.numeric}>{number(row.screens)}</td>
                      <td className={styles.numeric}>{number(row.plays)}</td>
                      <td className={styles.numeric}>{hours(row.screenHours)}</td>
                      <td className={styles.numeric}>{number(row.eslUpdates)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          By slot
          <span className={styles.panelHeaderMeta}>
            {draft.slots.length} slot(s) x {draft.slotSeconds} sec
          </span>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.numeric}>Slot</th>
                  <th>Kind</th>
                  <th>Product or headline</th>
                  <th>Design</th>
                  <th className={styles.numeric}>{playsLabel}</th>
                  <th className={styles.numeric}>Share of plays</th>
                  <th className={styles.numeric}>ESL label updates</th>
                </tr>
              </thead>
              <tbody>
                {report.bySlot.map(row => (
                  <tr key={row.slotNumber}>
                    <td className={styles.numeric}>{row.slotNumber}</td>
                    <td>{row.kind}</td>
                    <td>{row.content}</td>
                    <td>{row.design}</td>
                    <td className={styles.numeric}>{number(row.plays)}</td>
                    <td className={styles.numeric}>{percent(row.share)}</td>
                    <td className={styles.numeric}>{number(row.eslUpdates)}</td>
                  </tr>
                ))}
                <tr className={local.totalRow}>
                  <td colSpan={4}>Total</td>
                  <td className={styles.numeric}>{number(report.totalPlays)}</td>
                  <td className={styles.numeric}>{report.totalPlays > 0 ? '100%' : '-'}</td>
                  <td className={styles.numeric}>{number(report.eslUpdates)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className={local.tableNote}>
            ESL shelf labels only show their own product, so ESL updates are counted on product slots only.
          </div>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          By screen
          <span className={styles.panelHeaderMeta}>{report.byScreen.length} screen(s)</span>
        </div>
        <div className={styles.panelBody}>
          {report.byScreen.length === 0 ? (
            <div className={styles.emptyState}>No Digital Signage screens are selected in this campaign.</div>
          ) : (
            <div className={`${styles.tableWrapper} ${styles.tableScroll}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Screen</th>
                    <th>Store</th>
                    <th>Format</th>
                    <th>Status</th>
                    <th className={styles.numeric}>{playsLabel}</th>
                    <th className={styles.numeric}>Hours on air</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byScreen.map(row => (
                    <tr key={row.device.id}>
                      <td>{row.device.name}</td>
                      <td>{row.store?.name ?? row.device.storeId}</td>
                      <td>
                        {row.device.orientation} {row.device.resolution}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${row.device.status === 'Online' ? styles.badgeGreen : styles.badgeAmber}`}>
                          {row.device.status}
                        </span>
                      </td>
                      <td className={styles.numeric}>{number(row.plays)}</td>
                      <td className={styles.numeric}>{hours(row.hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignReport;
