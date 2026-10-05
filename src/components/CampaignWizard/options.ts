// Option lists taken from the "Ticket-IT Intelligent Campaign Creation" user specification.

export const OBJECTIVES = [
  'Sales',
  'Margin',
  'Stock reduction',
  'Product launch',
  'Loyalty',
  'Supplier campaign',
];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MEDIA_OPTIONS = [
  { value: 'signage', label: 'Digital Signage', description: 'In-store screens. Static or animated content.' },
  { value: 'esl', label: 'ESL', description: 'Electronic shelf labels. Static content only.' },
  { value: 'both', label: 'Digital Signage and ESL', description: 'Separate content requirements within one campaign.' },
] as const;

export const DATA_TO_ANALYSE = [
  'Sales',
  'Margin',
  'Stock',
  'Promotions',
  'Basket relationships',
  'Loyalty',
  'Regional demand',
];

/** Where the data to analyse comes from. The specification lists the data but not its source. */
export const DATA_SOURCES = [
  {
    value: 'pos',
    label: 'Ticket-IT POS',
    description: 'Sales, margin, stock and promotions from the POS integration.',
    provides: ['Sales', 'Margin', 'Stock', 'Promotions'],
  },
  {
    value: '11ants',
    label: '11ANTS',
    description: 'Loyalty, basket and regional demand from retail intelligence.',
    provides: ['Loyalty', 'Basket relationships', 'Regional demand'],
  },
  {
    value: 'upload',
    label: 'Excel upload',
    description: 'Your own file with weekly units, margin or stock by SKU.',
    provides: [] as string[], // depends on the columns in the uploaded file
  },
];

export const UPLOADED_PRODUCT_SOURCE = 'Uploaded product list';

export const PRODUCT_SOURCES = [
  'AI recommendations',
  'Category',
  'Supplier',
  'Brand',
  'User-selected products',
  UPLOADED_PRODUCT_SOURCE,
];

export const EXTERNAL_FACTORS = [
  'Weather',
  'Public holidays',
  'Seasonality',
  'Local events',
  'Time of day',
];

/** What a slot shows. Product slots carry a product and a ticket design; the rest carry a message. */
export const RETAIL_MEDIA_KIND = 'Retail Media';

export const SLOT_KINDS = [
  'Product promotion',
  'Loyalty advert',
  'Seasonal greeting',
  'Opening hours',
  'Store-wide offer',
  'Category promotion',
  'Brand advert',
  RETAIL_MEDIA_KIND,
];

/**
 * What kind of media a slot is produced as (client: "Static, Animated, Video").
 * ESL labels are always static.
 */
export const SLOT_MEDIA_TYPES = [
  { value: 'Static', description: 'a still image (PNG)' },
  { value: 'Animated', description: 'simple slide-level animation, like a PowerPoint slide' },
  { value: 'Video', description: 'full animation, advertising quality' },
];

export const DEFAULT_SLOT_MEDIA = 'Static';

export const PRODUCT_SLOT_KINDS = ['Product promotion', 'Loyalty advert'];

/** The specification's "Content required" options are the slot kinds. */
export const CONTENT_TYPES = SLOT_KINDS;

export const MIN_SLOT_SECONDS = 3;
export const MAX_SLOT_SECONDS = 60;
export const DEFAULT_SLOT_SECONDS = 8;
export const MAX_SLOTS = 20;

export const SLOT_PRESETS = [
  { label: '8 slots x 8 sec', slots: 8, seconds: 8 },
  { label: '6 slots x 7 sec', slots: 6, seconds: 7 },
];


/** ESL campaigns must allow no more than four content changes per day. */
export const ESL_MAX_CHANGES_PER_DAY = 4;

export const WIZARD_STEPS = [
  { step: 1, label: 'Create Campaign', title: 'Create Campaign' },
  { step: 2, label: 'Schedule', title: 'Set Campaign Schedule' },
  { step: 3, label: 'Stores', title: 'Select Campaign Stores' },
  { step: 4, label: 'Media', title: 'Select Campaign Media' },
  { step: 5, label: 'Devices', title: 'Select Campaign Devices' },
  { step: 6, label: 'Campaign Brief', title: 'Build Campaign Brief' },
  { step: 7, label: 'Products & Content', title: 'Select Products and Content' },
  { step: 8, label: 'Slots & Designs', title: 'Select Templates for Each Slot' },
  { step: 9, label: 'Generate & Preview', title: 'Generate and Preview Content' },
  { step: 10, label: 'Review', title: 'Review Campaign' },
  { step: 11, label: 'Create & Schedule', title: 'Create and Schedule Campaign' },
];
