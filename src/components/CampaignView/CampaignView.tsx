'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../CampaignWizard/wizard.module.css';
import local from './CampaignView.module.css';
import TicketPreview from '../CampaignWizard/steps/TicketPreview';
import { getTicketContent } from '../CampaignWizard/steps/ticketContent';
import { getClientPack, getDesignLabel } from '../CampaignWizard/clients';
import {
  STORE_BY_ID,
  formatDateTime,
  formatTime12,
  getCampaignShelfLabels,
  getLabelFormats,
  getLoopSeconds,
  getPixelSize,
  getSelectedDevices,
  getSelectedStores,
  isProductSlot,
  isRetailMediaSlot,
} from '../CampaignWizard/helpers';
import { ArrowLeftIcon, ArrowRightIcon, EditIcon, EyeIcon } from '../CampaignWizard/icons';
import type { CampaignDraft, CampaignSlot, ContentFormat, DeviceStatus } from '../CampaignWizard/types';

// Read-only view of a campaign: one row per screen or shelf label in each store,
// and a preview of what that device plays.

const TICK_MS = 100;

const STATUS_BADGE: Record<DeviceStatus, string> = {
  Online: styles.badgeGreen,
  Offline: styles.badgeRed,
  Maintenance: styles.badgeAmber,
};

interface Row {
  id: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  hours: string;
  device: string; // screen name, or "Shelf label"
  kind: 'Screen' | 'ESL label';
  location: string;
  format: ContentFormat;
  status: DeviceStatus;
  slots: CampaignSlot[]; // what plays: the whole loop on a screen, one product on a label
}

function signageFormat(orientation: 'Landscape' | 'Portrait', resolution: string): ContentFormat {
  return {
    key: `signage|${orientation}|${resolution}`,
    media: 'signage',
    label: `${orientation} ${resolution}`,
    orientation,
    resolution,
    eslSize: '',
    eslColour: '',
    deviceCount: 1,
  };
}

function slotName(slot: CampaignSlot, draft: CampaignDraft): string {
  const content = getTicketContent(slot, draft);
  if (content.product) return `${content.product.description} ${content.product.size}`.trim();
  if (content.asset) return content.asset.name;
  return content.headline || slot.kind;
}

function designOf(slot: CampaignSlot, draft: CampaignDraft): string {
  if (isRetailMediaSlot(slot.kind)) return 'Supplied artwork';
  if (!isProductSlot(slot.kind)) return 'Draft design';
  return slot.ticketType ? getDesignLabel(draft.clientId, slot.ticketType) : '-';
}

function fileType(slot: CampaignSlot, format: ContentFormat): string {
  if (format.media === 'esl') return 'IMAGE/PNG';
  if (slot.mediaType === 'Video') return 'VIDEO/MP4';
  if (slot.mediaType === 'Animated') return 'ANIMATED/HTML';
  return 'IMAGE/PNG';
}

const Ticket: React.FC<{ slot: CampaignSlot; draft: CampaignDraft; format: ContentFormat; maxWidth: number; maxHeight: number }> = ({
  slot,
  draft,
  format,
  maxWidth,
  maxHeight,
}) => {
  const { width, height } = getPixelSize(format);
  const displayWidth = Math.max(1, Math.round(Math.min(maxWidth, (maxHeight * width) / height)));
  return (
    <TicketPreview
      clientId={draft.clientId}
      content={getTicketContent(slot, draft)}
      width={width}
      height={height}
      displayWidth={displayWidth}
      eslColour={format.media === 'esl' ? format.eslColour : undefined}
    />
  );
};

/** Plays what one device shows: the slot loop on a screen, or the single ticket on a shelf label. */
const DevicePreview: React.FC<{ row: Row; draft: CampaignDraft }> = ({ row, draft }) => {
  const [playing, setPlaying] = useState(true);
  const [pos, setPos] = useState({ index: 0, elapsed: 0 });
  const count = row.slots.length;
  const durationMs = Math.max(1, draft.slotSeconds) * 1000;
  const isScreen = row.kind === 'Screen';

  useEffect(() => {
    if (!isScreen || !playing || count < 2) return undefined;
    const id = setInterval(() => {
      setPos(prev =>
        prev.elapsed + TICK_MS >= durationMs
          ? { index: (prev.index + 1) % count, elapsed: 0 }
          : { index: prev.index, elapsed: prev.elapsed + TICK_MS },
      );
    }, TICK_MS);
    return () => clearInterval(id);
  }, [isScreen, playing, count, durationMs]);

  if (count === 0) return <div className={styles.emptyState}>Nothing plays on this device.</div>;
  const index = pos.index % count;
  const slot = row.slots[index];
  const goTo = (i: number) => setPos({ index: (i + count) % count, elapsed: 0 });

  return (
    <div>
      <div className={local.previewTitle}>
        {row.device}
        <span className={local.sub}>
          {' '}
          | {row.storeName} ({row.storeCode}) | {row.format.label}
        </span>
      </div>

      <div className={local.stage}>
        <div key={`${row.id}-${slot.id}`}>
          <Ticket slot={slot} draft={draft} format={row.format} maxWidth={400} maxHeight={isScreen ? 300 : 220} />
        </div>
      </div>

      <div className={local.nowPlaying}>
        {isScreen && (
          <span className={`${styles.badge} ${styles.badgeDark}`}>
            Slot {index + 1} of {count}
          </span>
        )}
        <span className={local.name}>{slotName(slot, draft)}</span>
        <span className={local.sub}>
          {slot.kind} | {designOf(slot, draft)} | {fileType(slot, row.format)}
        </span>
      </div>

      {isScreen ? (
        <>
          <div className={local.segments} aria-hidden="true">
            {row.slots.map((s, i) => (
              <div key={s.id} className={local.segment}>
                <div
                  className={local.segmentFill}
                  style={{ width: `${i < index ? 100 : i === index ? (pos.elapsed / durationMs) * 100 : 0}%` }}
                ></div>
              </div>
            ))}
          </div>
          <div className={local.controls}>
            <button type="button" className={styles.btnOutline} onClick={() => goTo(index - 1)} aria-label="Previous slot">
              <ArrowLeftIcon size={14} />
            </button>
            <button type="button" className={`${styles.btnSmall} ${styles.btnSmallPink}`} onClick={() => setPlaying(p => !p)}>
              {playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" className={styles.btnOutline} onClick={() => goTo(index + 1)} aria-label="Next slot">
              <ArrowRightIcon size={14} />
            </button>
            <span className={local.sub}>
              {draft.slotSeconds} sec each, {getLoopSeconds(draft)} sec loop, {row.hours}
            </span>
          </div>
          <ol className={local.playlist}>
            {row.slots.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`${local.playlistItem} ${i === index ? local.playlistItemActive : ''}`}
                  onClick={() => goTo(i)}
                >
                  <span className={local.playlistTime}>
                    {i * draft.slotSeconds}-{(i + 1) * draft.slotSeconds}s
                  </span>
                  <span>{slotName(s, draft)}</span>
                  <span className={local.sub}>{s.mediaType || 'Static'}</span>
                </button>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className={local.sub}>
          This shelf label sits under the product and shows this ticket for the whole campaign. It updates{' '}
          {draft.changesPerDay} time(s) a day while the store is open ({row.hours}); it does not rotate like a screen.
        </p>
      )}
    </div>
  );
};

const CampaignView: React.FC<{ draft: CampaignDraft }> = ({ draft }) => {
  const router = useRouter();
  const stores = getSelectedStores(draft);
  const pack = getClientPack(draft.clientId);

  const rows = useMemo<Row[]>(() => {
    const storeInfo = (storeId: string) => {
      const store = STORE_BY_ID.get(storeId);
      return {
        storeName: store?.name ?? storeId,
        storeCode: store?.code ?? '',
        hours: store ? `${formatTime12(store.openingTime)} - ${formatTime12(store.closingTime)}` : '',
      };
    };
    const screens: Row[] = getSelectedDevices(draft).map(device => ({
      id: device.id,
      storeId: device.storeId,
      ...storeInfo(device.storeId),
      device: device.name,
      kind: 'Screen',
      location: device.location,
      format: signageFormat(device.orientation, device.resolution),
      status: device.status,
      slots: draft.slots,
    }));
    const labels: Row[] = getCampaignShelfLabels(draft).map(label => {
      const slot = draft.slots.find(s => s.productSku === label.sku);
      return {
        id: `${label.storeId}-ESL-${label.sku}`,
        storeId: label.storeId,
        ...storeInfo(label.storeId),
        device: `Shelf label: ${slot ? slotName(slot, draft) : label.sku}`,
        kind: 'ESL label',
        location: label.location,
        format: getLabelFormats([label])[0],
        status: label.status,
        slots: slot ? [slot] : [],
      };
    });
    return [...screens, ...labels].sort(
      (a, b) => a.storeName.localeCompare(b.storeName) || b.kind.localeCompare(a.kind) || a.device.localeCompare(b.device),
    );
  }, [draft]);

  const [storeFilter, setStoreFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visible = storeFilter ? rows.filter(r => r.storeId === storeFilter) : rows;
  const selected = rows.find(r => r.id === selectedId) ?? visible[0] ?? null;

  const screenCount = rows.filter(r => r.kind === 'Screen').length;
  const labelCount = rows.length - screenCount;

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <span onClick={() => router.push('/')}>Content Management</span> / View Campaign
      </div>

      <div className={styles.pageHeader}>
        <button className={styles.goBackBtn} onClick={() => router.push('/')}>
          <ArrowLeftIcon /> Go Back
        </button>
        <div className={styles.pageTitle}>{draft.name || 'Campaign'}</div>
        <span className={`${styles.badge} ${draft.status === 'Scheduled' ? styles.badgeGreen : styles.badgeAmber} ${styles.pageStatus}`}>
          {draft.status}
        </span>
        <div className={local.headerActions}>
          <button
            type="button"
            className={styles.btnOutline}
            onClick={() => router.push(`/intelligent-campaign/report?id=${encodeURIComponent(draft.id)}`)}
          >
            Proof of play
          </button>
          <button
            type="button"
            className={`${styles.btnSmall} ${styles.btnSmallDark}`}
            onClick={() => router.push(`/intelligent-campaign?edit=${encodeURIComponent(draft.id)}`)}
          >
            <EditIcon size={14} /> Edit campaign
          </button>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelBody}>
          <div className={styles.infoGrid}>
            <div>
              <div className={styles.infoLabel}>Runs</div>
              <div className={styles.infoValue}>
                {formatDateTime(draft.startDate, draft.startTime) || '-'} to {formatDateTime(draft.endDate, draft.endTime) || '-'}
              </div>
            </div>
            <div>
              <div className={styles.infoLabel}>Active days</div>
              <div className={styles.infoValue}>{draft.activeDays.length === 7 ? 'Every day' : draft.activeDays.join(', ')}</div>
            </div>
            <div>
              <div className={styles.infoLabel}>Stores / screens / shelf labels</div>
              <div className={styles.infoValue}>
                {stores.length} / {screenCount} / {labelCount}
              </div>
            </div>
            {screenCount > 0 && (
              <div>
                <div className={styles.infoLabel}>Screen loop</div>
                <div className={styles.infoValue}>
                  {draft.slots.length} slots x {draft.slotSeconds} sec = {getLoopSeconds(draft)} sec
                </div>
              </div>
            )}
            <div>
              <div className={styles.infoLabel}>Templates</div>
              <div className={styles.infoValue}>{pack.name}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={local.layout}>
        <div className={local.tableCol}>
          <div className={styles.toolbar}>
            <div className={styles.counter}>
              <strong>{visible.length}</strong> {visible.length === 1 ? 'device' : 'devices'}
            </div>
            {stores.length > 1 && (
              <select
                className={`${styles.select} ${local.storeSelect}`}
                value={storeFilter}
                onChange={e => setStoreFilter(e.target.value)}
                aria-label="Filter by store"
              >
                <option value="">All stores</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name} ({store.code})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className={`${styles.tableWrapper} ${styles.tableScroll}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Screen / label</th>
                  <th>Location</th>
                  <th>Size</th>
                  <th>Plays</th>
                  <th>Status</th>
                  <th>Preview</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className={styles.emptyState}>No screens or shelf labels in this campaign.</div>
                    </td>
                  </tr>
                )}
                {visible.map(row => {
                  const active = selected?.id === row.id;
                  return (
                    <tr key={row.id} className={active ? styles.rowSelected : undefined}>
                      <td>
                        <div className={local.name}>{row.storeName}</div>
                        <div className={local.sub}>
                          {row.storeCode} | {row.hours}
                        </div>
                      </td>
                      <td>
                        <div className={local.name}>{row.device}</div>
                        <div className={local.sub}>{row.kind}</div>
                      </td>
                      <td>{row.location}</td>
                      <td>{row.format.label}</td>
                      <td className={local.sub}>
                        {row.kind === 'Screen'
                          ? `${row.slots.length} slots, ${getLoopSeconds(draft)} sec loop`
                          : `1 product, ${draft.changesPerDay} update(s) a day`}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${STATUS_BADGE[row.status]}`}>{row.status}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`${styles.btnSmall} ${active ? styles.btnSmallPink : ''}`}
                          onClick={() => setSelectedId(row.id)}
                          aria-pressed={active}
                        >
                          <EyeIcon size={14} /> {active ? 'Showing' : 'Preview'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className={local.previewCol}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>Preview</div>
            <div className={styles.panelBody}>
              {selected ? (
                <DevicePreview key={selected.id} row={selected} draft={draft} />
              ) : (
                <div className={styles.emptyState}>Choose a screen or label to preview.</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CampaignView;
