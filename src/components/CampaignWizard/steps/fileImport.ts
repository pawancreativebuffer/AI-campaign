import { PRODUCT_CATALOG } from '../mockData';
import type { UploadedData, UploadedDataRow, UploadedProductList, UploadedProductRow } from '../types';

// Reads the Excel / CSV files a user uploads on the Campaign Brief step.

type Cell = string | number | boolean | Date | null | undefined;

const SKU_HEADERS = ['sku', 'skucode', 'productcode', 'itemcode', 'code', 'item'];
const UNITS_HEADERS = ['weeklyunits', 'weeklysales', 'unitsperweek', 'salesunits', 'sales', 'units'];
const MARGIN_HEADERS = ['margin', 'marginpct', 'marginpercent', 'gp', 'gppct'];
const STOCK_HEADERS = ['stockonhand', 'stock', 'soh', 'inventory', 'onhand'];
const PROMO_HEADERS = ['promoprice', 'promotionalprice', 'offerprice', 'specialprice', 'promo', 'price'];

const CATALOG_SKUS = new Set(PRODUCT_CATALOG.map(p => p.sku));

const normalise = (value: Cell) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = [',', ';', '\t'].reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ',');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

async function readRows(file: File): Promise<Cell[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseCsv(await file.text());
  if (name.endsWith('.xlsx')) {
    const { readSheet } = await import('read-excel-file/universal');
    try {
      return (await readSheet(file)) as Cell[][];
    } catch {
      throw new Error('The Excel file could not be read. Check that it is a valid .xlsx file.');
    }
  }
  throw new Error('Upload an Excel (.xlsx) or CSV (.csv) file.');
}

function toNumber(value: Cell): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/[$,%\s]/g, '');
  if (cleaned === '') return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Splits the sheet into a header row and body rows, skipping blank rows. */
function toTable(rows: Cell[][]) {
  const filled = rows.filter(row => row.some(cell => String(cell ?? '').trim() !== ''));
  if (filled.length < 2) throw new Error('The file needs a header row and at least one row of data.');
  const headers = filled[0].map(normalise);
  const column = (aliases: string[]) => {
    for (const alias of aliases) {
      const index = headers.indexOf(alias);
      if (index >= 0) return index;
    }
    return -1;
  };
  return { body: filled.slice(1), column };
}

const readSku = (row: Cell[], index: number) => String(row[index] ?? '').trim();

const NO_MATCH = 'None of the SKUs in the file match the product catalog.';

/** Supplemental retail data: a SKU column plus any of weekly units, margin and stock. */
export async function parseDataFile(file: File): Promise<UploadedData> {
  const { body, column } = toTable(await readRows(file));
  const skuCol = column(SKU_HEADERS);
  const unitsCol = column(UNITS_HEADERS);
  const marginCol = column(MARGIN_HEADERS);
  const stockCol = column(STOCK_HEADERS);
  if (skuCol < 0 || (unitsCol < 0 && marginCol < 0 && stockCol < 0)) {
    throw new Error('The file needs a SKU column and at least one of: Weekly units, Margin, Stock on hand.');
  }

  const bySku = new Map<string, UploadedDataRow>();
  const unmatched = new Set<string>();
  for (const row of body) {
    const sku = readSku(row, skuCol);
    if (!sku) continue;
    if (!CATALOG_SKUS.has(sku)) {
      unmatched.add(sku);
      continue;
    }
    bySku.set(sku, {
      sku,
      weeklyUnits: unitsCol >= 0 ? toNumber(row[unitsCol]) : undefined,
      marginPct: marginCol >= 0 ? toNumber(row[marginCol]) : undefined,
      stockOnHand: stockCol >= 0 ? toNumber(row[stockCol]) : undefined,
    });
  }
  if (bySku.size === 0) throw new Error(NO_MATCH);

  const provides: string[] = [];
  if (unitsCol >= 0) provides.push('Sales');
  if (marginCol >= 0) provides.push('Margin');
  if (stockCol >= 0) provides.push('Stock');

  return { fileName: file.name, rows: Array.from(bySku.values()), provides, unmatched: Array.from(unmatched) };
}

/** A product list: a SKU column and optionally a promotional price. */
export async function parseProductFile(file: File): Promise<UploadedProductList> {
  const { body, column } = toTable(await readRows(file));
  const skuCol = column(SKU_HEADERS);
  const promoCol = column(PROMO_HEADERS);
  if (skuCol < 0) throw new Error('The file needs a SKU column.');

  const bySku = new Map<string, UploadedProductRow>();
  const unmatched = new Set<string>();
  for (const row of body) {
    const sku = readSku(row, skuCol);
    if (!sku) continue;
    if (!CATALOG_SKUS.has(sku)) {
      unmatched.add(sku);
      continue;
    }
    const promoPrice = promoCol >= 0 ? toNumber(row[promoCol]) : undefined;
    bySku.set(sku, { sku, promoPrice: promoPrice !== undefined && promoPrice > 0 ? promoPrice : undefined });
  }
  if (bySku.size === 0) throw new Error(NO_MATCH);

  return { fileName: file.name, rows: Array.from(bySku.values()), unmatched: Array.from(unmatched) };
}

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (rows: (string | number)[][]) => rows.map(row => row.map(csvCell).join(',')).join('\r\n');

export function sampleDataCsv(): string {
  return toCsv([
    ['SKU', 'Description', 'Weekly units', 'Margin %', 'Stock on hand'],
    ...PRODUCT_CATALOG.slice(0, 12).map(p => [p.sku, p.description, p.weeklyUnits, p.marginPct, p.stockOnHand]),
  ]);
}

export function sampleProductCsv(): string {
  return toCsv([
    ['SKU', 'Description', 'Promo price'],
    ...PRODUCT_CATALOG.filter((_, i) => i % 3 === 0).map(p => [p.sku, p.description, p.promoPrice.toFixed(2)]),
  ]);
}

export function downloadCsv(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
