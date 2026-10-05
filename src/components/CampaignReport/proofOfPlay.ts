import { useSyncExternalStore } from 'react';
import { DAYS } from '../CampaignWizard/options';
import {
  getCampaignShelfLabels,
  getLoopSeconds,
  getProductShelfLabels,
  getSelectedDevices,
  getSelectedStores,
  isProductSlot,
  timeToMinutes,
  DAM_ASSET_BY_ID,
  isRetailMediaSlot,
} from '../CampaignWizard/helpers';
import { getDesignLabel } from '../CampaignWizard/clients';
import { defaultHeadline } from '../CampaignWizard/steps/ticketContent';
import type { CampaignDraft, Device, Store } from '../CampaignWizard/types';

// Proof of play: what played where and when. The prototype has no player logs, so the numbers are
// simulated deterministically from the campaign draft (same draft + same day = same report).

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StoreRow {
  store: Store;
  screens: number;
  plays: number;
  screenHours: number; // screens x hours the store was open on counted days
  eslUpdates: number;
}

export interface SlotRow {
  slotNumber: number;
  kind: string;
  content: string; // product or headline
  design: string;
  plays: number;
  share: number; // 0-1 of all Digital Signage plays
  eslUpdates: number;
}

export interface ScreenRow {
  device: Device;
  store: Store | undefined;
  plays: number;
  hours: number;
}

export interface ProofOfPlay {
  mode: 'projected' | 'played';
  label: string; // 'Projected' | 'Played so far'
  daysCounted: number;
  activeDaysTotal: number; // active days over the whole campaign
  periodStart: string; // YYYY-MM-DD, '' when no days are counted
  periodEnd: string;
  totalPlays: number;
  eslUpdates: number;
  screens: number;
  stores: number;
  shelfLabels: number;
  byStore: StoreRow[];
  bySlot: SlotRow[];
  byScreen: ScreenRow[];
}

function toUtcMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Active weekdays (draft.activeDays) from `from` to `to`, both 'YYYY-MM-DD' and inclusive. */
function activeDates(draft: CampaignDraft, from: string, to: string): string[] {
  if (!from || !to || to < from) return [];
  const dates: string[] = [];
  for (let ms = toUtcMs(from); ms <= toUtcMs(to); ms += DAY_MS) {
    // DAYS starts on Monday, getUTCDay() on Sunday.
    const weekday = DAYS[(new Date(ms).getUTCDay() + 6) % 7];
    if (draft.activeDays.includes(weekday)) dates.push(toIso(ms));
  }
  return dates;
}

/**
 * Seconds a store is on air on one date: its opening hours, cut to the campaign start time on the
 * first day and to the finish time on the last day.
 */
function openSeconds(store: Store, draft: CampaignDraft, date: string): number {
  let open = timeToMinutes(store.openingTime);
  let close = timeToMinutes(store.closingTime);
  if (close <= open) close += 24 * 60; // closes after midnight
  if (date === draft.startDate && draft.startTime) open = Math.max(open, timeToMinutes(draft.startTime));
  if (date === draft.endDate && draft.endTime) close = Math.min(close, timeToMinutes(draft.endTime));
  return Math.max(0, close - open) * 60;
}

/** Plays of each slot on one screen in `seconds` on air: full loops, then the slots of the last part loop. */
function slotPlays(seconds: number, slotCount: number, slotSeconds: number, loopSeconds: number): number[] {
  if (slotCount === 0 || slotSeconds <= 0 || loopSeconds <= 0) return [];
  const loops = Math.floor(seconds / loopSeconds);
  const extraSlots = Math.floor((seconds % loopSeconds) / slotSeconds);
  return Array.from({ length: slotCount }, (_, i) => loops + (i < extraSlots ? 1 : 0));
}

/** 'YYYY-MM-DD' for the viewer's local today. */
function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function subscribeNothing() {
  return () => {};
}

/** Today's date ('YYYY-MM-DD') on the client; '' on the server and during hydration. */
export function useToday(): string {
  return useSyncExternalStore(subscribeNothing, localToday, () => '');
}

export function buildProofOfPlay(draft: CampaignDraft, today: string): ProofOfPlay {
  const projected = !draft.startDate || draft.startDate > today;
  const lastDay = projected || draft.endDate < today ? draft.endDate : today;
  const dates = activeDates(draft, draft.startDate, lastDay);
  const activeDaysTotal = activeDates(draft, draft.startDate, draft.endDate).length;

  const stores = getSelectedStores(draft);
  const devices = getSelectedDevices(draft).filter(d => d.media === 'signage');
  const labels = getCampaignShelfLabels(draft);
  // Proof of play only counts what can actually play: offline or maintenance screens and labels add nothing.
  const online = (status: string) => status === 'Online';
  const playingDevices = devices.filter(d => online(d.status));
  const updatingLabels = labels.filter(l => online(l.status));
  const loopSeconds = getLoopSeconds(draft);
  const slotCount = draft.slots.length;
  const storeById = new Map(stores.map(s => [s.id, s]));

  // Seconds on air per store over the counted days.
  const storeSeconds = new Map<string, number>();
  // Plays per slot, per store (every screen of a store has the same hours).
  const storeSlotPlays = new Map<string, number[]>();
  for (const store of stores) {
    let seconds = 0;
    const perSlot = new Array<number>(slotCount).fill(0);
    for (const date of dates) {
      const daySeconds = openSeconds(store, draft, date);
      seconds += daySeconds;
      slotPlays(daySeconds, slotCount, draft.slotSeconds, loopSeconds).forEach((plays, i) => {
        perSlot[i] += plays;
      });
    }
    storeSeconds.set(store.id, seconds);
    storeSlotPlays.set(store.id, perSlot);
  }

  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

  const byScreen: ScreenRow[] = devices.map(device => ({
    device,
    store: storeById.get(device.storeId),
    plays: online(device.status) ? sum(storeSlotPlays.get(device.storeId) ?? []) : 0,
    hours: online(device.status) ? (storeSeconds.get(device.storeId) ?? 0) / 3600 : 0,
  }));

  const updatesPerLabel = draft.changesPerDay * dates.length;

  const byStore: StoreRow[] = stores.map(store => {
    const screens = devices.filter(d => d.storeId === store.id).length;
    const playing = playingDevices.filter(d => d.storeId === store.id).length;
    return {
      store,
      screens,
      plays: playing * sum(storeSlotPlays.get(store.id) ?? []),
      screenHours: (playing * (storeSeconds.get(store.id) ?? 0)) / 3600,
      eslUpdates: updatingLabels.filter(l => l.storeId === store.id).length * updatesPerLabel,
    };
  });

  const totalPlays = sum(byStore.map(row => row.plays));

  const productName = new Map(draft.products.map(p => [p.sku, `${p.description} ${p.size}`.trim()]));
  const bySlot: SlotRow[] = draft.slots.map((slot, i) => {
    const plays = sum(playingDevices.map(d => storeSlotPlays.get(d.storeId)?.[i] ?? 0));
    const product = isProductSlot(slot.kind);
    return {
      slotNumber: i + 1,
      kind: slot.kind,
      content: product
        ? (slot.productSku ? productName.get(slot.productSku) ?? slot.productSku : '-')
        : isRetailMediaSlot(slot.kind)
          ? DAM_ASSET_BY_ID.get(slot.damAssetId)?.name ?? '-'
          : slot.headline || defaultHeadline(slot.kind) || '-',
      design: isRetailMediaSlot(slot.kind)
        ? 'Supplied artwork'
        : product && slot.ticketType
          ? getDesignLabel(draft.clientId, slot.ticketType)
          : '-',
      plays,
      share: totalPlays > 0 ? plays / totalPlays : 0,
      eslUpdates: product && slot.productSku ? getProductShelfLabels(draft, slot.productSku).filter(l => online(l.status)).length * updatesPerLabel : 0,
    };
  });

  return {
    mode: projected ? 'projected' : 'played',
    label: projected ? 'Projected' : 'Played so far',
    daysCounted: dates.length,
    activeDaysTotal,
    periodStart: dates[0] ?? '',
    periodEnd: dates[dates.length - 1] ?? '',
    totalPlays,
    eslUpdates: updatingLabels.length * updatesPerLabel,
    screens: devices.length,
    stores: stores.length,
    shelfLabels: labels.length,
    byStore,
    bySlot,
    byScreen,
  };
}
