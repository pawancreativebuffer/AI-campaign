import React from 'react';
import type { ClientTemplatePack } from '../clients';
import type { FoodVillaTicketProps } from './FoodVillaTicket';
import css from './GenericTicket.module.css';

// Renderer for client packs without a dedicated one: a clean price ticket built from the pack's
// brand colours, font and design labels. Same props as the Food Villa renderer.

interface GenericTicketProps extends FoodVillaTicketProps {
  pack: ClientTemplatePack;
}

const money = (value: number) => {
  const [dollars, cents] = value.toFixed(2).split('.');
  return { dollars, cents };
};

const GenericTicket: React.FC<GenericTicketProps> = ({ pack, content, width, height, displayWidth, eslColour }) => {
  const scale = displayWidth / width;
  const unit = Math.min(width, height);
  const portrait = height > width * 1.1;
  const mono = eslColour === 'BW';
  const primary = mono ? '#111111' : pack.colours.primary;
  const accent = mono ? '#555555' : pack.colours.accent;
  const design = pack.designs.find(d => d.id === content.ticketType);
  const product = content.product;
  const isMember = content.ticketType === pack.loyaltyDesign;
  const isClearance = /clear/i.test(design?.label ?? '');

  const price = product ? money(product.promoPrice) : null;
  const saving = product ? product.regularPrice - product.promoPrice : 0;

  const style = {
    width,
    height,
    transform: `scale(${scale})`,
    fontFamily: pack.fontFamily,
    color: pack.colours.text,
    background: pack.colours.background,
    '--unit': `${unit / 100}px`,
    '--primary': primary,
    '--accent': accent,
  } as React.CSSProperties;

  const body = !product ? (
    <div className={css.message}>
      <div className={css.headline}>{content.headline || (content.ticketType ? 'Select a product' : 'Select a design')}</div>
      {content.body && <div className={css.text}>{content.body}</div>}
    </div>
  ) : (
    <div className={`${css.main} ${portrait ? css.portrait : ''}`}>
      <div className={css.priceBlock}>
        {isMember && <div className={css.priceLabel}>Member price</div>}
        <div className={css.price}>
          <span className={css.currency}>$</span>
          {price?.dollars}
          <span className={css.cents}>.{price?.cents}</span>
        </div>
        {saving > 0 && (
          <div className={css.saving}>
            {isClearance ? `Was $${product.regularPrice.toFixed(2)}` : isMember ? `Non-member $${product.regularPrice.toFixed(2)}` : `Save $${saving.toFixed(2)}`}
          </div>
        )}
      </div>
      <div className={css.description}>
        {product.description}
        <span className={css.size}> {product.size}</span>
      </div>
    </div>
  );

  return (
    <div className={css.frame} style={{ width: displayWidth, height: displayWidth * (height / width) }}>
      <div className={css.ticket} style={style}>
        <div className={css.band}>{design?.label ?? content.kind}</div>
        {body}
        <div className={css.footer}>
          <span>{pack.name}</span>
          <span>{content.endDate}</span>
          {product && <span>{product.sku}</span>}
        </div>
      </div>
    </div>
  );
};

export default GenericTicket;
