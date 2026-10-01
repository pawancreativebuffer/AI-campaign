import type { TicketType } from './types';

/**
 * Each client has its own ticket template pack: its own designs (the groups in its ticket XML),
 * fonts, brand colours, example images and renderer. Food Villa is built from the files the
 * client supplied; the sample pack is a stand-in for any other client and keeps the wizard
 * free of client-specific code. In the real product the pack comes from the template API.
 */

export interface TicketDesign {
  id: TicketType; // the group suffix in the client's ticket XML, e.g. "SP" for "_SP"
  label: string;
  description: string;
}

export interface ClientTemplatePack {
  id: string;
  name: string;
  /** Which renderer draws this client's tickets. */
  renderer: 'food-villa' | 'generic';
  designs: TicketDesign[];
  /** Design used by loyalty slots and loyalty campaigns. */
  loyaltyDesign: TicketType;
  /** Design per campaign objective; anything not listed uses the first design. */
  objectiveDesigns: Record<string, TicketType>;
  fontFamily: string;
  colours: { primary: string; accent: string; text: string; background: string };
  /** Example images the client supplied, by size: which designs have one. */
  examples: Record<string, TicketType[]>;
  examplePath: string;
}

export const CLIENT_PACKS: ClientTemplatePack[] = [
  {
    id: 'food-villa',
    name: 'Food Villa',
    renderer: 'food-villa',
    designs: [
      { id: 'SP', label: 'Special Price', description: 'Promotional price with the saving.' },
      { id: 'SALE', label: 'Sale', description: 'Sale price with the saving.' },
      { id: 'CLR', label: 'Clear Out', description: 'Clearance price with the was price.' },
      { id: 'BMS', label: 'Buy More & Save', description: 'Multibuy offer, e.g. 2 for $43.' },
      { id: 'NEW', label: 'New', description: 'New product launch.' },
      { id: 'VCD', label: 'Villa Club Deal', description: 'Member and non-member price.' },
    ],
    loyaltyDesign: 'VCD',
    objectiveDesigns: { 'Stock reduction': 'CLR', 'Product launch': 'NEW', Loyalty: 'VCD' },
    fontFamily: '"Roboto Condensed", "Arial Narrow", sans-serif',
    colours: { primary: '#d0021b', accent: '#ffd800', text: '#111111', background: '#ffffff' },
    examples: {
      '1920x1080': ['SP', 'SALE', 'CLR', 'BMS', 'NEW', 'VCD'],
      '1280x720': ['SP', 'SALE'],
      '1080x1920': ['SP', 'SALE', 'BMS', 'NEW'],
      '2160x3840': ['BMS', 'VCD'],
      '200x200': ['SP', 'SALE', 'CLR', 'NEW'],
      '250x122': ['SP', 'BMS', 'NEW', 'VCD'],
      '296x152': ['CLR', 'VCD'],
      '300x400': ['SP', 'BMS', 'CLR', 'NEW', 'VCD'],
      '528x880': ['SP', 'CLR', 'NEW', 'VCD'],
      '640x960': ['NEW', 'VCD'],
    },
    examplePath: '/templates/food-villa',
  },
  {
    id: 'sample-retailer',
    name: 'Sample Retailer (demo pack)',
    renderer: 'generic',
    designs: [
      { id: 'PROMO', label: 'Promo', description: 'Promotional price with the saving.' },
      { id: 'HOT', label: 'Hot Price', description: 'Everyday low price highlight.' },
      { id: 'MEMBER', label: 'Members Only', description: 'Member and non-member price.' },
      { id: 'CLEARANCE', label: 'Clearance', description: 'Clearance price with the was price.' },
    ],
    loyaltyDesign: 'MEMBER',
    objectiveDesigns: { 'Stock reduction': 'CLEARANCE', Loyalty: 'MEMBER', Margin: 'HOT' },
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    colours: { primary: '#0f4c81', accent: '#16a34a', text: '#0f172a', background: '#ffffff' },
    examples: {},
    examplePath: '',
  },
];

/**
 * The client of the signed-in user. A user only ever sees their own client's templates.
 * In the real product this comes from the login session; the prototype is signed in as Food Villa.
 */
export const LOGGED_IN_CLIENT_ID = 'food-villa';

export function getClientPack(clientId: string): ClientTemplatePack {
  return CLIENT_PACKS.find(pack => pack.id === clientId) ?? CLIENT_PACKS[0];
}

export function getDesignLabel(clientId: string, designId: string): string {
  return getClientPack(clientId).designs.find(design => design.id === designId)?.label ?? designId;
}

/** URL of the client's own example image for a size and design, if they supplied one. */
export function getDesignExample(clientId: string, size: string, designId: string): string | undefined {
  const pack = getClientPack(clientId);
  return pack.examples[size]?.includes(designId) ? `${pack.examplePath}/${size}-${designId}.jpg` : undefined;
}
