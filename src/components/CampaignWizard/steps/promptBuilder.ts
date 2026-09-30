import { REGIONS, STORES, STORE_FORMATS } from '../mockData';
import { DATA_SOURCES, ESL_MAX_CHANGES_PER_DAY, UPLOADED_PRODUCT_SOURCE } from '../options';
import {
  formatDateTime,
  formatTime12,
  getChangeTimes,
  getRequiredFormats,
  getSelectedDevices,
  getSelectedStores,
  mediaLabel,
  unique,
} from '../helpers';
import type { CampaignBrief, CampaignDraft } from '../types';

const DETAIL_SOURCES = ['Category', 'Supplier', 'Brand'];

const OBJECTIVE_GUIDANCE: Record<string, string> = {
  Sales: 'Prioritise products with the highest weekly unit sales and the strongest expected promotional uplift.',
  Margin: 'Prioritise products that keep the highest margin at the promotional price.',
  'Stock reduction': 'Prioritise products with the most weeks of stock cover so excess stock is cleared.',
  'Product launch': 'Lead with new products and support them with established lines that build awareness.',
  Loyalty: 'Prioritise products that over-index with loyalty members.',
  'Supplier campaign': 'Build the campaign around the focus supplier and its strongest promotional lines.',
};

export function sourceNeedsDetail(productSource: string): boolean {
  return DETAIL_SOURCES.includes(productSource);
}

export function cleanRules(rules: string[]): string[] {
  return rules.map(rule => rule.trim()).filter(Boolean);
}

export function describeProductSource(brief: CampaignBrief): string {
  if (!brief.productSource) return 'Not specified';
  if (sourceNeedsDetail(brief.productSource)) {
    return `${brief.productSource}: ${brief.productSourceDetail || 'not specified'}`;
  }
  if (brief.productSource === UPLOADED_PRODUCT_SOURCE) {
    return brief.productFile
      ? `Uploaded product list "${brief.productFile.fileName}" (${plural(brief.productFile.rows.length, 'product')}); rank these and do not add others`
      : 'Uploaded product list (no file uploaded)';
  }
  if (brief.productSource === 'User-selected products') {
    return 'User-selected products only (do not recommend additional products)';
  }
  return 'AI recommendations across the full product range';
}

/** e.g. 'Ticket-IT POS, Excel upload "sales.xlsx" (12 SKUs)' */
export function describeDataSources(brief: CampaignBrief): string {
  const names = DATA_SOURCES.filter(source => brief.dataSources.includes(source.value)).map(source => {
    if (source.value !== 'upload') return source.label;
    return brief.dataFile
      ? `${source.label} "${brief.dataFile.fileName}" (${plural(brief.dataFile.rows.length, 'SKU')})`
      : `${source.label} (no file uploaded)`;
  });
  return names.length > 0 ? names.join(', ') : 'Not specified';
}

function listOrNone(values: string[], none = 'None selected'): string {
  return values.length > 0 ? values.join(', ') : none;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** Builds the complete AI prompt from the guided brief and the campaign setup. Pure and deterministic. */
export function buildCampaignPrompt(draft: CampaignDraft): string {
  const { brief } = draft;
  const stores = getSelectedStores(draft);
  const devices = getSelectedDevices(draft);
  const formats = getRequiredFormats(draft);
  const changeTimes = getChangeTimes(draft);
  const rules = cleanRules(brief.additionalRules);

  const regions = REGIONS.filter(region => stores.some(s => s.region === region));
  const storeFormats = STORE_FORMATS.filter(format => stores.some(s => s.format === format));
  const otherFormats = unique(stores.map(s => s.format)).filter(f => !STORE_FORMATS.includes(f));

  const signage = devices.filter(d => d.media === 'signage');
  const esl = devices.filter(d => d.media === 'esl');
  const eslLabels = esl.reduce((sum, d) => sum + d.labelCount, 0);
  const hasEsl = esl.length > 0 || draft.media === 'esl' || draft.media === 'both';

  const lines: string[] = [];
  const section = (title: string) => {
    if (lines.length > 0) lines.push('');
    lines.push(title);
  };

  lines.push(
    'You are the Ticket-IT retail content intelligence assistant. Analyse the retailer data described below, recommend the products to promote and propose the content for every device format in this campaign.',
  );

  section('CAMPAIGN');
  lines.push(`- Name: ${draft.name.trim() || 'Untitled campaign'}`);
  lines.push(`- Objective: ${draft.objective || 'Not specified'}`);
  if (draft.description.trim()) lines.push(`- Description: ${draft.description.trim()}`);

  section('SCHEDULE');
  lines.push(`- Starts: ${formatDateTime(draft.startDate, draft.startTime) || 'Not set'}`);
  lines.push(`- Finishes: ${formatDateTime(draft.endDate, draft.endTime) || 'Not set'}`);
  lines.push(`- Active days: ${listOrNone(draft.activeDays)}`);
  lines.push(`- Store opening hours: ${formatTime12(draft.openingTime) || '-'} to ${formatTime12(draft.closingTime) || '-'}`);
  lines.push(
    `- Content changes per day: ${draft.changesPerDay}${
      changeTimes.length > 0 ? ` (at ${changeTimes.map(formatTime12).join(', ')})` : ''
    }`,
  );

  section('STORES');
  lines.push(`- ${stores.length} of ${STORES.length} stores selected`);
  lines.push(`- Regions covered (${regions.length} of ${REGIONS.length}): ${listOrNone(regions)}`);
  lines.push(`- Store formats covered: ${listOrNone([...storeFormats, ...otherFormats])}`);

  section('MEDIA');
  lines.push(`- ${mediaLabel(draft.media)}`);

  section('DEVICES');
  lines.push(`- ${plural(devices.length, 'device')} selected`);
  if (signage.length > 0) lines.push(`- Digital Signage: ${plural(signage.length, 'screen')}`);
  if (esl.length > 0) {
    lines.push(`- ESL: ${plural(esl.length, 'label group')} (${plural(eslLabels, 'label')})`);
  }
  lines.push(`- Distinct formats requiring their own content (${formats.length}):`);
  if (formats.length === 0) lines.push('  - None');
  for (const format of formats) {
    lines.push(
      `  - ${format.media === 'signage' ? 'Digital Signage' : 'ESL'} ${format.label} (${plural(format.deviceCount, 'device')})`,
    );
  }

  section('CONSTRAINTS');
  lines.push('- Only schedule content changes within store opening hours.');
  if (signage.length > 0 || draft.media === 'signage' || draft.media === 'both') {
    lines.push('- Digital Signage content may be static or animated.');
  }
  if (hasEsl) {
    lines.push('- ESL content must be static.');
    lines.push(`- ESL devices allow no more than ${ESL_MAX_CHANGES_PER_DAY} content changes per day.`);
  }
  lines.push('- Produce separate content for every distinct format listed above.');

  section('CAMPAIGN BRIEF');
  lines.push(`1. Campaign objective: ${draft.objective || 'Not specified'}`);
  lines.push(`2. Data to analyse: ${listOrNone(brief.dataToAnalyse)}`);
  lines.push(`   Data source: ${describeDataSources(brief)}`);
  lines.push(`3. Products to consider: ${describeProductSource(brief)}`);
  lines.push(`4. External factors: ${listOrNone(brief.externalFactors, 'None')}`);
  lines.push(`5. Content required: ${listOrNone(brief.contentRequired)}`);
  lines.push(`6. Additional rules:${rules.length === 0 ? ' None' : ''}`);
  for (const rule of rules) lines.push(`   - ${rule}`);

  section('TASK');
  const guidance = OBJECTIVE_GUIDANCE[draft.objective];
  if (guidance) lines.push(`- ${guidance}`);
  lines.push('- Use only the data sources listed under "Data to analyse" and take the listed external factors into account.');
  lines.push('- Apply every additional rule. Do not recommend a product that breaks one.');
  lines.push(
    '- For each recommended product return: SKU and description, regular and promotional price, saving, margin, stock availability, eligible stores, the reason for the recommendation and the proposed content type.',
  );
  lines.push('- Propose only the content types listed under "Content required".');

  return lines.join('\n');
}
