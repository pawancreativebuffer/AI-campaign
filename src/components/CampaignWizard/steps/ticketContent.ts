import { getClientPack } from '../clients';
import {
  formatTime12,
  getLabelFormats,
  getProductShelfLabels,
  getRequiredFormats,
  getSelectedStores,
  isProductSlot,
  isRetailMediaSlot,
  DAM_ASSET_BY_ID,
} from '../helpers';
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
  if (kind === 'Opening hours') {
    // Each store shows its own hours; the preview uses the first selected store.
    const store = getSelectedStores(draft)[0];
    if (!store) return 'Open every day';
    return `${formatTime12(store.openingTime)} - ${formatTime12(store.closingTime)}, ${draft.activeDays.length === 7 ? 'every day' : draft.activeDays.join(', ')}`;
  }
  if (kind === 'Seasonal greeting') return `From all of us at ${getClientPack(draft.clientId).name}`;
  return '';
}

export const RENDERER_VIDEO_NOTE = 'Final video will be produced by the renderer';

/**
 * A designed slot (not DAM artwork) set to Video. The prototype cannot render video,
 * so its preview plays the ticket in a moving loop and says the renderer makes the final video.
 */
export function isRendererVideo(slot: CampaignSlot): boolean {
  return slot.mediaType === 'Video' && !isRetailMediaSlot(slot.kind);
}

/** What the ticket for one slot shows: product and design for product slots, text for the rest. */
export function getTicketContent(slot: CampaignSlot, draft: CampaignDraft): TicketContent {
  const endDate = formatEndDate(draft.endDate);
  const video = isRendererVideo(slot);
  const animated = slot.mediaType === 'Animated' || video;
  if (isRetailMediaSlot(slot.kind)) {
    const asset = DAM_ASSET_BY_ID.get(slot.damAssetId);
    return {
      kind: slot.kind,
      ticketType: '',
      headline: asset ? undefined : 'Choose artwork from the DAM',
      asset: asset && { name: asset.name, type: asset.type, url: asset.url },
    };
  }
  if (!isProductSlot(slot.kind)) {
    return {
      kind: slot.kind,
      ticketType: '',
      headline: slot.headline || defaultHeadline(slot.kind),
      body: slot.body || defaultBody(slot.kind, draft),
      endDate,
      animated,
      video,
    };
  }
  const product = draft.products.find(p => p.sku === slot.productSku);
  return {
    kind: slot.kind,
    ticketType: slot.ticketType,
    endDate,
    animated,
    video,
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
 * Every piece of content to generate. Digital Signage plays every slot in turn. An ESL label sits
 * under one product and only shows that product, so each product slot gets one ESL ticket per
 * size of its own product's labels.
 */
export function getSlotOutputs(draft: CampaignDraft): SlotOutput[] {
  const signage = getRequiredFormats(draft)
    .filter(format => format.media === 'signage')
    .flatMap(format => draft.slots.map((slot, i) => ({ slot, slotNumber: i + 1, format })));
  const esl = draft.slots.flatMap((slot, i) =>
    isProductSlot(slot.kind) && slot.productSku
      ? getLabelFormats(getProductShelfLabels(draft, slot.productSku)).map(format => ({ slot, slotNumber: i + 1, format }))
      : [],
  );
  return [...signage, ...esl];
}
