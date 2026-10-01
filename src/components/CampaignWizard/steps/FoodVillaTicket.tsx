import React from 'react';
import type { TicketType } from '../types';
import { PRODUCT_SLOT_KINDS } from '../options';
import styles from './FoodVillaTicket.module.css';

// HTML/CSS renderer of the Food Villa retail tickets (public/templates/food-villa/*.jpg).
// The ticket is laid out at its design size (width x height) and scaled with a CSS
// transform so it is exactly displayWidth wide.

export interface TicketProductData {
  sku: string;
  description: string;
  size: string; // e.g. "750ml"
  promoPrice: number;
  regularPrice: number;
  unitPrice?: string; // e.g. "$2.00 / 100ml"
  multibuyQty?: number; // Buy More & Save: "2 for"
}

export interface TicketContent {
  kind: string; // a SLOT_KINDS value
  ticketType: TicketType | ''; // product slots
  product?: TicketProductData; // product slots
  headline?: string; // message slots
  body?: string; // message slots
  endDate?: string; // already formatted, e.g. "Ends 08/11/26"
}

export interface FoodVillaTicketProps {
  content: TicketContent;
  width: number; // design size in pixels, e.g. 1920 x 1080 or ESL 300 x 400
  height: number;
  displayWidth: number; // rendered width on screen in CSS pixels; height follows the aspect ratio
  eslColour?: string; // 'BW' | 'BWR' | 'BWRY' for ESL; omit for Digital Signage
}

type KnownType = 'SP' | 'SALE' | 'CLR' | 'BMS' | 'NEW' | 'VCD';
type SwooshType = Exclude<KnownType, 'VCD'>;
type Layout = 'portrait' | 'wide' | 'strip' | 'square';
type CSS = React.CSSProperties;

const KNOWN_TYPES: KnownType[] = ['SP', 'SALE', 'CLR', 'BMS', 'NEW', 'VCD'];

/** Label lines of the swoosh header; the second part of a line may be accented. */
const LABELS: Record<SwooshType, { text: string; accent?: boolean }[]> = {
  SP: [{ text: 'SPECIAL' }, { text: 'PRICE' }],
  SALE: [{ text: 'SALE' }],
  CLR: [{ text: 'CLEAR' }, { text: 'OUT' }],
  BMS: [{ text: 'BUY MORE' }, { text: '& SAVE', accent: true }],
  NEW: [{ text: 'NEW' }],
};

const RED_MESSAGE_KINDS = ['Seasonal greeting', 'Store-wide offer', 'Brand advert'];

// ---------- helpers ----------

function isKnownType(t: string): t is KnownType {
  return (KNOWN_TYPES as string[]).includes(t);
}

function money(v: number): string {
  return `$${Math.max(0, v).toFixed(2)}`;
}

function splitPrice(v: number): { dollars: string; cents: string } {
  const total = Math.max(0, Math.round(v * 100));
  return { dollars: String(Math.floor(total / 100)), cents: String(total % 100).padStart(2, '0') };
}

/** Largest font size (<= base) at which `chars` characters fit in `avail` pixels. */
function fit(base: number, avail: number, chars: number, ratio = 0.5): number {
  if (chars <= 0) return base;
  return Math.min(base, avail / (chars * ratio));
}

/** Price font size that fits `avail` (width of "$", dollars, cents). */
function fitPrice(base: number, avail: number, dollars: string): number {
  return Math.min(base, avail / (0.3 + 0.53 * dollars.length + 0.55));
}

function longestWord(text: string): number {
  return text.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
}

function fullDescription(p: TicketProductData): string {
  const size = p.size.trim();
  if (!size || p.description.toLowerCase().includes(size.toLowerCase())) return p.description;
  return `${p.description} ${size}`;
}

function barcodeBackground(seed: string, vertical = false): string {
  const s = seed || '00000000';
  const widths: number[] = [1, 1, 1, 1];
  for (let i = 0; i < Math.max(12, s.length * 3); i++) {
    const c = s.charCodeAt(i % s.length);
    widths.push(((c * (i + 7)) % 3) + 1, ((c + i * 5) % 2) + 1);
  }
  widths.push(1, 1, 1, 1, 1);
  const total = widths.reduce((a, b) => a + b, 0);
  let pos = 0;
  const stops: string[] = [];
  widths.forEach((w, i) => {
    const from = (pos / total) * 100;
    pos += w;
    const to = (pos / total) * 100;
    const colour = i % 2 === 0 ? '#000' : 'transparent';
    stops.push(`${colour} ${from.toFixed(3)}% ${to.toFixed(3)}%`);
  });
  return `linear-gradient(${vertical ? '180deg' : '90deg'}, ${stops.join(', ')})`;
}

function colourClass(eslColour?: string): string {
  if (eslColour === 'BW') return styles.modeBW;
  if (eslColour === 'BWR') return styles.modeBWR;
  return '';
}

// ---------- small parts ----------

const SWOOSH_MAIN = 'M0 0 H100 C95 35 82 58 62 70 C42 80 20 84 0 100 Z';
const SWOOSH_EDGE = 'M100 0 C95 35 82 58 62 70 C42 80 20 84 0 100';
const SWOOSH_STREAK = 'M0 74 C20 50 42 26 64 4 C66 2 69 2 68 5 C50 30 26 60 0 90 Z';
const STRIP_MAIN = 'M0 0 H30 C62 12 88 50 100 100 L0 100 Z';
const STRIP_EDGE = 'M30 0 C62 12 88 50 100 100';
const STRIP_STREAK = 'M0 62 C25 42 50 30 80 26 L81 30 C52 36 26 52 0 76 Z';

function Swoosh({ style, strip }: { style: CSS; strip?: boolean }) {
  return (
    <svg className={styles.swoosh} style={style} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d={strip ? STRIP_MAIN : SWOOSH_MAIN} className={styles.swooshFill} />
      <path d={strip ? STRIP_STREAK : SWOOSH_STREAK} className={styles.swooshStreak} />
      <path d={strip ? STRIP_EDGE : SWOOSH_EDGE} className={styles.swooshEdge} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function SwooshLabel({ type, style, fontSize }: { type: SwooshType; style: CSS; fontSize: number }) {
  return (
    <div className={styles.label} style={{ ...style, fontSize }}>
      {LABELS[type].map(line => (
        <div key={line.text} className={line.accent ? styles.labelAccent : undefined}>
          {line.text}
        </div>
      ))}
    </div>
  );
}

function labelFont(type: SwooshType, twoLine: number, oneLine: number, avail: number): number {
  const lines = LABELS[type];
  const chars = lines.reduce((m, l) => Math.max(m, l.text.length), 0);
  return fit(lines.length > 1 ? twoLine : oneLine, avail, chars, 0.56);
}

/** The Food Villa "FV" mark: F, V with a leaf and two trolley wheels. */
function FvMark({ height, className }: { height: number; className?: string }) {
  return (
    <svg
      className={`${styles.fvMark} ${className ?? ''}`}
      style={{ height, width: height * 1.04 }}
      viewBox="-2 -12 104 104"
      aria-label="Food Villa"
      role="img"
    >
      <path d="M0 0 H40 V14 H14 V30 H34 V43 H14 V70 H0 Z" />
      <path d="M44 0 H58 L70 46 L80 14 H93 L77 70 H63 Z" />
      <path d="M82 12 C83 -1 91 -8 101 -10 C101 1 95 10 82 12 Z" />
      <circle cx="65" cy="82" r="5" />
      <circle cx="77" cy="82" r="5" />
    </svg>
  );
}

function Price({
  value,
  size,
  ea = true,
  className,
}: {
  value: number | null;
  size: number;
  ea?: boolean;
  className?: string;
}) {
  const parts = value === null ? { dollars: '--', cents: '--' } : splitPrice(value);
  return (
    <div className={`${styles.price} ${value === null ? styles.pricePlaceholder : ''} ${className ?? ''}`} style={{ fontSize: size }}>
      <span className={styles.priceDollar}>$</span>
      <span className={styles.priceDollars}>{parts.dollars}</span>
      <span className={styles.priceCentsCol}>
        <span className={styles.priceCents}>{parts.cents}</span>
        {ea && <span className={styles.priceEa}>ea</span>}
      </span>
    </div>
  );
}

function Barcode({ sku, style, vertical }: { sku: string; style: CSS; vertical?: boolean }) {
  return <div className={styles.barcode} style={{ ...style, backgroundImage: barcodeBackground(sku, vertical) }} />;
}

function PhotoPlaceholder({ name, style }: { name: string; style: CSS }) {
  const letter = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <div className={styles.photo} style={style}>
      <svg className={styles.photoSvg} viewBox="0 0 60 140" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path
          d="M23 2 H37 V30 C37 38 52 44 52 60 V128 C52 134 48 138 42 138 H18 C12 138 8 134 8 128 V60 C8 44 23 38 23 30 Z"
          className={styles.photoBottle}
        />
        <rect x="8" y="72" width="44" height="36" className={styles.photoLabel} />
        <text x="30" y="98" textAnchor="middle" className={styles.photoLetter}>
          {letter}
        </text>
      </svg>
    </div>
  );
}

// ---------- the derived numbers every layout needs ----------

interface Derived {
  type: KnownType;
  product?: TicketProductData;
  qty: number; // multibuy quantity, 1 when not BMS
  price: number | null; // headline price (BMS: price for qty)
  saving: number; // > 0 to show
  barLeft: string; // "SAVE $x" / "WAS $x" / ''
  barRight: string;
  description: string;
  sku: string;
  footerLeft: string; // LIMIT 12 / While stocks last
  endDate: string;
  memberUnit: string; // VCD lines under the prices
}

function derive(type: KnownType, content: TicketContent, esl: boolean): Derived {
  const p = content.product;
  const qty = type === 'BMS' ? Math.max(1, p?.multibuyQty ?? 2) : 1;
  const price = p ? p.promoPrice * qty : null;
  const saving = p ? (p.regularPrice - p.promoPrice) * qty : 0;
  let barLeft = '';
  if (p && type === 'CLR') barLeft = p.regularPrice > p.promoPrice ? `WAS ${money(p.regularPrice)}` : '';
  else if (p && saving > 0.004 && type !== 'NEW') barLeft = `SAVE ${money(saving)}`;
  let barRight = '';
  if (p) {
    if (p.unitPrice) barRight = p.unitPrice;
    else if (type === 'BMS') barRight = `was ${money(p.regularPrice)} ea`;
    else barRight = p.size;
  }
  return {
    type,
    product: p,
    qty,
    price,
    saving,
    barLeft,
    barRight,
    description: p ? fullDescription(p) : 'Select a product',
    sku: p?.sku ?? '',
    footerLeft: type === 'CLR' && esl ? 'While stocks last' : 'LIMIT 12',
    endDate: content.endDate ?? '',
    memberUnit: p ? p.unitPrice ?? p.size : '',
  };
}

function Bar({ d, style, fontSize, stacked }: { d: Derived; style: CSS; fontSize: number; stacked?: boolean }) {
  if (!d.barLeft && !d.barRight) return null;
  const centred = !d.barLeft;
  return (
    <div
      className={`${styles.bar} ${stacked ? styles.barStacked : ''} ${centred ? styles.barCentred : ''}`}
      style={{ ...style, fontSize }}
    >
      {d.barLeft && <span className={styles.barSave}>{d.barLeft}</span>}
      {d.barRight && <span className={styles.barUnit}>{d.barRight}</span>}
    </div>
  );
}

function Description({ d, style, fontSize, avail }: { d: Derived; style: CSS; fontSize: number; avail: number }) {
  const size = fit(fontSize, avail * 2, d.description.length, 0.47);
  return (
    <div className={`${styles.desc} ${d.product ? '' : styles.descPlaceholder}`} style={{ ...style, fontSize: size }}>
      {d.description}
    </div>
  );
}

function barFont(d: Derived, base: number, avail: number): number {
  return fit(base, avail, d.barLeft.length + d.barRight.length + 4, 0.47);
}

// ---------- product layouts ----------

interface LayoutProps {
  d: Derived;
  W: number;
  H: number;
  U: number;
  photo: boolean;
}

function PortraitProduct({ d, W, H, U, photo }: LayoutProps) {
  const type = d.type as SwooshType;
  const Hu = H / U;
  const swH = Math.min(54, 0.32 * Hu);
  const colW = 90 * U;
  const P = fitPrice(40 * U, colW * 0.95, d.price === null ? '--' : splitPrice(d.price).dollars);
  return (
    <>
      <Swoosh style={{ left: 0, top: 0, width: W, height: swH * U }} />
      <div className={styles.column} style={{ left: 5 * U, right: 5 * U, top: swH * U, bottom: 1.5 * U }}>
        {photo ? (
          <PhotoPlaceholder
            name={d.description}
            style={{ flex: '1 1 0', minHeight: 0, width: '52%', alignSelf: 'flex-end', marginTop: -0.42 * swH * U, marginBottom: 2 * U }}
          />
        ) : (
          <div style={{ flex: '1 1 0' }} />
        )}
        <div className={styles.priceWrap}>
          {d.type === 'BMS' && (
            <div className={styles.multibuy} style={{ fontSize: 12 * U }}>
              {d.qty} for
            </div>
          )}
          <Price value={d.price} size={P} />
        </div>
        <Bar d={d} fontSize={barFont(d, 6.3 * U, colW - 8 * U)} style={{ height: 9 * U, marginTop: 2 * U, padding: `0 ${4 * U}px` }} />
        <Description d={d} fontSize={7.5 * U} avail={colW} style={{ marginTop: 4 * U }} />
        <div style={{ flex: photo ? '0 0 auto' : '1 1 0', minHeight: 2 * U }} />
        <Footer d={d} U={U} />
      </div>
      <SwooshLabel type={type} fontSize={labelFont(type, swH * 0.33 * U, swH * 0.5 * U, 84 * U)} style={{ left: 8 * U, top: swH * 0.14 * U }} />
    </>
  );
}

function Footer({ d, U, style, hideLimit }: { d: Derived; U: number; style?: CSS; hideLimit?: boolean }) {
  const fs = 2.6 * U;
  return (
    <div className={styles.footer} style={{ fontSize: fs, height: 6.5 * U, borderTopWidth: Math.max(1, 0.15 * U), ...style }}>
      {!hideLimit && <span className={styles.footerLimit}>{d.footerLeft}</span>}
      <span>{d.endDate}</span>
      <span className={styles.footerRight}>
        <span>{d.sku}</span>
        <Barcode sku={d.sku} style={{ width: 22 * U, height: 3.6 * U, marginLeft: 2.5 * U }} />
      </span>
    </div>
  );
}

function WideProduct({ d, W, U }: LayoutProps) {
  const type = d.type as SwooshType;
  const Wu = W / U;
  const colLeft = 0.465 * Wu;
  const colW = (Wu - colLeft - 0.02 * Wu) * U;
  const swH = 53;
  const P = fitPrice(41 * U, colW * 0.8, d.price === null ? '--' : splitPrice(d.price).dollars);
  return (
    <>
      <Swoosh style={{ left: 0, top: 0, width: 0.55 * W, height: swH * U }} />
      <PhotoPlaceholder name={d.description} style={{ left: 0.1 * W, width: 0.32 * W, top: 34 * U, bottom: 6 * U, position: 'absolute' }} />
      <SwooshLabel
        type={type}
        fontSize={labelFont(type, swH * 0.4 * U, swH * 0.55 * U, 0.42 * W)}
        style={{ left: 0.04 * W, top: 7 * U }}
      />
      <div className={styles.column} style={{ left: colLeft * U, right: 0.02 * W, top: 4 * U, bottom: 10 * U, justifyContent: 'center' }}>
        <div className={styles.priceWrap}>
          {d.type === 'BMS' && (
            <div className={styles.multibuy} style={{ fontSize: 12 * U }}>
              {d.qty} for
            </div>
          )}
          <Price value={d.price} size={P} />
        </div>
        <Bar d={d} fontSize={barFont(d, 6.5 * U, colW - 8 * U)} style={{ height: 9 * U, marginTop: 2 * U, padding: `0 ${4 * U}px` }} />
        <Description d={d} fontSize={7.2 * U} avail={colW} style={{ marginTop: 3 * U }} />
      </div>
      <div className={styles.footerLimit} style={{ position: 'absolute', left: 0.04 * W, bottom: 2.5 * U, fontSize: 2.6 * U }}>
        {d.footerLeft}
      </div>
      <Footer d={d} U={U} hideLimit style={{ position: 'absolute', left: 0.46 * W, right: 0.02 * W, bottom: 1 * U }} />
    </>
  );
}

function StripProduct({ d, W, H, U }: LayoutProps) {
  const type = d.type as SwooshType;
  const colLeft = 0.4 * W;
  const colW = W - colLeft - 3 * U;
  const multibuy = d.type === 'BMS';
  const dollars = d.price === null ? '--' : splitPrice(d.price).dollars;
  const P = fitPrice(30 * U, colW * (multibuy ? 0.62 : 0.9), dollars);
  return (
    <>
      <Swoosh strip style={{ left: 0, top: 0, width: 0.38 * W, height: H }} />
      <SwooshLabel type={type} fontSize={labelFont(type, 24 * U, 30 * U, 0.29 * W)} style={{ left: 4 * U, bottom: 8 * U }} />
      <div className={styles.column} style={{ left: colLeft, right: 3 * U, top: 3 * U, bottom: 13 * U }}>
        <div className={styles.priceRow}>
          {multibuy && (
            <span className={styles.multibuy} style={{ fontSize: P * 0.5, marginRight: P * 0.15 }}>
              {d.qty} for
            </span>
          )}
          <Price value={d.price} size={P} ea={false} />
        </div>
        <Bar d={d} fontSize={barFont(d, 9 * U, colW - 4 * U)} style={{ height: 13 * U, marginTop: 2 * U, padding: `0 ${2 * U}px` }} />
        <Description d={d} fontSize={11 * U} avail={colW} style={{ marginTop: 2 * U }} />
      </div>
      <div className={styles.stripFooter} style={{ left: colLeft, right: 3 * U, bottom: 2 * U, height: 10 * U, fontSize: 5.2 * U }}>
        <span>{d.type === 'CLR' ? d.footerLeft : d.endDate}</span>
        <span>{d.sku}</span>
        <Barcode sku={d.sku} style={{ width: 0.24 * W, height: 9 * U }} />
      </div>
    </>
  );
}

function SquareProduct({ d, U }: LayoutProps) {
  const type = d.type as SwooshType;
  const multibuy = d.type === 'BMS';
  const dollars = d.price === null ? '--' : splitPrice(d.price).dollars;
  const P = fitPrice(26 * U, 52 * U, dollars);
  return (
    <>
      <Swoosh style={{ left: 0, top: 0, width: 52 * U, height: 48 * U }} />
      <SwooshLabel type={type} fontSize={labelFont(type, 14 * U, 21 * U, 44 * U)} style={{ left: 3 * U, top: 5 * U }} />
      <div className={styles.column} style={{ left: 44 * U, right: 3 * U, top: 2 * U, height: 36 * U, justifyContent: 'center', alignItems: 'flex-end' }}>
        {multibuy && (
          <div className={styles.multibuy} style={{ fontSize: 10 * U, alignSelf: 'center' }}>
            {d.qty} for
          </div>
        )}
        <Price value={d.price} size={P} ea={false} />
      </div>
      <Bar d={d} stacked fontSize={fit(7 * U, 48 * U, Math.max(d.barLeft.length, d.barRight.length), 0.47)} style={{ position: 'absolute', right: 4 * U, top: 40 * U, maxWidth: 56 * U, padding: `${1.2 * U}px ${3 * U}px` }} />
      <Description d={d} fontSize={8.5 * U} avail={94 * U} style={{ position: 'absolute', left: 3 * U, right: 3 * U, top: 62 * U }} />
      <div className={styles.squareFooter} style={{ left: 3 * U, right: 3 * U, bottom: 2.5 * U, height: 13 * U, fontSize: 5 * U }}>
        <div className={styles.squareFooterText}>
          <div className={styles.footerLimit}>{d.footerLeft}</div>
          <div>{d.sku}</div>
        </div>
        <Barcode sku={d.sku} style={{ width: 54 * U, height: 12 * U }} />
      </div>
    </>
  );
}

// ---------- Villa Club Deal ----------

function VcdBox({
  d,
  member,
  U,
  P,
  labelSize,
  unitSize,
  style,
}: {
  d: Derived;
  member: boolean;
  U: number;
  P: number;
  labelSize: number;
  unitSize: number;
  style: CSS;
}) {
  const p = d.product;
  const value = p ? (member ? p.promoPrice : p.regularPrice) : null;
  return (
    <div className={`${styles.vcdBox} ${member ? styles.vcdMember : styles.vcdNonMember}`} style={{ borderRadius: 3.5 * U, borderWidth: Math.max(1, 0.3 * U), ...style }}>
      <div className={styles.vcdBoxLabel} style={{ fontSize: labelSize }}>
        {!member && <div>NON</div>}
        <div>MEMBER</div>
        <div>PRICE</div>
      </div>
      <div className={styles.vcdBoxPrice}>
        <Price value={value} size={P} />
        {d.memberUnit && (
          <div className={styles.vcdUnit} style={{ fontSize: unitSize }}>
            {d.memberUnit}
          </div>
        )}
      </div>
    </div>
  );
}

function VcdHeaderInline({ U, height, font, style }: { U: number; height: number; font: number; style: CSS }) {
  return (
    <div className={styles.vcdHeader} style={{ ...style, gap: 2.5 * U }}>
      <FvMark height={height} />
      <span className={styles.vcdHeaderText} style={{ fontSize: font }}>
        Villa Club DEAL
      </span>
    </div>
  );
}

function VcdPortrait({ d, W, U, photo }: LayoutProps) {
  const colW = 90 * U;
  const dollars = d.product ? splitPrice(Math.max(d.product.promoPrice, d.product.regularPrice)).dollars : '--';
  const P = fitPrice(24 * U, 50 * U, dollars);
  return (
    <>
      <VcdHeaderInline
        U={U}
        height={15 * U}
        font={9.5 * U}
        style={{ left: 5 * U, right: 5 * U, top: 0, height: 25 * U, borderRadius: `0 0 ${4 * U}px ${4 * U}px` }}
      />
      <div className={styles.column} style={{ left: 5 * U, right: 5 * U, top: 25 * U, bottom: 1.5 * U }}>
        {photo ? (
          <PhotoPlaceholder name={d.description} style={{ flex: '1 1 0', minHeight: 0, width: '80%', alignSelf: 'center', margin: `${4 * U}px 0` }} />
        ) : (
          <div style={{ flex: '1 1 0' }} />
        )}
        <Description d={d} fontSize={7.5 * U} avail={colW} style={{ fontWeight: 500 }} />
        <VcdBox d={d} member U={U} P={P} labelSize={6.5 * U} unitSize={3.4 * U} style={{ height: 28 * U, marginTop: 4 * U, padding: `0 ${4 * U}px 0 ${4 * U}px`, width: W * 0.82, alignSelf: 'center' }} />
        <VcdBox d={d} member={false} U={U} P={P} labelSize={6.5 * U} unitSize={3.4 * U} style={{ height: 28 * U, marginTop: 2.5 * U, padding: `0 ${4 * U}px`, width: W * 0.82, alignSelf: 'center' }} />
        <div style={{ flex: photo ? '0 0 auto' : '1 1 0', minHeight: 2 * U }} />
        <Footer d={d} U={U} />
      </div>
    </>
  );
}

function VcdWide({ d, W, U }: LayoutProps) {
  const left = 0.5 * W;
  const colW = W - left - 0.06 * W;
  const dollars = d.product ? splitPrice(Math.max(d.product.promoPrice, d.product.regularPrice)).dollars : '--';
  const P = fitPrice(24 * U, colW * 0.5, dollars);
  return (
    <>
      <div className={styles.vcdBlock} style={{ left: 0.044 * W, top: 0, width: 0.31 * W, height: 42 * U, borderRadius: `0 0 ${4 * U}px ${4 * U}px`, paddingTop: 3 * U }}>
        <FvMark height={19 * U} />
        <div className={styles.vcdHeaderText} style={{ fontSize: 11 * U, lineHeight: 0.95, textAlign: 'center', marginTop: 1 * U }}>
          Villa Club
          <br />
          DEAL
        </div>
      </div>
      <PhotoPlaceholder name={d.description} style={{ position: 'absolute', left: 0.04 * W, width: 0.42 * W, top: 46 * U, bottom: 6 * U }} />
      <div className={styles.column} style={{ left, right: 0.06 * W, top: 6 * U, bottom: 10 * U, justifyContent: 'center' }}>
        <Description d={d} fontSize={8.5 * U} avail={colW} style={{ fontWeight: 500 }} />
        <VcdBox d={d} member U={U} P={P} labelSize={7.5 * U} unitSize={3.4 * U} style={{ height: 28 * U, marginTop: 3 * U, padding: `0 ${4 * U}px` }} />
        <VcdBox d={d} member={false} U={U} P={P} labelSize={7.5 * U} unitSize={3.4 * U} style={{ height: 28 * U, marginTop: 1.5 * U, padding: `0 ${4 * U}px` }} />
      </div>
      <div className={styles.footerLimit} style={{ position: 'absolute', left: 0.04 * W, bottom: 2.5 * U, fontSize: 2.6 * U }}>
        {d.footerLeft}
      </div>
      <Footer d={d} U={U} hideLimit style={{ position: 'absolute', left: 0.46 * W, right: 0.02 * W, bottom: 1 * U }} />
    </>
  );
}

function VcdStrip({ d, W, U }: LayoutProps) {
  const left = 0.12 * W;
  const boxW = (W - left - 5 * U) / 2;
  const dollars = d.product ? splitPrice(Math.max(d.product.promoPrice, d.product.regularPrice)).dollars : '--';
  const P = fitPrice(21 * U, boxW * 0.55, dollars);
  return (
    <>
      <Barcode sku={d.sku} vertical style={{ position: 'absolute', left: 2.5 * U, top: 4 * U, height: 52 * U, width: 7 * U }} />
      <div className={styles.vcdSku} style={{ left: 3 * U, bottom: 4 * U, fontSize: 5 * U, width: 6 * U }}>
        <span>{d.sku}</span>
      </div>
      <VcdHeaderInline
        U={U}
        height={13 * U}
        font={11 * U}
        style={{ left, right: 0, top: 0, height: 18 * U, borderRadius: `0 0 0 ${5 * U}px` }}
      />
      <Description d={d} fontSize={10.5 * U} avail={W - left - 2 * U} style={{ position: 'absolute', left, right: 2 * U, top: 21 * U, fontWeight: 500 }} />
      <VcdBox d={d} member={false} U={U} P={P} labelSize={6.5 * U} unitSize={3.6 * U} style={{ position: 'absolute', left, width: boxW, top: 50 * U, bottom: 4 * U, padding: `0 ${2.5 * U}px` }} />
      <VcdBox d={d} member U={U} P={P} labelSize={6.5 * U} unitSize={3.6 * U} style={{ position: 'absolute', left: left + boxW + 2 * U, width: boxW, top: 50 * U, bottom: 4 * U, padding: `0 ${2.5 * U}px` }} />
    </>
  );
}

function VcdSquare({ d, U }: LayoutProps) {
  const dollars = d.product ? splitPrice(Math.max(d.product.promoPrice, d.product.regularPrice)).dollars : '--';
  const P = fitPrice(17 * U, 46 * U, dollars);
  return (
    <>
      <VcdHeaderInline U={U} height={10 * U} font={9 * U} style={{ left: 3 * U, right: 3 * U, top: 0, height: 16 * U, borderRadius: `0 0 ${3 * U}px ${3 * U}px` }} />
      <Description d={d} fontSize={7.5 * U} avail={94 * U} style={{ position: 'absolute', left: 3 * U, right: 3 * U, top: 18.5 * U, fontWeight: 500 }} />
      <VcdBox d={d} member U={U} P={P} labelSize={5.5 * U} unitSize={3.2 * U} style={{ position: 'absolute', left: 4 * U, right: 4 * U, top: 37 * U, height: 24 * U, padding: `0 ${3 * U}px` }} />
      <VcdBox d={d} member={false} U={U} P={P} labelSize={5.5 * U} unitSize={3.2 * U} style={{ position: 'absolute', left: 4 * U, right: 4 * U, top: 63 * U, height: 24 * U, padding: `0 ${3 * U}px` }} />
      <div className={styles.stripFooter} style={{ left: 3 * U, right: 3 * U, bottom: 1.5 * U, height: 9 * U, fontSize: 4.2 * U }}>
        <span>{d.endDate}</span>
        <span>{d.sku}</span>
        <Barcode sku={d.sku} style={{ width: 42 * U, height: 8 * U }} />
      </div>
    </>
  );
}

// ---------- message slots ----------

function MessageTicket({ content, layout, W, H, U }: { content: TicketContent; layout: Layout; W: number; H: number; U: number }) {
  const headline = content.headline?.trim() || content.kind;
  const body = content.body?.trim() ?? '';
  const side = layout === 'wide' || layout === 'strip';
  const swW = side ? 0.46 * W : W;
  const swH = side ? 72 * U : Math.min(48, 0.3 * (H / U)) * U;
  const textLeft = side ? 0.42 * W : 7 * U;
  const textTop = side ? 6 * U : swH + 2 * U;
  const avail = W - textLeft - 6 * U;
  const k = side ? 1.5 : 1;
  let base = 14 * k * U;
  if (headline.length > 18) base = 11.5 * k * U;
  if (headline.length > 32) base = 9.5 * k * U;
  if (headline.length > 55) base = 7.5 * k * U;
  const hSize = Math.min(fit(base, avail, longestWord(headline), 0.52), fit(base, avail * 3, headline.length, 0.5));
  const bSize = Math.min(hSize * 0.5, fit(6 * k * U, avail * 3, body.length, 0.45));
  const markLeft = side ? 0.04 * W : 7 * U;
  const kindSize = fit(side ? 5 * U : swH * 0.1, (side ? 0.26 * W : 0.6 * W), content.kind.length, 0.6);
  return (
    <>
      <Swoosh style={{ left: 0, top: 0, width: swW, height: swH }} />
      <div className={styles.messageMark} style={{ left: markLeft, top: side ? 7 * U : swH * 0.16 }}>
        <FvMark height={side ? 30 * U : swH * 0.48} />
        <div className={styles.messageKind} style={{ fontSize: kindSize }}>
          {content.kind}
        </div>
      </div>
      <div
        className={styles.messageText}
        style={{ left: textLeft, right: 6 * U, top: textTop, bottom: 10 * U }}
      >
        <div className={styles.messageHeadline} style={{ fontSize: hSize }}>
          {headline}
        </div>
        {body && (
          <div className={styles.messageBody} style={{ fontSize: bSize, marginTop: 3 * U }}>
            {body}
          </div>
        )}
      </div>
      {content.endDate && (
        <div className={styles.messageEnd} style={{ left: textLeft, bottom: 3 * U, fontSize: 2.8 * U }}>
          {content.endDate.replace(/^Ends/, 'Until')}
        </div>
      )}
      <div
        className={styles.draft}
        style={{ right: 2 * U, bottom: 2 * U, fontSize: Math.max(2.4 * U, 8), padding: `${0.4 * U}px ${1.2 * U}px`, borderRadius: 1 * U }}
      >
        Draft design
      </div>
    </>
  );
}

// ---------- main ----------

function getLayout(W: number, H: number, esl: boolean): Layout {
  if (H > W * 1.1) return 'portrait';
  if (W > H * 1.1) return esl || H < 400 ? 'strip' : 'wide';
  return 'square';
}

function renderProduct(layout: Layout, props: LayoutProps) {
  if (props.d.type === 'VCD') {
    if (layout === 'portrait') return <VcdPortrait {...props} />;
    if (layout === 'wide') return <VcdWide {...props} />;
    if (layout === 'strip') return <VcdStrip {...props} />;
    return <VcdSquare {...props} />;
  }
  if (layout === 'portrait') return <PortraitProduct {...props} />;
  if (layout === 'wide') return <WideProduct {...props} />;
  if (layout === 'strip') return <StripProduct {...props} />;
  return <SquareProduct {...props} />;
}

const FoodVillaTicket: React.FC<FoodVillaTicketProps> = ({ content, width, height, displayWidth, eslColour }) => {
  const W = Math.max(1, width);
  const H = Math.max(1, height);
  const U = Math.min(W, H) / 100;
  const esl = !!eslColour;
  const layout = getLayout(W, H, esl);
  const scale = displayWidth / W;
  const isProduct = PRODUCT_SLOT_KINDS.includes(content.kind);
  const type = content.ticketType;

  let typeClass = '';
  let inner: React.ReactNode;
  if (!isProduct) {
    typeClass = RED_MESSAGE_KINDS.includes(content.kind) ? styles.typeMsgRed : styles.typeMsgYellow;
    inner = <MessageTicket content={content} layout={layout} W={W} H={H} U={U} />;
  } else if (!type || !isKnownType(type)) {
    typeClass = styles.empty;
    inner = (
      <div className={styles.emptyBox} style={{ inset: 4 * U, borderWidth: Math.max(1, 0.6 * U), borderRadius: 3 * U }}>
        <div style={{ fontSize: 8 * U }}>Select a design</div>
        <div className={styles.emptyKind} style={{ fontSize: 4 * U }}>
          {content.product?.description ?? content.kind}
        </div>
      </div>
    );
  } else {
    typeClass = styles[`type${type}`] ?? '';
    const d = derive(type, content, esl);
    inner = renderProduct(layout, { d, W, H, U, photo: !esl && layout !== 'strip' && layout !== 'square' });
  }

  return (
    <div className={styles.outer} style={{ width: displayWidth, height: (displayWidth * H) / W }}>
      <div
        className={`${styles.ticket} ${typeClass} ${esl ? styles.esl : ''} ${colourClass(eslColour)}`}
        style={{ width: W, height: H, transform: `scale(${scale})` }}
      >
        {inner}
      </div>
    </div>
  );
};

export default FoodVillaTicket;
