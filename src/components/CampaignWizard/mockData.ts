import type { CatalogProduct, DamAsset, Device, DeviceStatus, ExistingSchedule, Store } from './types';

// Mock retail network. Everything is generated from the index so server and client render the same data.

export const REGIONS = [
  'Upper North',
  'Central North',
  'Lower North',
  'Upper South',
  'Lower South',
  'Auckland CBD',
  'Wellington CBD',
];

export const STORE_FORMATS = [
  'Large Format',
  'Small Format',
  'Large Catalogue',
  'Small Catalogue',
  'Boutique',
  'Superstores',
];

export const STORE_GROUPS = ['Corporate', 'Franchise', 'Metro Cluster', 'Regional Cluster', 'Flagship'];

export const STORE_TAGS = ['High Traffic', 'VIP Stores', 'Showroom', 'Workshop', 'Service Center', 'Tourist', 'Late Night'];

const TOWNS = [
  'Whangarei', 'Kerikeri', 'Albany', 'Takapuna', 'Henderson', 'Newmarket', 'Manukau', 'Pukekohe',
  'Hamilton', 'Cambridge', 'Tauranga', 'Rotorua', 'Taupo', 'Gisborne', 'Napier', 'Hastings',
  'New Plymouth', 'Whanganui', 'Palmerston North', 'Levin', 'Masterton', 'Porirua', 'Lower Hutt', 'Petone',
  'Nelson', 'Richmond', 'Blenheim', 'Westport', 'Greymouth', 'Kaikoura', 'Rangiora', 'Riccarton',
  'Hornby', 'Ashburton', 'Timaru', 'Oamaru', 'Dunedin', 'Queenstown', 'Wanaka', 'Invercargill',
];

const OPENING = ['07:00', '08:00', '09:00'];
const CLOSING = ['18:00', '21:00', '22:00'];

export const STORES: Store[] = Array.from({ length: 200 }, (_, i) => {
  const code = String(1001 + i);
  const town = TOWNS[i % TOWNS.length];
  const branch = Math.floor(i / TOWNS.length);
  const tagA = STORE_TAGS[Math.floor(i / 7) % STORE_TAGS.length];
  const tagB = STORE_TAGS[(Math.floor(i / 3) + 3) % STORE_TAGS.length];
  return {
    id: `S${code}`,
    code,
    name: branch === 0 ? town : `${town} ${['Central', 'North', 'South', 'East'][branch - 1]}`,
    region: REGIONS[i % REGIONS.length],
    format: STORE_FORMATS[(i + Math.floor(i / 7)) % STORE_FORMATS.length],
    group: STORE_GROUPS[Math.floor(i / 3) % STORE_GROUPS.length],
    tags: tagA === tagB ? [tagA] : [tagA, tagB],
    openingTime: OPENING[i % OPENING.length],
    closingTime: CLOSING[Math.floor(i / 2) % CLOSING.length],
  };
});

export const SIGNAGE_LOCATIONS = ['Entrance', 'Aisle End', 'Checkout', 'Window', 'Promo Bay', 'Service Desk'];
export const ESL_LOCATIONS = ['Aisles 1-4', 'Aisles 5-8', 'Chiller', 'Produce', 'Liquor', 'Front End'];
export const SIGNAGE_TAGS = ['Promo', 'Large', 'Small', 'Window Facing', 'Interactive'];
export const ESL_TAGS = ['Shelf Edge', 'Promo', 'Fresh', 'Premium'];
// Device sizes. They match the sizes in the Food Villa template set; other clients' packs may cover other sizes.
export const LANDSCAPE_RESOLUTIONS = ['1920x1080', '1280x720'];
export const PORTRAIT_RESOLUTIONS = ['1080x1920', '2160x3840'];
export const ESL_SIZES = ['200x200', '250x122', '296x152', '300x400', '528x880', '640x960'];
export const ESL_COLOURS = ['BW', 'BWR', 'BWRY'];
export const ESL_COLOUR_LABELS: Record<string, string> = {
  BW: 'Black / White',
  BWR: 'Black / White / Red',
  BWRY: 'Black / White / Red / Yellow',
};
export const DEVICE_STATUSES: DeviceStatus[] = ['Online', 'Offline', 'Maintenance'];

function deviceStatus(n: number): DeviceStatus {
  if (n % 17 === 5) return 'Maintenance';
  if (n % 11 === 3) return 'Offline';
  return 'Online';
}

export const DEVICES: Device[] = STORES.flatMap((store, i) => {
  const devices: Device[] = [];
  const signageCount = 2 + (i % 3);
  for (let j = 0; j < signageCount; j++) {
    const n = i * 7 + j;
    const portrait = n % 3 === 1;
    devices.push({
      id: `${store.id}-DS${j + 1}`,
      storeId: store.id,
      media: 'signage',
      name: `Screen ${j + 1} - ${SIGNAGE_LOCATIONS[n % SIGNAGE_LOCATIONS.length]}`,
      tags: [SIGNAGE_TAGS[n % SIGNAGE_TAGS.length]],
      location: SIGNAGE_LOCATIONS[n % SIGNAGE_LOCATIONS.length],
      orientation: portrait ? 'Portrait' : 'Landscape',
      resolution: portrait
        ? PORTRAIT_RESOLUTIONS[Math.floor(n / 3) % PORTRAIT_RESOLUTIONS.length]
        : LANDSCAPE_RESOLUTIONS[Math.floor(n / 2) % LANDSCAPE_RESOLUTIONS.length],
      eslSize: '',
      eslColour: '',
      labelCount: 0,
      status: deviceStatus(n),
    });
  }
  const eslCount = 2 + (i % 2);
  for (let j = 0; j < eslCount; j++) {
    const n = i * 5 + j;
    devices.push({
      id: `${store.id}-ESL${j + 1}`,
      storeId: store.id,
      media: 'esl',
      name: `ESL Group ${j + 1} - ${ESL_LOCATIONS[n % ESL_LOCATIONS.length]}`,
      tags: [ESL_TAGS[n % ESL_TAGS.length]],
      location: ESL_LOCATIONS[n % ESL_LOCATIONS.length],
      orientation: 'Landscape',
      resolution: '',
      eslSize: ESL_SIZES[n % ESL_SIZES.length],
      eslColour: ESL_COLOURS[Math.floor(n / 2) % ESL_COLOURS.length],
      labelCount: 60 + (n % 9) * 20,
      status: deviceStatus(n + 2),
    });
  }
  return devices;
});

export const PRODUCT_CATALOG: CatalogProduct[] = [
  { sku: '184527', description: 'Harbour Master Reserve Gin', size: '700ml', category: 'Spirits', supplier: 'Pacific Distillers', brand: 'Harbour Master', regularPrice: 59.99, promoPrice: 49.99, marginPct: 31, stockOnHand: 4200, weeklyUnits: 910, loyaltyIndex: 74, eligibleStorePct: 0.92, isNew: false },
  { sku: '192365', description: 'Heritage Hills Single Malt', size: '700ml', category: 'Spirits', supplier: 'Pacific Distillers', brand: 'Heritage Hills', regularPrice: 79.99, promoPrice: 69.99, marginPct: 34, stockOnHand: 1850, weeklyUnits: 320, loyaltyIndex: 81, eligibleStorePct: 0.71, isNew: false },
  { sku: '188410', description: 'Black Sand Spiced Rum', size: '1L', category: 'Spirits', supplier: 'Southern Cross Beverages', brand: 'Black Sand', regularPrice: 54.99, promoPrice: 44.99, marginPct: 27, stockOnHand: 6900, weeklyUnits: 640, loyaltyIndex: 58, eligibleStorePct: 0.88, isNew: false },
  { sku: '190077', description: 'Alpine Glacier Vodka', size: '1L', category: 'Spirits', supplier: 'Southern Cross Beverages', brand: 'Alpine Glacier', regularPrice: 46.99, promoPrice: 39.99, marginPct: 24, stockOnHand: 9800, weeklyUnits: 1120, loyaltyIndex: 49, eligibleStorePct: 0.97, isNew: false },
  { sku: '216843', description: 'Southern Peaks Sauvignon Blanc', size: '750ml', category: 'Wine', supplier: 'Marlborough Estates', brand: 'Southern Peaks', regularPrice: 18.99, promoPrice: 14.99, marginPct: 29, stockOnHand: 15400, weeklyUnits: 2840, loyaltyIndex: 86, eligibleStorePct: 0.99, isNew: false },
  { sku: '197624', description: 'Coastal Road Pinot Noir', size: '750ml', category: 'Wine', supplier: 'Marlborough Estates', brand: 'Coastal Road', regularPrice: 27.99, promoPrice: 21.99, marginPct: 33, stockOnHand: 7300, weeklyUnits: 1260, loyaltyIndex: 79, eligibleStorePct: 0.9, isNew: false },
  { sku: '208451', description: 'Kauri Creek Chardonnay', size: '750ml', category: 'Wine', supplier: 'Hawke\'s Bay Vintners', brand: 'Kauri Creek', regularPrice: 24.99, promoPrice: 19.99, marginPct: 30, stockOnHand: 11200, weeklyUnits: 980, loyaltyIndex: 66, eligibleStorePct: 0.86, isNew: false },
  { sku: '221906', description: 'Tui Ridge Rose', size: '750ml', category: 'Wine', supplier: 'Hawke\'s Bay Vintners', brand: 'Tui Ridge', regularPrice: 19.99, promoPrice: 15.99, marginPct: 35, stockOnHand: 13900, weeklyUnits: 760, loyaltyIndex: 61, eligibleStorePct: 0.8, isNew: true },
  { sku: '225318', description: 'Silver Fern Prosecco', size: '750ml', category: 'Wine', supplier: 'Marlborough Estates', brand: 'Silver Fern', regularPrice: 22.99, promoPrice: 17.99, marginPct: 28, stockOnHand: 5100, weeklyUnits: 1490, loyaltyIndex: 72, eligibleStorePct: 0.93, isNew: false },
  { sku: '301244', description: 'Steam Wharf Pale Ale', size: '12 x 330ml', category: 'Beer & Cider', supplier: 'Steam Wharf Brewing', brand: 'Steam Wharf', regularPrice: 29.99, promoPrice: 24.99, marginPct: 22, stockOnHand: 8700, weeklyUnits: 2210, loyaltyIndex: 69, eligibleStorePct: 0.95, isNew: false },
  { sku: '301871', description: 'Steam Wharf Hazy IPA', size: '6 x 330ml', category: 'Beer & Cider', supplier: 'Steam Wharf Brewing', brand: 'Steam Wharf', regularPrice: 24.99, promoPrice: 19.99, marginPct: 26, stockOnHand: 3400, weeklyUnits: 1180, loyaltyIndex: 77, eligibleStorePct: 0.74, isNew: true },
  { sku: '305590', description: 'Orchard Lane Apple Cider', size: '10 x 330ml', category: 'Beer & Cider', supplier: 'Southern Cross Beverages', brand: 'Orchard Lane', regularPrice: 26.99, promoPrice: 21.99, marginPct: 25, stockOnHand: 12600, weeklyUnits: 690, loyaltyIndex: 52, eligibleStorePct: 0.84, isNew: false },
  { sku: '308216', description: 'Longshore Lager', size: '24 x 330ml', category: 'Beer & Cider', supplier: 'Steam Wharf Brewing', brand: 'Longshore', regularPrice: 42.99, promoPrice: 36.99, marginPct: 18, stockOnHand: 16800, weeklyUnits: 3050, loyaltyIndex: 63, eligibleStorePct: 1, isNew: false },
  { sku: '304958', description: 'Premium Angus Beef Steak', size: '500g', category: 'Fresh', supplier: 'Canterbury Meats', brand: 'Canterbury Select', regularPrice: 15.99, promoPrice: 12.99, marginPct: 21, stockOnHand: 2600, weeklyUnits: 1740, loyaltyIndex: 83, eligibleStorePct: 0.68, isNew: false },
  { sku: '495832', description: 'Organic Avocados', size: '3 Pack', category: 'Fresh', supplier: 'Bay of Plenty Growers', brand: 'Green Valley', regularPrice: 6.99, promoPrice: 4.99, marginPct: 38, stockOnHand: 5400, weeklyUnits: 2630, loyaltyIndex: 88, eligibleStorePct: 0.78, isNew: false },
  { sku: '497115', description: 'Free Range Chicken Breast', size: '1kg', category: 'Fresh', supplier: 'Canterbury Meats', brand: 'Canterbury Select', regularPrice: 18.99, promoPrice: 14.99, marginPct: 19, stockOnHand: 3100, weeklyUnits: 2050, loyaltyIndex: 80, eligibleStorePct: 0.69, isNew: false },
  { sku: '498440', description: 'Vine Ripened Tomatoes', size: '500g', category: 'Fresh', supplier: 'Bay of Plenty Growers', brand: 'Green Valley', regularPrice: 5.49, promoPrice: 3.99, marginPct: 36, stockOnHand: 7800, weeklyUnits: 1910, loyaltyIndex: 67, eligibleStorePct: 0.82, isNew: false },
  { sku: '512309', description: 'Macro Organic Olive Oil Extra Virgin', size: '500ml', category: 'Grocery', supplier: 'Mediterranean Imports', brand: 'Macro Organic', regularPrice: 14.99, promoPrice: 11.99, marginPct: 32, stockOnHand: 9300, weeklyUnits: 870, loyaltyIndex: 71, eligibleStorePct: 0.91, isNew: false },
  { sku: '514776', description: 'Roast House Coffee Beans', size: '1kg', category: 'Grocery', supplier: 'Roast House Co', brand: 'Roast House', regularPrice: 32.99, promoPrice: 26.99, marginPct: 37, stockOnHand: 4700, weeklyUnits: 1340, loyaltyIndex: 90, eligibleStorePct: 0.89, isNew: false },
  { sku: '516102', description: 'Roast House Cold Brew', size: '4 x 250ml', category: 'Grocery', supplier: 'Roast House Co', brand: 'Roast House', regularPrice: 12.99, promoPrice: 9.99, marginPct: 40, stockOnHand: 14200, weeklyUnits: 410, loyaltyIndex: 55, eligibleStorePct: 0.62, isNew: true },
  { sku: '518893', description: 'Artisan Sourdough Crackers', size: '185g', category: 'Grocery', supplier: 'Mediterranean Imports', brand: 'Stone Oven', regularPrice: 6.49, promoPrice: 4.99, marginPct: 41, stockOnHand: 18500, weeklyUnits: 560, loyaltyIndex: 47, eligibleStorePct: 0.87, isNew: false },
  { sku: '520417', description: 'Dark Chocolate Sea Salt Block', size: '250g', category: 'Grocery', supplier: 'Wellington Chocolate Works', brand: 'Cocoa Wharf', regularPrice: 8.99, promoPrice: 6.49, marginPct: 39, stockOnHand: 10100, weeklyUnits: 1670, loyaltyIndex: 84, eligibleStorePct: 0.96, isNew: false },
  { sku: '603155', description: 'EcoClean Laundry Liquid', size: '2L', category: 'Household', supplier: 'EcoClean NZ', brand: 'EcoClean', regularPrice: 17.99, promoPrice: 12.99, marginPct: 28, stockOnHand: 21400, weeklyUnits: 720, loyaltyIndex: 59, eligibleStorePct: 0.94, isNew: false },
  { sku: '604820', description: 'EcoClean Dishwasher Tablets', size: '60 Pack', category: 'Household', supplier: 'EcoClean NZ', brand: 'EcoClean', regularPrice: 24.99, promoPrice: 17.99, marginPct: 30, stockOnHand: 17900, weeklyUnits: 640, loyaltyIndex: 62, eligibleStorePct: 0.94, isNew: false },
];

export const PRODUCT_CATEGORIES = Array.from(new Set(PRODUCT_CATALOG.map(p => p.category)));
export const PRODUCT_SUPPLIERS = Array.from(new Set(PRODUCT_CATALOG.map(p => p.supplier)));
export const PRODUCT_BRANDS = Array.from(new Set(PRODUCT_CATALOG.map(p => p.brand)));

// Retail Media in the DAM module: artwork suppliers and brands delivered ready to run.
export const DAM_ASSETS: DamAsset[] = [
  { id: 'DAM-101', name: 'Spring Wine Showcase', supplier: 'Marlborough Estates', type: 'image', url: '/promo_ticket_one.png', orientation: 'Landscape' },
  { id: 'DAM-102', name: 'Summer Beer Range', supplier: 'Steam Wharf Brewing', type: 'image', url: '/promo_ticket_two.png', orientation: 'Landscape' },
  { id: 'DAM-103', name: 'Brand Story 15 sec', supplier: 'Roast House Co', type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', orientation: 'Landscape' },
];

// Campaigns already scheduled on the network, used for the scheduling-conflict check.
export const EXISTING_SCHEDULES: ExistingSchedule[] = [
  { id: 'EX-1', name: 'Week 45 Promotion', media: 'signage', regions: ['Auckland CBD'], startDate: '2026-10-05', endDate: '2026-10-18' },
  { id: 'EX-2', name: 'Spring Liquor Shelf Pricing', media: 'esl', regions: ['Wellington CBD'], startDate: '2026-10-05', endDate: '2026-10-11' },
  { id: 'EX-3', name: 'Labour Weekend Specials', media: 'signage', regions: ['Upper South', 'Lower South'], startDate: '2026-10-23', endDate: '2026-10-26' },
];
