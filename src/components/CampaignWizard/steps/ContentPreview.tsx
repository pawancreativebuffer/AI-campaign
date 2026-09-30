import React from 'react';
import css from './ContentPreview.module.css';
import { formatCurrency } from '../helpers';
import type { CampaignProduct, ContentFormat, Template } from '../types';

export type PreviewSize = 'thumb' | 'large';

interface ContentPreviewProps {
  template: Template;
  format: ContentFormat;
  /** Omit to render the template with sample placeholder content. */
  product?: CampaignProduct;
  size?: PreviewSize;
}

type PreviewContent = Pick<
  CampaignProduct,
  'sku' | 'description' | 'size' | 'brand' | 'regularPrice' | 'promoPrice' | 'contentType'
>;

const SAMPLE: PreviewContent = {
  sku: '000000',
  description: 'Product name',
  size: 'Size',
  brand: 'Brand name',
  regularPrice: 12.99,
  promoPrice: 9.99,
  contentType: 'Sample content',
};

// Largest box a signage creative may occupy; the format's aspect ratio is fitted inside it.
const SIGNAGE_BOUNDS: Record<PreviewSize, { w: number; h: number }> = {
  thumb: { w: 190, h: 124 },
  large: { w: 340, h: 300 },
};

// Label boxes at 'large' size. Proportions follow the real panels; sizes are relative, not to scale.
const ESL_BOXES: Record<string, { w: number; h: number }> = {
  '1.54"': { w: 124, h: 124 },
  '2.13"': { w: 196, h: 96 },
  '2.9"': { w: 236, h: 104 },
  '4.2"': { w: 272, h: 204 },
  '7.5"': { w: 340, h: 212 },
};
const ESL_FALLBACK_BOX = ESL_BOXES['2.9"'];
const ESL_SCALE: Record<PreviewSize, number> = { thumb: 0.6, large: 1 };

const SIGNAGE_BEZEL = 3;
const ESL_BEZEL = 5;

const INK = '#111111';
const PAPER = '#ffffff';
const RED = '#cc0000';
const YELLOW = '#ffd800';

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
  const n = parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function textOn(hex: string): string {
  const [r, g, b] = parseHex(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? INK : PAPER;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function signageBox(format: ContentFormat, size: PreviewSize): { w: number; h: number } {
  const [rw, rh] = format.resolution.split('x').map(Number);
  const fallback = format.orientation === 'Portrait' ? [1080, 1920] : [1920, 1080];
  const w = rw > 0 && rh > 0 ? rw : fallback[0];
  const h = rw > 0 && rh > 0 ? rh : fallback[1];
  const bounds = SIGNAGE_BOUNDS[size];
  const scale = Math.min(bounds.w / w, bounds.h / h);
  return { w: round(w * scale), h: round(h * scale) };
}

/** E-paper can only show the inks the label has: BW, BW + red, or BW + red + yellow. */
function eslPalette(template: Template, colour: string) {
  const hasRed = colour.includes('R');
  const hasYellow = colour.includes('Y');
  const [r, g, b] = parseHex(template.accent);
  const wantsYellow = r > 180 && g > 160 && b < 110;
  const wantsRed = r > 150 && g < 90 && b < 90;

  let bandBg = INK;
  let bandFg = PAPER;
  if (wantsYellow && hasYellow) {
    bandBg = YELLOW;
    bandFg = RED;
  } else if ((wantsRed || wantsYellow) && hasRed) {
    bandBg = RED;
  }

  let tagBg = INK;
  let tagFg = PAPER;
  if (hasYellow) {
    tagBg = YELLOW;
    tagFg = RED;
  } else if (hasRed) {
    tagBg = RED;
  }

  return { bandBg, bandFg, tagBg, tagFg, priceFg: wantsRed && hasRed ? RED : INK };
}

const Price = ({ value, className }: { value: number; className: string }) => {
  const [dollars, cents] = value.toFixed(2).split('.');
  return (
    <span className={`${css.price} ${className}`}>
      <span className={css.priceSmall}>$</span>
      {dollars}
      <span className={css.priceSmall}>.{cents}</span>
    </span>
  );
};

const ContentPreview: React.FC<ContentPreviewProps> = ({ template, format, product, size = 'thumb' }) => {
  const content: PreviewContent = product ?? SAMPLE;
  const saving = content.regularPrice - content.promoPrice;
  const hasSaving = saving > 0.004;
  const isEsl = format.media === 'esl';
  // ESL content is always static, whatever the template says.
  const animated = !isEsl && template.kind === 'Animated';
  const label = `${template.name}: ${product ? `${content.description} ${content.size}` : 'sample content'} (${format.label})`;

  const name = (
    <>
      {content.description} <span className={css.size}>{content.size}</span>
    </>
  );
  const savingRow = hasSaving && (
    <>
      <span className={css.saveTag}>SAVE {formatCurrency(saving)}</span>
      <span className={css.was}>Was {formatCurrency(content.regularPrice)}</span>
    </>
  );

  if (isEsl) {
    const base = ESL_BOXES[format.eslSize] ?? ESL_FALLBACK_BOX;
    const scale = ESL_SCALE[size];
    const w = round(base.w * scale);
    const h = round(base.h * scale);
    const stacked = base.w / base.h < 1.7;
    const compact = base.w === base.h;
    const palette = eslPalette(template, format.eslColour);
    const style = {
      width: w,
      height: h,
      '--u': `${round((Math.min(w, h) - ESL_BEZEL * 2) / 12)}px`,
      '--band-bg': palette.bandBg,
      '--band-fg': palette.bandFg,
      '--tag-bg': palette.tagBg,
      '--tag-fg': palette.tagFg,
      '--price-fg': palette.priceFg,
    } as React.CSSProperties;

    return (
      <div className={`${css.root} ${css.frameEsl}`} style={style} role="img" aria-label={label}>
        <div className={`${css.screen} ${css.esl} ${stacked ? css.eslStacked : ''}`}>
          <div className={css.eslBand}>
            <span>Special</span>
            {!compact && <span className={css.eslSku}>SKU {content.sku}</span>}
          </div>
          <div className={css.eslBody}>
            <div className={css.eslName}>{name}</div>
            <Price value={content.promoPrice} className={css.eslPrice} />
          </div>
          <div className={css.eslFoot}>
            {hasSaving && (
              <>
                <span className={css.eslTag}>SAVE {formatCurrency(saving)}</span>
                <span>Was {formatCurrency(content.regularPrice)}</span>
              </>
            )}
            {!compact && <span className={css.eslBarcode}></span>}
          </div>
        </div>
      </div>
    );
  }

  const { w, h } = signageBox(format, size);
  const portrait = h > w;
  const style = {
    width: w,
    height: h,
    '--u': `${round((Math.min(w, h) - SIGNAGE_BEZEL * 2) / 10)}px`,
    '--accent': template.accent,
    '--on-accent': textOn(template.accent),
  } as React.CSSProperties;

  let creative: React.ReactNode;
  switch (template.layout) {
    case 'product-split':
      creative = (
        <div className={`${css.screen} ${css.split} ${portrait ? css.portrait : ''}`}>
          <div className={css.splitVisual}>
            <div className={css.pack}>{content.brand.charAt(0)}</div>
            <div className={css.splitBrand}>{content.brand}</div>
          </div>
          <div className={css.splitInfo}>
            <div className={css.name}>{name}</div>
            <Price value={content.promoPrice} className={`${css.splitPrice} ${css.pulse}`} />
            <div className={css.savingRow}>{savingRow}</div>
          </div>
        </div>
      );
      break;

    case 'banner':
      creative = (
        <div className={`${css.screen} ${css.banner} ${portrait ? css.portrait : ''}`}>
          <div className={css.bannerText}>
            <div className={css.eyebrow}>{content.contentType}</div>
            <div className={css.bannerName}>{name}</div>
            {hasSaving && (
              <div className={css.bannerSub}>
                Was {formatCurrency(content.regularPrice)} - Save {formatCurrency(saving)}
              </div>
            )}
          </div>
          <div className={`${css.bannerPrice} ${css.pulse}`}>
            <Price value={content.promoPrice} className={css.bannerPriceValue} />
          </div>
        </div>
      );
      break;

    case 'message':
      creative = (
        <div className={`${css.screen} ${css.message}`}>
          <div className={css.eyebrow}>{content.contentType}</div>
          <div className={`${css.headline} ${css.float}`}>{content.brand}</div>
          <div className={css.messageSub}>{name}</div>
          <div className={css.messagePrice}>
            <strong>Now {formatCurrency(content.promoPrice)}</strong>
            {hasSaving && (
              <span>
                {' '}
                was {formatCurrency(content.regularPrice)}, save {formatCurrency(saving)}
              </span>
            )}
          </div>
        </div>
      );
      break;

    // 'price-hero', and 'shelf-label' should it ever be paired with a signage format
    default:
      creative = (
        <div className={`${css.screen} ${css.hero} ${portrait ? css.portrait : ''}`}>
          <div className={css.heroCorner}></div>
          <div className={css.heroCornerText}>Special</div>
          <Price value={content.promoPrice} className={`${css.heroPrice} ${css.pulse}`} />
          <div className={`${css.name} ${css.heroName}`}>{name}</div>
          <div className={css.savingRow}>{savingRow}</div>
        </div>
      );
  }

  return (
    <div
      className={`${css.root} ${css.frameSignage} ${animated ? css.animated : ''}`}
      style={style}
      role="img"
      aria-label={label}
    >
      {creative}
      {animated && <span className={css.sheen}></span>}
      {animated && (
        <span className={css.animatedMarker}>
          <span className={css.animatedDot}></span>
          Animated
        </span>
      )}
    </div>
  );
};

export default ContentPreview;
