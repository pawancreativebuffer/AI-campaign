import { DEVICES, ESL_COLOUR_LABELS, PRODUCT_CATALOG, STORES } from './mockData';
import { LOGGED_IN_CLIENT_ID, getClientPack } from './clients';
import { DATA_SOURCES, DEFAULT_SLOT_SECONDS, PRODUCT_SLOT_KINDS, SLOT_KINDS } from './options';
import type {
  ShelfLabel,
  CampaignBrief,
  CampaignDraft,
  CampaignSlot,
  TicketType,
  ContentFormat,
  Device,
  DeviceMedia,
  MediaChoice,
  Store,
} from './types';

export const STORE_BY_ID = new Map<string, Store>(STORES.map(s => [s.id, s]));
export const DEVICE_BY_ID = new Map<string, Device>(DEVICES.map(d => [d.id, d]));
const CATALOG_PCT_BY_SKU = new Map<string, number>(PRODUCT_CATALOG.map(p => [p.sku, p.eligibleStorePct]));

export function isProductSlot(kind: string): boolean {
  return PRODUCT_SLOT_KINDS.includes(kind);
}

export function createSlot(id: string, kind = 'Product promotion'): CampaignSlot {
  return { id, kind, productSku: '', ticketType: '', headline: '', body: '' };
}

/** A slot id not used by any of the given slots. */
export function nextSlotId(slots: CampaignSlot[]): string {
  const used = slots.map(slot => Number(slot.id.replace('slot-', ''))).filter(Number.isFinite);
  return `slot-${(used.length > 0 ? Math.max(...used) : 0) + 1}`;
}

/** The slot plan with `count` extra 'Product promotion' slots added after the last product slot. */
export function addProductSlots(slots: CampaignSlot[], count: number): CampaignSlot[] {
  const next = [...slots];
  const lastProduct = next.map(slot => isProductSlot(slot.kind)).lastIndexOf(true);
  const added: CampaignSlot[] = [];
  for (let i = 0; i < count; i++) added.push(createSlot(nextSlotId([...next, ...added])));
  next.splice(lastProduct + 1, 0, ...added);
  return next;
}

/** The structure from the client's example: promotions, a loyalty advert, a greeting and opening hours. */
export function createDefaultSlots(): CampaignSlot[] {
  const kinds = [
    'Product promotion',
    'Product promotion',
    'Product promotion',
    'Product promotion',
    'Product promotion',
    'Loyalty advert',
    'Seasonal greeting',
    'Opening hours',
  ];
  return kinds.map((kind, i) => createSlot(`slot-${i + 1}`, kind));
}

export function slotKindsInUse(slots: CampaignSlot[]): string[] {
  return SLOT_KINDS.filter(kind => slots.some(slot => slot.kind === kind));
}

/** The design a product slot starts with, from the client's pack, the slot and the campaign objective. */
export function defaultTicketType(kind: string, objective: string, clientId: string): TicketType {
  const pack = getClientPack(clientId);
  if (kind === 'Loyalty advert') return pack.loyaltyDesign;
  return pack.objectiveDesigns[objective] ?? pack.designs[0]?.id ?? '';
}

/**
 * Fills empty product slots with approved products not yet used, in order,
 * and gives every product slot a ticket design. Slots already filled are kept.
 */
export function autoAssignSlots(draft: CampaignDraft): CampaignSlot[] {
  const approved = draft.products.filter(p => p.approved).map(p => p.sku);
  const used = new Set(draft.slots.map(slot => slot.productSku).filter(Boolean));
  const free = approved.filter(sku => !used.has(sku));
  return draft.slots.map(slot => {
    if (!isProductSlot(slot.kind)) return slot;
    const productSku = slot.productSku || free.shift() || '';
    const ticketType = slot.ticketType || defaultTicketType(slot.kind, draft.objective, draft.clientId);
    return productSku === slot.productSku && ticketType === slot.ticketType ? slot : { ...slot, productSku, ticketType };
  });
}

/** Seconds for one full pass through every slot on Digital Signage. */
export function getLoopSeconds(draft: Pick<CampaignDraft, 'slots' | 'slotSeconds'>): number {
  return draft.slots.length * draft.slotSeconds;
}

/** Pixel size of a format, e.g. Landscape 1920x1080 or ESL 300x400. */
export function getPixelSize(format: ContentFormat): { width: number; height: number } {
  const [width, height] = (format.media === 'signage' ? format.resolution : format.eslSize).split('x').map(Number);
  return { width: width || 1, height: height || 1 };
}

export function createEmptyDraft(): CampaignDraft {
  return {
    id: '',
    status: 'Draft',
    clientId: LOGGED_IN_CLIENT_ID,
    name: '',
    objective: '',
    owner: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
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
      contentRequired: slotKindsInUse(createDefaultSlots()),
      additionalRules: [],
    },
    prompt: '',
    slotSeconds: DEFAULT_SLOT_SECONDS,
    slots: createDefaultSlots(),
    products: [],
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

/**
 * Screens the user may pick from: Digital Signage in the selected stores. ESL labels are not
 * picked; they follow the campaign's products (see getCampaignShelfLabels).
 */
export function getAvailableDevices(draft: CampaignDraft): Device[] {
  if (!mediaIncludes(draft.media, 'signage')) return [];
  const storeIds = new Set(draft.storeIds);
  return DEVICES.filter(d => storeIds.has(d.storeId) && d.media === 'signage');
}

const ESL_GROUPS_BY_STORE = new Map<string, Device[]>();
for (const device of DEVICES) {
  if (device.media !== 'esl') continue;
  ESL_GROUPS_BY_STORE.set(device.storeId, [...(ESL_GROUPS_BY_STORE.get(device.storeId) ?? []), device]);
}

/**
 * The shelf label a store has for a product, or null when the store does not sell it.
 * Mock: the label belongs to one of the store's ESL shelf areas, which sets its size and colour.
 * In the real product this comes from the ESL system, where each label is linked to a SKU.
 */
export function getShelfLabel(storeId: string, sku: string): ShelfLabel | null {
  const groups = ESL_GROUPS_BY_STORE.get(storeId);
  if (!groups || groups.length === 0 || !isRangedInStore(sku, storeId)) return null;
  let hash = 0;
  for (const char of sku) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  const group = groups[hash % groups.length];
  return { storeId, sku, size: group.eslSize, colour: group.eslColour, location: group.location, status: group.status };
}

/** Labels that update in this campaign: every approved product's label in every selected store. */
export function getCampaignShelfLabels(draft: CampaignDraft): ShelfLabel[] {
  if (!mediaIncludes(draft.media, 'esl')) return [];
  const skus = draft.products.filter(p => p.approved).map(p => p.sku);
  return skus.flatMap(sku =>
    draft.storeIds.map(storeId => getShelfLabel(storeId, sku)).filter((l): l is ShelfLabel => l !== null),
  );
}

/** The labels of one product in the campaign's stores. */
export function getProductShelfLabels(draft: CampaignDraft, sku: string): ShelfLabel[] {
  if (!mediaIncludes(draft.media, 'esl') || !sku) return [];
  return draft.storeIds.map(storeId => getShelfLabel(storeId, sku)).filter((l): l is ShelfLabel => l !== null);
}

function eslFormat(size: string, colour: string): ContentFormat {
  return {
    key: `esl|${size}|${colour}`,
    media: 'esl',
    label: `${size} ${ESL_COLOUR_LABELS[colour] ?? colour}`,
    orientation: 'Landscape',
    resolution: '',
    eslSize: size,
    eslColour: colour,
    deviceCount: 0,
  };
}

/** Distinct ESL label sizes among the given labels; deviceCount is the number of labels. */
export function getLabelFormats(labels: ShelfLabel[]): ContentFormat[] {
  const formats = new Map<string, ContentFormat>();
  for (const label of labels) {
    const format = formats.get(`esl|${label.size}|${label.colour}`) ?? eslFormat(label.size, label.colour);
    format.deviceCount += 1;
    formats.set(format.key, format);
  }
  return Array.from(formats.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function getSelectedDevices(draft: CampaignDraft): Device[] {
  return draft.deviceIds.map(id => DEVICE_BY_ID.get(id)).filter((d): d is Device => !!d);
}

export function getFormatKey(device: Device): string {
  return device.media === 'signage'
    ? `signage|${device.orientation}|${device.resolution}`
    : `esl|${device.eslSize}|${device.eslColour}`;
}

/**
 * Distinct media + format/size combinations: the selected screens' sizes, plus the label sizes of
 * the campaign products' shelf labels. Each needs its own content.
 */
export function getRequiredFormats(draft: CampaignDraft): ContentFormat[] {
  const formats = new Map<string, ContentFormat>();
  for (const format of getLabelFormats(getCampaignShelfLabels(draft))) formats.set(format.key, format);
  for (const device of getSelectedDevices(draft)) {
    if (device.media !== 'signage') continue;
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

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Content-change times spread evenly across opening hours, the first one at opening time. */
export function getChangeTimes(changesPerDay: number, openingTime: string, closingTime: string): string[] {
  if (!openingTime || !closingTime || changesPerDay < 1) return [];
  const open = timeToMinutes(openingTime);
  const close = timeToMinutes(closingTime);
  if (close <= open) return [];
  const interval = (close - open) / changesPerDay;
  return Array.from({ length: changesPerDay }, (_, i) => minutesToTime(open + interval * i));
}

/** Earliest opening and latest closing time across the selected stores, or null with no stores. */
export function getStoreHoursRange(draft: CampaignDraft): { open: string; close: string } | null {
  const stores = getSelectedStores(draft);
  if (stores.length === 0) return null;
  const open = stores.reduce((min, s) => (s.openingTime < min ? s.openingTime : min), stores[0].openingTime);
  const close = stores.reduce((max, s) => (s.closingTime > max ? s.closingTime : max), stores[0].closingTime);
  return { open, close };
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
/**
 * Whether a store sells (ranges) a product. Mock: a stable pseudo-random pick per store and SKU
 * at the product's ranging rate. In the real product this comes from the store ranging data.
 */
export function isRangedInStore(sku: string, storeId: string): boolean {
  const pct = CATALOG_PCT_BY_SKU.get(sku) ?? 1;
  // FNV-1a with a final mix, so neighbouring store codes do not get similar results.
  let hash = 0x811c9dc5;
  for (const char of `${sku}:${storeId}`) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
  hash = Math.imul(hash ^ (hash >>> 15), 0x2c1b3c6d);
  hash ^= hash >>> 13;
  return (hash >>> 0) / 0x100000000 < pct;
}

/** The selected stores, split into those that sell the product and those that do not. */
export function getStoreRanging(sku: string, draft: Pick<CampaignDraft, 'storeIds'>): { sold: Store[]; notSold: Store[] } {
  const stores = draft.storeIds.map(id => STORE_BY_ID.get(id)).filter((s): s is Store => !!s);
  return {
    sold: stores.filter(store => isRangedInStore(sku, store.id)),
    notSold: stores.filter(store => !isRangedInStore(sku, store.id)),
  };
}

export function applyDraftPatch(prev: CampaignDraft, patch: Partial<CampaignDraft>): CampaignDraft {
  const next: CampaignDraft = { ...prev, ...patch };

  if ('storeIds' in patch && !('products' in patch)) {
    next.products = next.products.map(product => ({
      ...product,
      eligibleStores: getStoreRanging(product.sku, next).sold.length,
    }));
  }

  if ('storeIds' in patch || 'media' in patch) {
    const allowed = new Set(getAvailableDevices(next).map(d => d.id));
    next.deviceIds = next.deviceIds.filter(id => allowed.has(id));
  }

  // Designs belong to a client's template pack, so a new client means choosing designs again.
  if ('clientId' in patch && patch.clientId !== prev.clientId) {
    next.slots = next.slots.map(slot => (slot.ticketType ? { ...slot, ticketType: '' } : slot));
    next.contentGenerated = false;
  }

  // The specification's "Content required" is whatever the slots show.
  if ('slots' in patch) {
    next.brief = { ...next.brief, contentRequired: slotKindsInUse(next.slots) };
  }

  // A slot can only show a product that is still approved.
  if ('products' in patch) {
    const approved = new Set(next.products.filter(p => p.approved).map(p => p.sku));
    if (next.slots.some(slot => slot.productSku && !approved.has(slot.productSku))) {
      next.slots = next.slots.map(slot =>
        slot.productSku && !approved.has(slot.productSku) ? { ...slot, productSku: '' } : slot,
      );
    }
  }

  const invalidatesContent =
    'storeIds' in patch ||
    'media' in patch ||
    'deviceIds' in patch ||
    'products' in patch ||
    'slots' in patch ||
    'slotSeconds' in patch;
  if (invalidatesContent && !('contentGenerated' in patch)) {
    next.contentGenerated = false;
  }

  return next;
}
