import { DEVICES, ESL_COLOUR_LABELS, PRODUCT_CATALOG, STORES, TEMPLATES } from './mockData';
import { DATA_SOURCES } from './options';
import type {
  CampaignBrief,
  CampaignDraft,
  ContentFormat,
  Device,
  DeviceMedia,
  MediaChoice,
  Store,
  Template,
} from './types';

export const STORE_BY_ID = new Map<string, Store>(STORES.map(s => [s.id, s]));
export const DEVICE_BY_ID = new Map<string, Device>(DEVICES.map(d => [d.id, d]));
export const TEMPLATE_BY_ID = new Map<string, Template>(TEMPLATES.map(t => [t.id, t]));
const CATALOG_PCT_BY_SKU = new Map<string, number>(PRODUCT_CATALOG.map(p => [p.sku, p.eligibleStorePct]));

export function createEmptyDraft(): CampaignDraft {
  return {
    id: '',
    status: 'Draft',
    name: '',
    objective: '',
    owner: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    openingTime: '08:00',
    closingTime: '21:00',
    changesPerDay: 1,
    storeIds: [],
    media: '',
    deviceIds: [],
    brief: {
      dataSources: [],
      dataFile: null,
      dataToAnalyse: [],
      productSource: '',
      productSourceDetail: '',
      productFile: null,
      externalFactors: [],
      contentRequired: [],
      additionalRules: [],
    },
    prompt: '',
    products: [],
    templateSelections: {},
    contentGenerated: false,
  };
}

/** The "data to analyse" types the selected data sources can actually supply. */
export function getAvailableDataTypes(brief: Pick<CampaignBrief, 'dataSources' | 'dataFile'>): string[] {
  const types = new Set<string>();
  for (const source of DATA_SOURCES) {
    if (!brief.dataSources.includes(source.value)) continue;
    const provides = source.value === 'upload' ? (brief.dataFile?.provides ?? []) : source.provides;
    provides.forEach(type => types.add(type));
  }
  return Array.from(types);
}

export function mediaIncludes(media: MediaChoice, type: DeviceMedia): boolean {
  return media === 'both' || media === type;
}

export function mediaLabel(media: MediaChoice): string {
  if (media === 'signage') return 'Digital Signage';
  if (media === 'esl') return 'ESL';
  if (media === 'both') return 'Digital Signage and ESL';
  return '-';
}

export function getSelectedStores(draft: CampaignDraft): Store[] {
  return draft.storeIds.map(id => STORE_BY_ID.get(id)).filter((s): s is Store => !!s);
}

/** Devices the user may pick from: those in the selected stores that match the selected media. */
export function getAvailableDevices(draft: CampaignDraft): Device[] {
  if (!draft.media) return [];
  const storeIds = new Set(draft.storeIds);
  return DEVICES.filter(d => storeIds.has(d.storeId) && mediaIncludes(draft.media, d.media));
}

export function getSelectedDevices(draft: CampaignDraft): Device[] {
  return draft.deviceIds.map(id => DEVICE_BY_ID.get(id)).filter((d): d is Device => !!d);
}

export function getFormatKey(device: Device): string {
  return device.media === 'signage'
    ? `signage|${device.orientation}|${device.resolution}`
    : `esl|${device.eslSize}|${device.eslColour}`;
}

/** Distinct media + format/size combinations across the selected devices. Each needs its own content. */
export function getRequiredFormats(draft: CampaignDraft): ContentFormat[] {
  const formats = new Map<string, ContentFormat>();
  for (const device of getSelectedDevices(draft)) {
    const key = getFormatKey(device);
    const existing = formats.get(key);
    if (existing) {
      existing.deviceCount += 1;
      continue;
    }
    formats.set(key, {
      key,
      media: device.media,
      label:
        device.media === 'signage'
          ? `${device.orientation} ${device.resolution}`
          : `${device.eslSize} ${ESL_COLOUR_LABELS[device.eslColour] ?? device.eslColour}`,
      orientation: device.orientation,
      resolution: device.resolution,
      eslSize: device.eslSize,
      eslColour: device.eslColour,
      deviceCount: 1,
    });
  }
  return Array.from(formats.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function isTemplateCompatible(template: Template, format: ContentFormat): boolean {
  if (template.media !== format.media) return false;
  if (format.media === 'signage') {
    if (template.orientation !== 'Any' && template.orientation !== format.orientation) return false;
    return template.resolutions.length === 0 || template.resolutions.includes(format.resolution);
  }
  if (template.kind !== 'Static') return false; // ESL content must always be static
  if (template.eslSizes.length > 0 && !template.eslSizes.includes(format.eslSize)) return false;
  return template.eslColours.length === 0 || template.eslColours.includes(format.eslColour);
}

export function getCompatibleTemplates(format: ContentFormat): Template[] {
  return TEMPLATES.filter(t => isTemplateCompatible(t, format));
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Content-change times, spread evenly across the campaign's store opening hours. */
export function getChangeTimes(draft: CampaignDraft): string[] {
  if (!draft.openingTime || !draft.closingTime || draft.changesPerDay < 1) return [];
  const open = timeToMinutes(draft.openingTime);
  const close = timeToMinutes(draft.closingTime);
  if (close <= open) return [];
  const interval = (close - open) / draft.changesPerDay;
  return Array.from({ length: draft.changesPerDay }, (_, i) => minutesToTime(open + interval * i));
}

export function formatTime12(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 'YYYY-MM-DD' -> 'Mon 04/05/2026', matching the dates in the campaign list. */
export function formatDate(date: string): string {
  if (!date) return '';
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${weekday} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export function formatDateTime(date: string, time: string): string {
  return [formatDate(date), formatTime12(time)].filter(Boolean).join(' ');
}

export function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter(v => v !== value) : [...values, value];
}

/**
 * Merge a change into the draft and keep dependent selections consistent:
 * devices follow stores and media, template choices follow devices, and
 * generated content is discarded when anything it was built from changes.
 */
export function applyDraftPatch(prev: CampaignDraft, patch: Partial<CampaignDraft>): CampaignDraft {
  const next: CampaignDraft = { ...prev, ...patch };

  if ('storeIds' in patch && !('products' in patch)) {
    next.products = next.products.map(product => {
      const pct = CATALOG_PCT_BY_SKU.get(product.sku);
      return pct === undefined ? product : { ...product, eligibleStores: Math.round(pct * next.storeIds.length) };
    });
  }

  if ('storeIds' in patch || 'media' in patch) {
    const allowed = new Set(getAvailableDevices(next).map(d => d.id));
    next.deviceIds = next.deviceIds.filter(id => allowed.has(id));
  }

  if ('storeIds' in patch || 'media' in patch || 'deviceIds' in patch) {
    const keys = new Set(getRequiredFormats(next).map(f => f.key));
    next.templateSelections = Object.fromEntries(
      Object.entries(next.templateSelections).filter(([key]) => keys.has(key)),
    );
  }

  const invalidatesContent =
    'storeIds' in patch ||
    'media' in patch ||
    'deviceIds' in patch ||
    'products' in patch ||
    'templateSelections' in patch;
  if (invalidatesContent && !('contentGenerated' in patch)) {
    next.contentGenerated = false;
  }

  return next;
}
