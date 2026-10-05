import { getClientPack } from './clients';
import { EXISTING_SCHEDULES } from './mockData';
import {
  ESL_MAX_CHANGES_PER_DAY,
  MAX_SLOT_SECONDS,
  MIN_SLOT_SECONDS,
  UPLOADED_PRODUCT_SOURCE,
} from './options';
import {
  getAvailableDataTypes,
  isProductSlot,
  isRetailMediaSlot,
  getRequiredFormats,
  getCampaignShelfLabels,
  getSelectedDevices,
  getSelectedStores,
  mediaIncludes,
} from './helpers';
import { buildCampaignPrompt, sourceNeedsDetail } from './steps/promptBuilder';
import type { CampaignDraft, StepErrors, ValidationCheck } from './types';

const ESL_LIMIT_MESSAGE = `ESL campaigns allow no more than ${ESL_MAX_CHANGES_PER_DAY} content changes per day. Reduce the content-change frequency on the Schedule step.`;

/**
 * Switched off so the flow can be clicked through while testing.
 * Set to true to enforce the per-step rules and block scheduling on failed checks again.
 */
export const VALIDATION_ENABLED = true;

/** A product slot needs a product and a design; any other slot needs a headline. */
export function isSlotComplete(slot: CampaignDraft['slots'][number]): boolean {
  if (isRetailMediaSlot(slot.kind)) return !!slot.damAssetId;
  return isProductSlot(slot.kind) ? !!slot.productSku && !!slot.ticketType : slot.headline.trim() !== '';
}

/** Slots that will actually be produced: message slots only run on Digital Signage. */
function producedSlots(draft: CampaignDraft): CampaignDraft['slots'] {
  return mediaIncludes(draft.media, 'signage') ? draft.slots : draft.slots.filter(slot => isProductSlot(slot.kind));
}

/** Errors that stop the user leaving a screen. Keys are field names the step renders against. */
export function getStepErrors(step: number, draft: CampaignDraft): StepErrors {
  const errors: StepErrors = {};
  if (!VALIDATION_ENABLED) return errors;

  switch (step) {
    case 1:
      if (!draft.name.trim()) errors.name = 'Campaign name is required';
      if (!draft.objective) errors.objective = 'Campaign objective is required';
      if (!draft.owner.trim()) errors.owner = 'Campaign owner is required';
      break;

    case 2: {
      if (!draft.startDate) errors.startDate = 'Start date is required';
      if (!draft.startTime) errors.startTime = 'Start time is required';
      if (!draft.endDate) errors.endDate = 'Finish date is required';
      if (!draft.endTime) errors.endTime = 'Finish time is required';
      if (draft.startDate && draft.endDate && draft.startTime && draft.endTime) {
        if (`${draft.endDate}T${draft.endTime}` <= `${draft.startDate}T${draft.startTime}`) {
          errors.endDate = 'Finish must be after the start date and time';
        }
      }
      if (draft.activeDays.length === 0) errors.activeDays = 'Select at least one active day';
      if (!Number.isInteger(draft.changesPerDay) || draft.changesPerDay < 1) {
        errors.changesPerDay = 'Enter at least one content change per day';
      } else if (mediaIncludes(draft.media, 'esl') && draft.changesPerDay > ESL_MAX_CHANGES_PER_DAY) {
        errors.changesPerDay = `ESL campaigns allow no more than ${ESL_MAX_CHANGES_PER_DAY} content changes per day`;
      }
      break;
    }

    case 3:
      if (draft.storeIds.length === 0) errors.storeIds = 'Select at least one store';
      break;

    case 4:
      if (!draft.media) {
        errors.media = 'Select the campaign media';
      } else if (mediaIncludes(draft.media, 'esl') && draft.changesPerDay > ESL_MAX_CHANGES_PER_DAY) {
        errors.eslLimit = ESL_LIMIT_MESSAGE;
      }
      break;

    case 5: {
      // Only screens are picked; ESL labels follow the campaign's products.
      if (mediaIncludes(draft.media, 'signage') && getSelectedDevices(draft).length === 0) {
        errors.deviceIds = 'Select at least one Digital Signage screen';
      }
      break;
    }

    case 6: {
      const available = getAvailableDataTypes(draft.brief);
      if (draft.brief.dataSources.length === 0) {
        errors.dataSources = 'Select where the data comes from';
      } else if (draft.brief.dataSources.includes('upload') && !draft.brief.dataFile) {
        errors.dataSources = 'Upload the data file, or deselect Excel upload';
      }
      if (draft.brief.dataToAnalyse.length === 0) {
        errors.dataToAnalyse = 'Select at least one type of data to analyse';
      } else if (draft.brief.dataToAnalyse.some(type => !available.includes(type))) {
        errors.dataToAnalyse = 'Some selected data is not provided by the chosen data sources';
      }
      if (!draft.brief.productSource) {
        errors.productSource = 'Select the products to consider';
      } else if (draft.brief.productSource === UPLOADED_PRODUCT_SOURCE && !draft.brief.productFile) {
        errors.productSource = 'Upload the product list';
      } else if (sourceNeedsDetail(draft.brief.productSource) && !draft.brief.productSourceDetail) {
        errors.productSource = `Select the ${draft.brief.productSource.toLowerCase()} to consider`;
      }
      if (draft.slots.length === 0) errors.slots = 'Add at least one slot';
      if (draft.media !== 'esl') {
        if (
          !Number.isInteger(draft.slotSeconds) ||
          draft.slotSeconds < MIN_SLOT_SECONDS ||
          draft.slotSeconds > MAX_SLOT_SECONDS
        ) {
          errors.slotSeconds = `Each slot must run between ${MIN_SLOT_SECONDS} and ${MAX_SLOT_SECONDS} seconds`;
        }
      }
      if (!draft.prompt.trim()) {
        errors.prompt = 'Generate the AI prompt before continuing';
      } else if (draft.prompt !== buildCampaignPrompt(draft)) {
        errors.prompt = 'The campaign changed after the prompt was generated. Regenerate the prompt before continuing';
      }
      break;
    }

    case 7: {
      // One approved product per product slot: fewer leaves slots empty, more means products that never play.
      const productSlots = draft.slots.filter(slot => isProductSlot(slot.kind)).length;
      const approved = draft.products.filter(p => p.approved).length;
      if (approved < productSlots) {
        const missing = productSlots - approved;
        errors.products = `Approve ${missing} more product${missing === 1 ? '' : 's'}: your plan has ${productSlots} product slots`;
      } else if (approved > productSlots) {
        const extra = approved - productSlots;
        errors.products = `${extra} approved product${extra === 1 ? '' : 's'} too many: your plan has ${productSlots} product slots. Add slots or unapprove products`;
      }
      break;
    }

    case 8: {
      const skus = draft.slots.map(slot => slot.productSku).filter(Boolean);
      if (new Set(skus).size < skus.length) {
        errors.duplicates = 'The same product is selected in more than one slot. Choose a different product for each slot';
      }
      const incomplete = producedSlots(draft).filter(slot => !isSlotComplete(slot));
      if (incomplete.length > 0) {
        errors.slots = `Complete every slot (${incomplete.length} remaining): product slots need a product and a design, Retail Media slots need artwork from the DAM, other slots need a headline`;
      }
      break;
    }

    case 9:
      if (!draft.contentGenerated) errors.content = 'Generate the content before continuing';
      break;
  }

  return errors;
}

function datesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Checks run before a campaign can be set to Scheduled: device availability,
 * template compatibility, scheduling conflicts and ESL update limits.
 */
export function runScheduleValidation(draft: CampaignDraft): ValidationCheck[] {
  const devices = getSelectedDevices(draft);
  const labels = getCampaignShelfLabels(draft);
  const stores = getSelectedStores(draft);
  const hasEsl = labels.length > 0;

  // 1. Device availability: the selected screens and the campaign products' shelf labels.
  const targets = [...devices.map(d => d.status), ...labels.map(l => l.status)];
  const unavailableCount = targets.filter(status => status !== 'Online').length;
  const offlineCount = targets.filter(status => status === 'Offline').length;
  const totalDevices = devices.length + labels.length;
  const what = `total ${totalDevices} devices (${devices.length} screen(s) + ${labels.length} shelf label(s))`;
  let deviceCheck: ValidationCheck;
  if (targets.length === 0) {
    deviceCheck = { id: 'devices', label: 'Device availability', status: 'fail', detail: 'No screens are selected and no shelf labels will update.' };
  } else if (unavailableCount === targets.length) {
    deviceCheck = { id: 'devices', label: 'Device availability', status: 'fail', detail: `None of the ${what} are online.` };
  } else if (unavailableCount > 0) {
    deviceCheck = {
      id: 'devices',
      label: 'Device availability',
      status: 'warning',
      detail: `${unavailableCount} unavailable out of ${what} (${offlineCount} offline, ${unavailableCount - offlineCount} in maintenance). They will receive content when they come back online.`,
    };
  } else {
    deviceCheck = { id: 'devices', label: 'Device availability', status: 'pass', detail: `All ${what} are online.` };
  }

  // 2. Template compatibility: every slot has its design, and there are formats to render it for.
  const formats = getRequiredFormats(draft);
  const incompleteSlots = producedSlots(draft).filter(slot => !isSlotComplete(slot));
  let templateCheck: ValidationCheck;
  if (formats.length === 0) {
    templateCheck = { id: 'templates', label: 'Template compatibility', status: 'fail', detail: 'No content formats to check.' };
  } else if (draft.slots.length === 0 || incompleteSlots.length > 0) {
    templateCheck = {
      id: 'templates',
      label: 'Template compatibility',
      status: 'fail',
      detail:
        draft.slots.length === 0
          ? 'The campaign has no slots.'
          : `${incompleteSlots.length} slot(s) have no product, ticket design or headline.`,
    };
  } else {
    templateCheck = {
      id: 'templates',
      label: 'Template compatibility',
      status: 'pass',
      detail: `All ${draft.slots.length} slots have a design from the ${getClientPack(draft.clientId).name} template pack, rendered for ${formats.length} format(s).`,
    };
  }

  // 3. Scheduling conflicts: an ESL label can only show one campaign, signage can share a playlist.
  const conflicts = EXISTING_SCHEDULES.map(existing => {
    if (!draft.startDate || !draft.endDate) return null;
    if (!datesOverlap(draft.startDate, draft.endDate, existing.startDate, existing.endDate)) return null;
    const sharedStoreIds = new Set(stores.filter(s => existing.regions.includes(s.region)).map(s => s.id));
    const shared =
      existing.media === 'esl'
        ? labels.filter(l => sharedStoreIds.has(l.storeId)).map(l => l.storeId)
        : devices.filter(d => d.media === 'signage' && sharedStoreIds.has(d.storeId)).map(d => d.storeId);
    if (shared.length === 0) return null;
    return { existing, deviceCount: shared.length, storeCount: new Set(shared).size };
  }).filter((c): c is NonNullable<typeof c> => c !== null);

  const eslConflicts = conflicts.filter(c => c.existing.media === 'esl');
  const describe = (list: typeof conflicts) =>
    list.map(c => `"${c.existing.name}" (${c.deviceCount} devices in ${c.storeCount} stores)`).join(', ');
  let conflictCheck: ValidationCheck;
  if (eslConflicts.length > 0) {
    conflictCheck = {
      id: 'conflicts',
      label: 'Scheduling conflicts',
      status: 'fail',
      detail: `Shelf labels in these stores are already scheduled in this period by ${describe(eslConflicts)}. Change the dates or the stores.`,
    };
  } else if (conflicts.length > 0) {
    conflictCheck = {
      id: 'conflicts',
      label: 'Scheduling conflicts',
      status: 'warning',
      detail: `Digital Signage devices overlap with ${describe(conflicts)}. Content will share the playlist.`,
    };
  } else {
    conflictCheck = { id: 'conflicts', label: 'Scheduling conflicts', status: 'pass', detail: 'No overlapping campaigns on the selected devices.' };
  }

  // 4. ESL update limits: at most four changes per day, all within store opening hours.
  let eslCheck: ValidationCheck;
  if (!hasEsl) {
    eslCheck = {
      id: 'eslLimits',
      label: 'ESL update limits',
      status: 'pass',
      detail: mediaIncludes(draft.media, 'esl')
        ? 'No shelf labels to update: none of the selected stores has an ESL label for the campaign products.'
        : 'Not applicable - this campaign does not use ESL.',
    };
  } else if (draft.changesPerDay > ESL_MAX_CHANGES_PER_DAY) {
    eslCheck = {
      id: 'eslLimits',
      label: 'ESL update limits',
      status: 'fail',
      detail: `${draft.changesPerDay} content changes per day exceeds the ESL limit of ${ESL_MAX_CHANGES_PER_DAY}.`,
    };
  } else {
    // Change times follow each store's own opening hours, so they always fall while the store is open.
    eslCheck = {
      id: 'eslLimits',
      label: 'ESL update limits',
      status: 'pass',
      detail: `${draft.changesPerDay} change(s) per day, within each store's own opening hours.`,
    };
  }

  return [deviceCheck, templateCheck, conflictCheck, eslCheck];
}
