import { getClientPack } from '../clients';
import { formatTime12, getRequiredFormats, isProductSlot } from '../helpers';
import type { CampaignDraft, CampaignSlot, ContentFormat } from '../types';
import type { TicketContent } from './FoodVillaTicket';

const MULTIBUY_QTY = 2;

/** "2026-11-08" -> "Ends 08/11/26", as printed on the Food Villa tickets. */
function formatEndDate(date: string): string {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  return `Ends ${d}/${m}/${y.slice(2)}`;
}

export function defaultHeadline(kind: string): string {
  switch (kind) {
    case 'Seasonal greeting':
      return "Season's Greetings";
    case 'Opening hours':
      return "We're open";
    case 'Store-wide offer':
      return '10% off storewide this weekend';
    case 'Category promotion':
      return 'Great deals across the range';
    case 'Brand advert':
      return 'Proudly stocking local brands';
    default:
      return '';
  }
}

export function defaultBody(kind: string, draft: CampaignDraft): string {
  if (kind === 'Opening hours' && draft.openingTime && draft.closingTime) {
    return `${formatTime12(draft.openingTime)} - ${formatTime12(draft.closingTime)}, ${draft.activeDays.length === 7 ? 'every day' : draft.activeDays.join(', ')}`;
  }
  if (kind === 'Seasonal greeting') return `From all of us at ${getClientPack(draft.clientId).name}`;
  return '';
}

/** What the ticket for one slot shows: product and design for product slots, text for the rest. */
export function getTicketContent(slot: CampaignSlot, draft: CampaignDraft): TicketContent {
  const endDate = formatEndDate(draft.endDate);
  if (!isProductSlot(slot.kind)) {
    return {
      kind: slot.kind,
      ticketType: '',
      headline: slot.headline || defaultHeadline(slot.kind),
      body: slot.body || defaultBody(slot.kind, draft),
      endDate,
    };
  }
  const product = draft.products.find(p => p.sku === slot.productSku);
  return {
    kind: slot.kind,
    ticketType: slot.ticketType,
    endDate,
    product: product && {
      sku: product.sku,
      description: product.description,
      size: product.size,
      promoPrice: product.promoPrice,
      regularPrice: product.regularPrice,
      multibuyQty: slot.ticketType === 'BMS' ? MULTIBUY_QTY : undefined,
    },
  };
}

export interface SlotOutput {
  slot: CampaignSlot;
  slotNumber: number;
  format: ContentFormat;
}

/**
 * Every piece of content to generate. Digital Signage plays every slot in turn;
 * an ESL label shows one product, so ESL formats only get the product slots.
 */
export function getSlotOutputs(draft: CampaignDraft): SlotOutput[] {
  return getRequiredFormats(draft).flatMap(format =>
    draft.slots
      .map((slot, i) => ({ slot, slotNumber: i + 1, format }))
      .filter(({ slot }) => format.media === 'signage' || isProductSlot(slot.kind)),
  );
}
