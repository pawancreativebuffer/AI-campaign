export type CampaignStatus = 'Draft' | 'Scheduled';
export type MediaChoice = '' | 'signage' | 'esl' | 'both';
export type DeviceMedia = 'signage' | 'esl';
export type DeviceStatus = 'Online' | 'Offline' | 'Maintenance';
export type Orientation = 'Landscape' | 'Portrait';

export interface Store {
  id: string;
  code: string;
  name: string;
  region: string;
  format: string;
  group: string;
  tags: string[];
  openingTime: string; // HH:MM
  closingTime: string; // HH:MM
}

export interface Device {
  id: string;
  storeId: string;
  media: DeviceMedia;
  name: string;
  tags: string[];
  location: string;
  orientation: Orientation;
  resolution: string; // signage only, '' for ESL
  eslSize: string; // ESL only, '' for signage
  eslColour: string; // ESL only, '' for signage
  labelCount: number; // ESL only, 0 for signage
  status: DeviceStatus;
}

export interface CatalogProduct {
  sku: string;
  description: string;
  size: string;
  category: string;
  supplier: string;
  brand: string;
  regularPrice: number;
  promoPrice: number;
  marginPct: number;
  stockOnHand: number;
  weeklyUnits: number;
  loyaltyIndex: number; // 0-100
  eligibleStorePct: number; // 0-1, share of stores ranging the product
  isNew: boolean;
}

export interface CampaignProduct {
  sku: string;
  description: string;
  size: string;
  category: string;
  supplier: string;
  brand: string;
  regularPrice: number;
  promoPrice: number;
  marginPct: number;
  stockOnHand: number;
  eligibleStores: number;
  reason: string; // AI recommendation reason
  contentType: string; // proposed content type, one of CONTENT_TYPES
  approved: boolean;
  source: 'ai' | 'manual';
}

/**
 * An ESL shelf label. It sits under one product on the shelf and only ever shows that product,
 * so labels are not picked by the user: every campaign product's label updates automatically.
 */
export interface ShelfLabel {
  storeId: string;
  sku: string;
  size: string; // e.g. "300x400"
  colour: string; // 'BW' | 'BWR' | 'BWRY'
  location: string; // shelf area, e.g. "Liquor"
  status: DeviceStatus;
}

/** One distinct output the campaign has to produce: a media type + format/size. */
export interface ContentFormat {
  key: string;
  media: DeviceMedia;
  label: string;
  orientation: Orientation;
  resolution: string;
  eslSize: string;
  eslColour: string;
  deviceCount: number;
}

export interface UploadedDataRow {
  sku: string;
  weeklyUnits?: number;
  marginPct?: number;
  stockOnHand?: number;
}

/** Supplemental retail data read from an uploaded Excel / CSV file. */
export interface UploadedData {
  fileName: string;
  rows: UploadedDataRow[]; // rows whose SKU is in the catalog
  provides: string[]; // which "data to analyse" types the file's columns cover
  unmatched: string[]; // SKUs in the file that are not in the catalog
}

export interface UploadedProductRow {
  sku: string;
  promoPrice?: number;
}

/** A product list read from an uploaded Excel / CSV file. */
export interface UploadedProductList {
  fileName: string;
  rows: UploadedProductRow[];
  unmatched: string[];
}

export interface CampaignBrief {
  dataSources: string[]; // DATA_SOURCES values: where the data to analyse comes from
  dataFile: UploadedData | null; // used when the 'upload' source is selected
  dataToAnalyse: string[];
  productSource: string;
  productSourceDetail: string; // category / supplier / brand name when relevant
  productFile: UploadedProductList | null; // used when productSource is the uploaded list
  externalFactors: string[];
  contentRequired: string[];
  additionalRules: string[]; // short sentences
}

/** A ticket design id from the client's template pack: one group of keys in its ticket XML (e.g. "SP" for "_SP"). */
export type TicketType = string;

/** One piece of content in the campaign loop, e.g. "slot 3: Product promotion, Buy More & Save". */
export interface CampaignSlot {
  id: string;
  kind: string; // one of SLOT_KINDS
  productSku: string; // product slots only
  ticketType: TicketType; // product slots only: the design chosen for this product, '' when not chosen
  headline: string; // message slots only, e.g. "Season's Greetings"
  body: string; // message slots only, e.g. opening hours text
  mediaType: string; // SLOT_MEDIA_TYPES value: Static, Animated or Video
  damAssetId: string; // Retail Media slots only: the supplied artwork from the DAM module
}

/** Finished artwork an external party (supplier, brand) delivered to the retailer, held in the DAM module. */
export interface DamAsset {
  id: string;
  name: string;
  supplier: string;
  type: 'image' | 'video';
  url: string;
  orientation: Orientation;
}

export interface CampaignDraft {
  id: string;
  status: CampaignStatus;
  clientId: string; // whose template pack (designs, fonts, renderer) the campaign uses

  // Screen 1
  name: string;
  objective: string;
  owner: string;
  description: string;

  // Screen 2
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endDate: string;
  endTime: string;
  activeDays: string[];
  changesPerDay: number;

  // Screen 3
  storeIds: string[];

  // Screen 4
  media: MediaChoice;

  // Screen 5
  deviceIds: string[];

  // Screen 6
  brief: CampaignBrief;
  prompt: string;

  // Screen 6: campaign structure (from the client's brief: "8 slots to run every 8 seconds")
  slotSeconds: number; // how long each slot shows on Digital Signage
  slots: CampaignSlot[];

  // Screen 7
  products: CampaignProduct[];


  // Screen 9
  contentGenerated: boolean;
}

export type StepErrors = Record<string, string>;

export interface StepProps {
  draft: CampaignDraft;
  /** Merge a partial change into the draft. Dependent selections are pruned centrally. */
  update: (patch: Partial<CampaignDraft>) => void;
  /** Field key -> message for the current step. Only render them when showErrors is true. */
  errors: StepErrors;
  showErrors: boolean;
  goToStep: (step: number) => void;
}

export interface ExistingSchedule {
  id: string;
  name: string;
  media: DeviceMedia;
  regions: string[];
  startDate: string;
  endDate: string;
}

export interface ValidationCheck {
  id: 'devices' | 'templates' | 'conflicts' | 'eslLimits';
  label: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
}
