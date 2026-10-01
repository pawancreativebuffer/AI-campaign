import { PRODUCT_BRANDS, PRODUCT_CATALOG, PRODUCT_CATEGORIES, PRODUCT_SUPPLIERS } from '../mockData';
import { UPLOADED_PRODUCT_SOURCE } from '../options';
import { formatCurrency, getStoreRanging, isProductSlot } from '../helpers';
import type { CampaignDraft, CampaignProduct, CatalogProduct } from '../types';

const RECOMMENDATION_COUNT = 8;

const CONTENT_PREFERENCE = ['Product promotion', 'Loyalty advert'];

// Categories whose demand each external factor is assumed to move.
const FACTOR_CATEGORIES: Record<string, string[]> = {
  Weather: ['Beer & Cider', 'Fresh'],
  'Public holidays': ['Spirits', 'Wine', 'Beer & Cider'],
  Seasonality: ['Fresh', 'Wine'],
  'Local events': ['Beer & Cider', 'Spirits'],
  'Time of day': ['Fresh', 'Grocery'],
};

export const CATALOG_BY_SKU = new Map<string, CatalogProduct>(PRODUCT_CATALOG.map(p => [p.sku, p]));

/**
 * The catalog as this campaign sees it: uploaded data replaces the sample figures
 * for the SKUs it covers, and an uploaded product list can set promotional prices.
 */
export function getCampaignCatalog(draft: CampaignDraft): CatalogProduct[] {
  const { brief } = draft;
  const data = brief.dataSources.includes('upload') ? brief.dataFile : null;
  const list = brief.productSource === UPLOADED_PRODUCT_SOURCE ? brief.productFile : null;
  if (!data && !list) return PRODUCT_CATALOG;

  const dataBySku = new Map((data?.rows ?? []).map(row => [row.sku, row]));
  const listBySku = new Map((list?.rows ?? []).map(row => [row.sku, row]));
  return PRODUCT_CATALOG.map(product => {
    const d = dataBySku.get(product.sku);
    const l = listBySku.get(product.sku);
    if (!d && !l) return product;
    return {
      ...product,
      weeklyUnits: d?.weeklyUnits ?? product.weeklyUnits,
      marginPct: d?.marginPct ?? product.marginPct,
      stockOnHand: d?.stockOnHand ?? product.stockOnHand,
      promoPrice: l?.promoPrice ?? product.promoPrice,
    };
  });
}

export function getCatalogProduct(sku: string, draft: CampaignDraft): CatalogProduct | undefined {
  return getCampaignCatalog(draft).find(product => product.sku === sku);
}

export function formatNumber(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function savingAmount(product: { regularPrice: number; promoPrice: number }): number {
  return product.regularPrice - product.promoPrice;
}

export function savingPct(product: { regularPrice: number; promoPrice: number }): number {
  return product.regularPrice > 0 ? Math.round((savingAmount(product) / product.regularPrice) * 100) : 0;
}

export function weeksOfCover(product: CatalogProduct): number {
  return product.weeklyUnits > 0 ? product.stockOnHand / product.weeklyUnits : 0;
}

interface ParsedRules {
  minStock: number | null;
  maxStock: number | null;
  minMargin: number | null;
  excluded: string[]; // lower-case category / brand / supplier names
  prioritised: string[];
}

function namesMentioned(text: string): string[] {
  return [...PRODUCT_CATEGORIES, ...PRODUCT_SUPPLIERS, ...PRODUCT_BRANDS]
    .map(name => name.toLowerCase())
    .filter(name => text.includes(name));
}

/** Recognises simple stock / margin thresholds, exclusions and priorities. Anything else is ignored. */
function parseRules(rules: string[]): ParsedRules {
  const parsed: ParsedRules = { minStock: null, maxStock: null, minMargin: null, excluded: [], prioritised: [] };

  for (const raw of rules) {
    const text = raw.trim().toLowerCase();
    if (!text) continue;
    const numberMatch = text.replace(/(\d),(?=\d{3})/g, '$1').match(/\d+(\.\d+)?/);
    const value = numberMatch ? Number(numberMatch[0]) : null;
    const isExclude = /\b(exclude|excluding|no|not|without|avoid|skip)\b/.test(text);
    const isAbove = /\b(more than|over|above|greater than|exceed\w*)\b/.test(text);

    if (value !== null && /\bmargin\b/.test(text)) {
      parsed.minMargin = Math.max(parsed.minMargin ?? 0, value);
    } else if (value !== null && /\b(stock|units|inventory)\b/.test(text)) {
      if (isExclude && isAbove) parsed.maxStock = Math.min(parsed.maxStock ?? Infinity, value);
      else parsed.minStock = Math.max(parsed.minStock ?? 0, value);
    } else if (isExclude) {
      parsed.excluded.push(...namesMentioned(text));
    } else if (/\b(prioriti[sz]e|priority|focus|feature|favour|favor|prefer)\b/.test(text)) {
      parsed.prioritised.push(...namesMentioned(text));
    }
  }

  return parsed;
}

function matchesNames(product: CatalogProduct, names: string[]): boolean {
  if (names.length === 0) return false;
  return [product.category, product.supplier, product.brand].some(v => names.includes(v.toLowerCase()));
}

function relevantFactors(product: CatalogProduct, factors: string[]): string[] {
  return factors.filter(factor => (FACTOR_CATEGORIES[factor] ?? []).includes(product.category));
}

function pickContentType(draft: CampaignDraft): string {
  const selected = draft.brief.contentRequired;
  return CONTENT_PREFERENCE.find(type => selected.includes(type)) ?? 'Product promotion';
}

function candidateProducts(draft: CampaignDraft): CatalogProduct[] {
  const { productSource, productSourceDetail, additionalRules } = draft.brief;
  const rules = parseRules(additionalRules);
  const uploaded =
    productSource === UPLOADED_PRODUCT_SOURCE ? new Set((draft.brief.productFile?.rows ?? []).map(row => row.sku)) : null;

  return getCampaignCatalog(draft).filter(product => {
    if (uploaded && !uploaded.has(product.sku)) return false;
    // Never recommend a product that none of the campaign's stores sell.
    if (draft.storeIds.length > 0 && getStoreRanging(product.sku, draft).sold.length === 0) return false;
    if (productSource === 'Category' && product.category !== productSourceDetail) return false;
    if (productSource === 'Supplier' && product.supplier !== productSourceDetail) return false;
    if (productSource === 'Brand' && product.brand !== productSourceDetail) return false;
    if (rules.minStock !== null && product.stockOnHand < rules.minStock) return false;
    if (rules.maxStock !== null && product.stockOnHand > rules.maxStock) return false;
    if (rules.minMargin !== null && product.marginPct < rules.minMargin) return false;
    return !matchesNames(product, rules.excluded);
  });
}

/** The supplier a "Supplier campaign" is built around: the chosen one, else the biggest seller. */
function focusSupplier(draft: CampaignDraft, candidates: CatalogProduct[]): string {
  if (draft.brief.productSource === 'Supplier' && draft.brief.productSourceDetail) {
    return draft.brief.productSourceDetail;
  }
  const totals = new Map<string, number>();
  for (const product of candidates) {
    totals.set(product.supplier, (totals.get(product.supplier) ?? 0) + product.weeklyUnits);
  }
  let best = '';
  let bestUnits = -1;
  for (const [supplier, units] of totals) {
    if (units > bestUnits || (units === bestUnits && supplier < best)) {
      best = supplier;
      bestUnits = units;
    }
  }
  return best;
}

function objectiveScore(product: CatalogProduct, objective: string, supplier: string): number {
  switch (objective) {
    case 'Margin':
      return product.marginPct;
    case 'Stock reduction':
      return weeksOfCover(product);
    case 'Product launch':
      return (product.isNew ? 1000000 : 0) + product.weeklyUnits;
    case 'Loyalty':
      return product.loyaltyIndex;
    case 'Supplier campaign':
      return (product.supplier === supplier ? 1000000 : 0) + product.weeklyUnits;
    default:
      return product.weeklyUnits;
  }
}

function leadReason(
  product: CatalogProduct,
  draft: CampaignDraft,
  supplier: string,
  eligibleStores: number,
): { text: string; used: string[] } {
  const units = formatNumber(product.weeklyUnits);
  const cover = weeksOfCover(product).toFixed(1);
  const saving = `${savingPct(product)}% (${formatCurrency(savingAmount(product))})`;

  switch (draft.objective) {
    case 'Margin':
      return {
        text: `Keeps a ${product.marginPct}% margin at the promotional price of ${formatCurrency(product.promoPrice)}, which supports the Margin objective.`,
        used: ['Margin'],
      };
    case 'Stock reduction':
      return {
        text: `${formatNumber(product.stockOnHand)} units on hand is ${cover} weeks of cover at ${units} units a week, so a ${saving} saving helps clear stock.`,
        used: ['Stock', 'Sales', 'Promotions'],
      };
    case 'Product launch':
      return product.isNew
        ? {
            text: `New line from ${product.brand}, ranged in ${eligibleStores} of ${draft.storeIds.length} selected stores and already selling ${units} units a week.`,
            used: ['Sales', 'Regional demand'],
          }
        : {
            text: `Established ${product.category} line selling ${units} units a week, included to draw shoppers to the launch range.`,
            used: ['Sales'],
          };
    case 'Loyalty':
      return {
        text: `Loyalty index of ${product.loyaltyIndex}/100 shows it over-indexes with loyalty members, which supports the Loyalty objective.`,
        used: ['Loyalty'],
      };
    case 'Supplier campaign':
      return product.supplier === supplier
        ? {
            text: `Part of the ${supplier} range, the focus supplier for this campaign, selling ${units} units a week.`,
            used: ['Sales'],
          }
        : {
            text: `Supporting line from ${product.supplier} selling ${units} units a week, added to fill out the supplier campaign.`,
            used: ['Sales'],
          };
    default:
      return {
        text: `Sells ${units} units a week, so a ${saving} saving gives a strong sales uplift.`,
        used: ['Sales', 'Promotions'],
      };
  }
}

function dataClause(source: string, product: CatalogProduct, draft: CampaignDraft, eligibleStores: number): string {
  switch (source) {
    case 'Sales':
      return `sales of ${formatNumber(product.weeklyUnits)} units a week`;
    case 'Margin':
      return `${product.marginPct}% margin`;
    case 'Stock':
      return `${formatNumber(product.stockOnHand)} units in stock (${weeksOfCover(product).toFixed(1)} weeks of cover)`;
    case 'Promotions':
      return `a promotional saving of ${savingPct(product)}%`;
    case 'Basket relationships': {
      const related = PRODUCT_CATALOG.filter(p => p.category === product.category && p.sku !== product.sku).length;
      return `basket links with ${related} other ${product.category} lines`;
    }
    case 'Loyalty':
      return `a loyalty index of ${product.loyaltyIndex}/100`;
    case 'Regional demand':
      return `ranging in ${eligibleStores} of ${draft.storeIds.length} selected stores`;
    default:
      return '';
  }
}

function factorSentence(factor: string, product: CatalogProduct, draft: CampaignDraft): string {
  switch (factor) {
    case 'Weather':
      return `${product.category} demand moves with the weather, so the forecast was taken into account.`;
    case 'Public holidays':
      return `Public holidays in the campaign period typically lift ${product.category} demand.`;
    case 'Seasonality':
      return `Seasonal demand for ${product.category} was taken into account.`;
    case 'Local events':
      return `Local events near the selected stores typically lift ${product.category} demand.`;
    case 'Time of day': {
      return draft.changesPerDay > 1
        ? `Suits time-of-day scheduling across the ${draft.changesPerDay} daily content changes.`
        : `${product.category} demand varies by time of day, which was taken into account.`;
    }
    default:
      return '';
  }
}

function buildReason(product: CatalogProduct, draft: CampaignDraft, supplier: string, eligibleStores: number): string {
  const lead = leadReason(product, draft, supplier, eligibleStores);
  const parts = [lead.text];

  const supporting = draft.brief.dataToAnalyse
    .filter(source => !lead.used.includes(source))
    .map(source => dataClause(source, product, draft, eligibleStores))
    .filter(Boolean)
    .slice(0, 2);
  if (supporting.length > 0) parts.push(`Also considered: ${supporting.join(' and ')}.`);

  const factor = relevantFactors(product, draft.brief.externalFactors)[0];
  if (factor) parts.push(factorSentence(factor, product, draft));

  return parts.join(' ');
}

function toCampaignProduct(product: CatalogProduct, draft: CampaignDraft, supplier: string): CampaignProduct {
  const eligibleStores = getStoreRanging(product.sku, draft).sold.length;
  return {
    sku: product.sku,
    description: product.description,
    size: product.size,
    category: product.category,
    supplier: product.supplier,
    brand: product.brand,
    regularPrice: product.regularPrice,
    promoPrice: product.promoPrice,
    marginPct: product.marginPct,
    stockOnHand: product.stockOnHand,
    eligibleStores,
    reason: buildReason(product, draft, supplier, eligibleStores),
    contentType: pickContentType(draft),
    approved: false,
    source: 'ai',
  };
}

/** One recommendation per product slot, so approving them all fills the plan exactly. */
function productSlotCount(draft: CampaignDraft): number {
  const slots = draft.slots.filter(slot => isProductSlot(slot.kind)).length;
  return slots > 0 ? slots : RECOMMENDATION_COUNT;
}

/**
 * Deterministic stand-in for the AI recommendation: ranks the catalog by the brief.
 * `excludeSkus` lets the screen keep manually added products out of the AI picks.
 */
export function recommendProducts(draft: CampaignDraft, excludeSkus: string[] = []): CampaignProduct[] {
  if (draft.brief.productSource === 'User-selected products') return [];

  const rules = parseRules(draft.brief.additionalRules);
  const candidates = candidateProducts(draft).filter(p => !excludeSkus.includes(p.sku));
  const supplier = draft.objective === 'Supplier campaign' ? focusSupplier(draft, candidates) : '';
  const uploadedList = draft.brief.productSource === UPLOADED_PRODUCT_SOURCE ? draft.brief.productFile : null;

  return candidates
    .map(product => {
      const boost =
        1 +
        0.05 * relevantFactors(product, draft.brief.externalFactors).length +
        (matchesNames(product, rules.prioritised) ? 0.25 : 0);
      return { product, score: objectiveScore(product, draft.objective, supplier) * boost };
    })
    .sort((a, b) => b.score - a.score || a.product.sku.localeCompare(b.product.sku))
    .slice(0, uploadedList ? undefined : productSlotCount(draft))
    .map(({ product }) => {
      const recommended = toCampaignProduct(product, draft, supplier);
      return uploadedList
        ? { ...recommended, reason: `${recommended.reason} Included from your uploaded list "${uploadedList.fileName}".` }
        : recommended;
    });
}

/** A product the user picked themselves, either added manually or chosen as a replacement. */
export function createUserProduct(product: CatalogProduct, draft: CampaignDraft, replacedSku?: string): CampaignProduct {
  const base = toCampaignProduct(product, draft, '');
  const data = ['Sales', 'Margin', 'Stock']
    .map(source => dataClause(source, product, draft, base.eligibleStores))
    .join(', ');
  return {
    ...base,
    reason: replacedSku
      ? `Chosen by user to replace SKU ${replacedSku}. Current data: ${data}.`
      : 'Manually added by user.',
    approved: true,
    source: 'manual',
  };
}
