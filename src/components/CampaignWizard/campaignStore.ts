import { useSyncExternalStore } from 'react';
import { formatDateTime, getCampaignShelfLabels, getSelectedDevices, getSelectedStores, unique } from './helpers';
import type { CampaignDraft, CampaignStatus } from './types';

// Campaigns created in the wizard, kept in sessionStorage so the campaign list can show them.

export interface SavedCampaign {
  id: string;
  status: CampaignStatus;
  contentName: string;
  screenGroup: string;
  tags: string;
  region: string;
  category: string;
  startDate: string;
  endDate: string;
}

const STORAGE_KEY = 'ticketit.wizardCampaigns';
const EMPTY: SavedCampaign[] = [];
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedList: SavedCampaign[] = EMPTY;

function read(): SavedCampaign[] {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedList = raw ? (JSON.parse(raw) as SavedCampaign[]) : EMPTY;
    } catch {
      cachedList = EMPTY;
    }
  }
  return cachedList;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function toSavedCampaign(draft: CampaignDraft): SavedCampaign {
  const stores = getSelectedStores(draft);
  const devices = getSelectedDevices(draft);
  return {
    id: draft.id,
    status: draft.status,
    contentName: draft.name,
    screenGroup: unique([
      ...devices.map(d => d.resolution.replace('x', '*')),
      ...getCampaignShelfLabels(draft).map(l => `ESL ${l.size}`),
    ]).join(','),
    tags: unique(stores.flatMap(s => s.tags)).join(','),
    region: unique(stores.map(s => s.region)).join(','),
    category: unique(stores.map(s => s.format)).join(','),
    startDate: formatDateTime(draft.startDate, draft.startTime),
    endDate: formatDateTime(draft.endDate, draft.endTime),
  };
}

/** Insert or update the campaign (matched on id), newest first. */
export function saveCampaign(draft: CampaignDraft) {
  const saved = toSavedCampaign(draft);
  const list = [saved, ...read().filter(c => c.id !== saved.id)];
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    return;
  }
  listeners.forEach(listener => listener());
}

export function useSavedCampaigns(): SavedCampaign[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
