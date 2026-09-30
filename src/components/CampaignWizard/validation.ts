import { EXISTING_SCHEDULES } from './mockData';
import { ESL_MAX_CHANGES_PER_DAY, UPLOADED_PRODUCT_SOURCE } from './options';
import {
  TEMPLATE_BY_ID,
  getAvailableDataTypes,
  getChangeTimes,
  getRequiredFormats,
  getSelectedDevices,
  getSelectedStores,
  isTemplateCompatible,
  mediaIncludes,
  timeToMinutes,
} from './helpers';
import { buildCampaignPrompt, sourceNeedsDetail } from './steps/promptBuilder';
import type { CampaignDraft, StepErrors, ValidationCheck } from './types';

const ESL_LIMIT_MESSAGE = `ESL campaigns allow no more than ${ESL_MAX_CHANGES_PER_DAY} content changes per day. Reduce the content-change frequency on the Schedule step.`;

/**
 * Switched off so the flow can be clicked through while testing.
 * Set to true to enforce the per-step rules and block scheduling on failed checks again.
 */
export const VALIDATION_ENABLED = true;

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
      if (!draft.openingTime || !draft.closingTime) {
        errors.openingHours = 'Store opening hours are required';
      } else if (timeToMinutes(draft.closingTime) <= timeToMinutes(draft.openingTime)) {
        errors.openingHours = 'Closing time must be after opening time';
      }
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
      const devices = getSelectedDevices(draft);
      if (devices.length === 0) {
        errors.deviceIds = 'Select at least one device';
      } else if (draft.media === 'both') {
        if (!devices.some(d => d.media === 'signage')) errors.deviceIds = 'Select at least one Digital Signage device';
        else if (!devices.some(d => d.media === 'esl')) errors.deviceIds = 'Select at least one ESL device';
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
      if (draft.brief.contentRequired.length === 0) errors.contentRequired = 'Select at least one content type';
      if (!draft.prompt.trim()) {
        errors.prompt = 'Generate the AI prompt before continuing';
      } else if (draft.prompt !== buildCampaignPrompt(draft)) {
        errors.prompt = 'The campaign changed after the prompt was generated. Regenerate the prompt before continuing';
      }
      break;
    }

    case 7:
      if (!draft.products.some(p => p.approved)) errors.products = 'Approve at least one product';
      break;

    case 8: {
      const missing = getRequiredFormats(draft).filter(f => !draft.templateSelections[f.key]);
      if (missing.length > 0) {
        errors.templates = `Select a template for every format (${missing.length} remaining)`;
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
  const stores = getSelectedStores(draft);
  const hasEsl = devices.some(d => d.media === 'esl');

  // 1. Device availability
  const unavailable = devices.filter(d => d.status !== 'Online');
  let deviceCheck: ValidationCheck;
  if (devices.length === 0) {
    deviceCheck = { id: 'devices', label: 'Device availability', status: 'fail', detail: 'No devices are selected.' };
  } else if (unavailable.length === devices.length) {
    deviceCheck = { id: 'devices', label: 'Device availability', status: 'fail', detail: 'None of the selected devices are online.' };
  } else if (unavailable.length > 0) {
    const offline = unavailable.filter(d => d.status === 'Offline').length;
    const maintenance = unavailable.length - offline;
    deviceCheck = {
      id: 'devices',
      label: 'Device availability',
      status: 'warning',
      detail: `${unavailable.length} of ${devices.length} selected devices are unavailable (${offline} offline, ${maintenance} in maintenance). They will receive content when they come back online.`,
    };
  } else {
    deviceCheck = { id: 'devices', label: 'Device availability', status: 'pass', detail: `All ${devices.length} selected devices are online.` };
  }

  // 2. Template compatibility
  const formats = getRequiredFormats(draft);
  const badFormats = formats.filter(format => {
    const template = TEMPLATE_BY_ID.get(draft.templateSelections[format.key] ?? '');
    return !template || !isTemplateCompatible(template, format);
  });
  const templateCheck: ValidationCheck =
    badFormats.length > 0
      ? {
          id: 'templates',
          label: 'Template compatibility',
          status: 'fail',
          detail: `${badFormats.length} format(s) have no compatible template: ${badFormats.map(f => f.label).join(', ')}.`,
        }
      : {
          id: 'templates',
          label: 'Template compatibility',
          status: formats.length === 0 ? 'fail' : 'pass',
          detail: formats.length === 0 ? 'No content formats to check.' : `All ${formats.length} format(s) have a compatible template.`,
        };

  // 3. Scheduling conflicts: an ESL label can only show one campaign, signage can share a playlist.
  const conflicts = EXISTING_SCHEDULES.map(existing => {
    if (!draft.startDate || !draft.endDate) return null;
    if (!datesOverlap(draft.startDate, draft.endDate, existing.startDate, existing.endDate)) return null;
    const sharedStoreIds = new Set(stores.filter(s => existing.regions.includes(s.region)).map(s => s.id));
    const sharedDevices = devices.filter(d => d.media === existing.media && sharedStoreIds.has(d.storeId));
    if (sharedDevices.length === 0) return null;
    return { existing, deviceCount: sharedDevices.length, storeCount: new Set(sharedDevices.map(d => d.storeId)).size };
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
      detail: `ESL devices are already scheduled in this period by ${describe(eslConflicts)}. Change the dates or remove those devices.`,
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
    eslCheck = { id: 'eslLimits', label: 'ESL update limits', status: 'pass', detail: 'Not applicable - no ESL devices in this campaign.' };
  } else if (draft.changesPerDay > ESL_MAX_CHANGES_PER_DAY) {
    eslCheck = {
      id: 'eslLimits',
      label: 'ESL update limits',
      status: 'fail',
      detail: `${draft.changesPerDay} content changes per day exceeds the ESL limit of ${ESL_MAX_CHANGES_PER_DAY}.`,
    };
  } else {
    const changeMinutes = getChangeTimes(draft).map(timeToMinutes);
    const eslStoreIds = new Set(devices.filter(d => d.media === 'esl').map(d => d.storeId));
    const outsideHours = stores.filter(
      s =>
        eslStoreIds.has(s.id) &&
        changeMinutes.some(t => t < timeToMinutes(s.openingTime) || t >= timeToMinutes(s.closingTime)),
    );
    eslCheck =
      outsideHours.length > 0
        ? {
            id: 'eslLimits',
            label: 'ESL update limits',
            status: 'warning',
            detail: `${draft.changesPerDay} change(s) per day is within the limit, but ${outsideHours.length} store(s) are closed at one or more change times. Those updates will apply when the store opens.`,
          }
        : {
            id: 'eslLimits',
            label: 'ESL update limits',
            status: 'pass',
            detail: `${draft.changesPerDay} change(s) per day, all within store opening hours.`,
          };
  }

  return [deviceCheck, templateCheck, conflictCheck, eslCheck];
}
