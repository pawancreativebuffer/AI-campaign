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

export interface Template {
  id: string;
  name: string;
  media: DeviceMedia;
  kind: 'Static' | 'Animated'; // ESL templates are always Static
  orientation: Orientation | 'Any';
  resolutions: string[]; // signage; empty = any resolution
  eslSizes: string[]; // ESL; empty = any size
  eslColours: string[]; // ESL; empty = any colour capability
  contentTypes: string[];
  accent: string; // preview colour
  layout: 'price-hero' | 'product-split' | 'banner' | 'message' | 'shelf-label';
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

export interface CampaignBrief {
  dataToAnalyse: string[];
  productSource: string;
  productSourceDetail: string; // category / supplier / brand name when relevant
  externalFactors: string[];
  contentRequired: string[];
  additionalRules: string[]; // short sentences
}

export interface CampaignDraft {
  id: string;
  status: CampaignStatus;

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
  openingTime: string;
  closingTime: string;
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

  // Screen 7
  products: CampaignProduct[];

  // Screen 8: ContentFormat.key -> Template.id
  templateSelections: Record<string, string>;

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
