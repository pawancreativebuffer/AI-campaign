import React from 'react';
import styles from '../wizard.module.css';
import local from './Step10Review.module.css';
import { STORES } from '../mockData';
import { getClientPack, getDesignLabel } from '../clients';
import {
  formatCurrency,
  formatDateTime,
  formatTime12,
  getStoreHoursRange,
  getLoopSeconds,
  getPixelSize,
  getRequiredFormats,
  getCampaignShelfLabels,
  getSelectedDevices,
  getSelectedStores,
  isProductSlot,
  mediaLabel,
  unique,
} from '../helpers';
import { runScheduleValidation } from '../validation';
import { AlertIcon, CheckIcon, EditIcon } from '../icons';
import { describeDataSources } from './promptBuilder';
import TicketPreview from './TicketPreview';
import { getSlotOutputs, getTicketContent } from './ticketContent';
import type { CampaignDraft, CampaignSlot, ContentFormat, DeviceStatus, StepProps } from '../types';

const STATUS_BADGE: Record<DeviceStatus, string> = {
  Online: styles.badgeGreen,
  Offline: styles.badgeRed,
  Maintenance: styles.badgeAmber,
};

function countBy(values: string[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

const listOrDash = (values: string[]) => (values.length > 0 ? values.join(', ') : '-');

const THUMB_WIDTH = 96;
const THUMB_HEIGHT = 64;

/** Small ticket preview: the slot in the first signage format, or (product slots only) the first ESL format. */
const SlotThumb = ({ slot, draft, formats }: { slot: CampaignSlot; draft: CampaignDraft; formats: ContentFormat[] }) => {
  const format = formats.find(f => f.media === 'signage') ?? (isProductSlot(slot.kind) ? formats[0] : undefined);
  if (!format) return <span className={local.productMeta}>Not shown on ESL</span>;
  const { width, height } = getPixelSize(format);
  return (
    <div className={local.thumb}>
      <TicketPreview
        clientId={draft.clientId}
        content={getTicketContent(slot, draft)}
        width={width}
        height={height}
        displayWidth={Math.max(1, Math.min(THUMB_WIDTH, Math.round((THUMB_HEIGHT * width) / height)))}
        eslColour={format.media === 'esl' ? format.eslColour : undefined}
      />
    </div>
  );
};

interface SectionProps {
  title: string;
  step: number;
  meta?: string;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}

const Section = ({ title, step, meta, onEdit, children }: SectionProps) => (
  <div className={styles.panel}>
    <div className={styles.panelHeader}>
      <span>
        {title} {meta && <span className={styles.panelHeaderMeta}>- {meta}</span>}
      </span>
      <button
        type="button"
        className={`${styles.btnOutline} ${local.editBtn}`}
        onClick={() => onEdit(step)}
        aria-label={`Edit ${title}`}
      >
        <EditIcon size={14} /> Edit
      </button>
    </div>
    <div className={styles.panelBody}>{children}</div>
  </div>
);

const Info = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className={styles.infoLabel}>{label}</div>
    <div className={styles.infoValue}>{children}</div>
  </div>
);

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className={styles.statCard}>
    <div className={styles.statLabel}>{label}</div>
    <div className={styles.statValue}>{value}</div>
  </div>
);

const Step10Review: React.FC<StepProps> = ({ draft, goToStep }) => {
  const stores = getSelectedStores(draft);
  const devices = getSelectedDevices(draft);
  const formats = getRequiredFormats(draft);
  const approved = draft.products.filter(p => p.approved);
  const hours = getStoreHoursRange(draft);
  const issues = runScheduleValidation(draft).filter(check => check.status !== 'pass');

  const shelfLabels = getCampaignShelfLabels(draft);
  const storesCovered = unique([...devices.map(d => d.storeId), ...shelfLabels.map(l => l.storeId)]).length;
  const statusCounts = countBy([...devices.map(d => d.status), ...shelfLabels.map(l => l.status)]) as [DeviceStatus, number][];

  const signageFormats = formats.filter(f => f.media === 'signage');
  const eslFormats = formats.filter(f => f.media === 'esl');
  const outputs = getSlotOutputs(draft);
  const signageOutputs = outputs.filter(o => o.format.media === 'signage').length;
  const eslOutputs = outputs.length - signageOutputs;
  const productSlotCount = draft.slots.filter(slot => isProductSlot(slot.kind)).length;
  const slotPlan = `${draft.slots.length} slot(s) x ${draft.slotSeconds} sec = ${getLoopSeconds(draft)} sec loop`;

  const { brief } = draft;
  const productSource = [brief.productSource, brief.productSourceDetail].filter(Boolean).join(': ');

  return (
    <div>
      <p className={styles.sectionIntro}>
        Check the complete campaign before scheduling. Use Edit to go back to any step and change it.
      </p>

      {issues.length === 0 ? (
        <div className={`${styles.alert} ${styles.alertSuccess}`} role="status">
          <CheckIcon />
          <div>
            <span className={local.alertTitle}>No validation warnings.</span> Device availability, template
            compatibility, scheduling conflicts and ESL update limits all passed.
          </div>
        </div>
      ) : (
        issues.map(check => (
          <div
            key={check.id}
            className={`${styles.alert} ${check.status === 'fail' ? styles.alertError : styles.alertWarning}`}
            role={check.status === 'fail' ? 'alert' : 'status'}
          >
            <AlertIcon />
            <div>
              <span className={local.alertTitle}>
                {check.status === 'fail' ? 'Failed' : 'Warning'}: {check.label}.
              </span>{' '}
              {check.detail}
              {check.status === 'fail' && ' This must be resolved before the campaign can be scheduled.'}
            </div>
          </div>
        ))
      )}

      <Section title="Campaign details" step={1} onEdit={goToStep}>
        <div className={styles.infoGrid}>
          <Info label="Campaign name">{draft.name || '-'}</Info>
          <Info label="Objective">{draft.objective || '-'}</Info>
          <Info label="Owner">{draft.owner || '-'}</Info>
          <Info label="Client template pack">{getClientPack(draft.clientId).name}</Info>
          <Info label="Status">
            <span className={`${styles.badge} ${draft.status === 'Scheduled' ? styles.badgeGreen : styles.badgeAmber}`}>
              {draft.status}
            </span>
          </Info>
          <Info label="Description">{draft.description || '-'}</Info>
        </div>
      </Section>

      <Section title="Schedule" step={2} onEdit={goToStep}>
        <div className={styles.infoGrid}>
          <Info label="Start">{formatDateTime(draft.startDate, draft.startTime) || '-'}</Info>
          <Info label="Finish">{formatDateTime(draft.endDate, draft.endTime) || '-'}</Info>
          <Info label="Active days">{listOrDash(draft.activeDays)}</Info>
          <Info label="Store opening hours">
            {hours ? `Each store's own (${formatTime12(hours.open)} - ${formatTime12(hours.close)})` : "Each store's own"}
          </Info>
          <Info label="Content changes per day">{draft.changesPerDay}, spread across each store&apos;s hours</Info>
        </div>
      </Section>

      <Section title="Stores" step={3} onEdit={goToStep}>
        <div className={styles.counter}>
          <strong>{stores.length}</strong> of {STORES.length} stores selected
        </div>
        <div className={local.subLabel}>By region</div>
        <div className={local.badgeList}>
          {countBy(stores.map(s => s.region)).map(([region, count]) => (
            <span key={region} className={styles.badge}>
              {region}: {count}
            </span>
          ))}
        </div>
        <div className={local.subLabel}>By store format</div>
        <div className={local.badgeList}>
          {countBy(stores.map(s => s.format)).map(([format, count]) => (
            <span key={format} className={`${styles.badge} ${styles.badgeBlue}`}>
              {format}: {count}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Media" step={4} onEdit={goToStep}>
        <div className={styles.infoGrid}>
          <Info label="Campaign media">{mediaLabel(draft.media)}</Info>
          <Info label="Content formats required">
            {signageFormats.length} Digital Signage, {eslFormats.length} ESL
          </Info>
        </div>
        <p className={local.note}>
          Digital Signage content may be static or animated. ESL content is always static and limited to four
          changes per day.
        </p>
      </Section>

      <Section title="Devices" step={5} meta={`${devices.length} screens, ${shelfLabels.length} shelf labels`} onEdit={goToStep}>
        <div className={styles.statGrid}>
          <Stat label="Digital Signage screens" value={devices.length} />
          <Stat label="ESL shelf labels (automatic)" value={shelfLabels.length} />
          <Stat label="Stores covered" value={`${storesCovered} of ${stores.length}`} />
        </div>
        <div className={local.subLabel}>Device status</div>
        <div className={local.badgeList}>
          {statusCounts.length === 0 && <span className={styles.badge}>No screens or shelf labels</span>}
          {statusCounts.map(([status, count]) => (
            <span key={status} className={`${styles.badge} ${STATUS_BADGE[status]}`}>
              {status}: {count}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Campaign brief" step={6} onEdit={goToStep}>
        <div className={styles.infoGrid}>
          <Info label="Data source">{describeDataSources(brief)}</Info>
          <Info label="Data to analyse">{listOrDash(brief.dataToAnalyse)}</Info>
          <Info label="Products to consider">{productSource || '-'}</Info>
          <Info label="External factors">{listOrDash(brief.externalFactors)}</Info>
          <Info label="Content required">{listOrDash(brief.contentRequired)}</Info>
          <Info label="Slot plan">{slotPlan}</Info>
          <Info label="Additional rules">
            {brief.additionalRules.length > 0
              ? brief.additionalRules.map((rule, i) => <div key={i}>{rule}</div>)
              : '-'}
          </Info>
        </div>
        <details className={local.promptDetails}>
          <summary>Generated AI prompt</summary>
          <pre className={local.promptText}>{draft.prompt || 'No prompt has been generated.'}</pre>
        </details>
      </Section>

      <Section
        title="Products"
        step={7}
        meta={`${approved.length} approved of ${draft.products.length}`}
        onEdit={goToStep}
      >
        {approved.length === 0 ? (
          <div className={styles.emptyState}>No products have been approved.</div>
        ) : (
          <div className={`${styles.tableWrapper} ${styles.tableScroll}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th className={styles.numeric}>Regular price</th>
                  <th className={styles.numeric}>Promo price</th>
                  <th className={styles.numeric}>Saving</th>
                  <th className={styles.numeric}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {approved.map(product => {
                  const saving = product.regularPrice - product.promoPrice;
                  const savingPct = product.regularPrice > 0 ? Math.round((saving / product.regularPrice) * 100) : 0;
                  return (
                    <tr key={product.sku}>
                      <td>{product.sku}</td>
                      <td>
                        <div className={local.productName}>{product.description}</div>
                        <div className={local.productMeta}>
                          {[product.brand, product.size, product.category].filter(Boolean).join(' - ')}
                        </div>
                      </td>
                      <td className={styles.numeric}>{formatCurrency(product.regularPrice)}</td>
                      <td className={styles.numeric}>{formatCurrency(product.promoPrice)}</td>
                      <td className={`${styles.numeric} ${local.saving}`}>
                        {formatCurrency(saving)} ({savingPct}%)
                      </td>
                      <td className={styles.numeric}>{product.marginPct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Slots" step={8} meta={slotPlan} onEdit={goToStep}>
        {draft.slots.length === 0 ? (
          <div className={styles.emptyState}>The campaign has no slots.</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.numeric}>Slot</th>
                  <th>Kind</th>
                  <th>Product or headline</th>
                  <th>Design</th>
                  <th>Preview</th>
                </tr>
              </thead>
              <tbody>
                {draft.slots.map((slot, i) => {
                  const content = getTicketContent(slot, draft);
                  const title = content.product
                    ? `${content.product.description} ${content.product.size}`
                    : content.headline;
                  const design = isProductSlot(slot.kind)
                    ? slot.ticketType && getDesignLabel(draft.clientId, slot.ticketType)
                    : 'Draft design';
                  return (
                    <tr key={slot.id}>
                      <td className={styles.numeric}>{i + 1}</td>
                      <td>{slot.kind}</td>
                      <td>
                        {title ? (
                          <span className={local.productName}>{title}</span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeRed}`}>Not set</span>
                        )}
                      </td>
                      <td>
                        {design || <span className={`${styles.badge} ${styles.badgeRed}`}>Not selected</span>}
                      </td>
                      <td>
                        <SlotThumb slot={slot} draft={draft} formats={formats} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Content" step={9} onEdit={goToStep}>
        {!draft.contentGenerated && (
          <div className={`${styles.alert} ${styles.alertWarning}`}>
            <AlertIcon />
            <div>Content has not been generated yet. The numbers below are the outputs that will be required.</div>
          </div>
        )}
        <div className={`${styles.statGrid} ${local.statGridFlush}`}>
          <Stat label="Digital Signage outputs" value={signageOutputs} />
          <Stat label="ESL outputs" value={eslOutputs} />
          <Stat label={draft.contentGenerated ? 'Total generated outputs' : 'Total outputs required'} value={signageOutputs + eslOutputs} />
        </div>
        <p className={local.note}>
          Each Digital Signage format ({signageFormats.length}) gets all {draft.slots.length} slot(s), played as a
          loop. Each ESL format ({eslFormats.length}) gets only the {productSlotCount} product slot(s), because a label
          shows one product.
        </p>
      </Section>
    </div>
  );
};

export default Step10Review;
