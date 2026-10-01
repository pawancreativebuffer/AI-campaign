import React, { useEffect, useRef } from 'react';
import styles from '../wizard.module.css';
import css from './Step08Templates.module.css';
import TicketPreview from './TicketPreview';
import { defaultBody, defaultHeadline, getTicketContent } from './ticketContent';
import { autoAssignSlots, getPixelSize, getRequiredFormats, isProductSlot } from '../helpers';
import { getClientPack } from '../clients';
import { isSlotComplete } from '../validation';
import { AlertIcon, CheckIcon, SparkleIcon } from '../icons';
import type { CampaignDraft, CampaignProduct, CampaignSlot, ContentFormat, StepProps } from '../types';

/** Display width that fits a ticket of the given size into a box, keeping its aspect ratio. */
function fitWidth(format: ContentFormat, maxWidth: number, maxHeight: number): number {
  const { width, height } = getPixelSize(format);
  return Math.max(1, Math.round(Math.min(maxWidth, (maxHeight * width) / height)));
}

function mediaShort(format: ContentFormat): string {
  return format.media === 'signage' ? 'Signage' : 'ESL';
}

interface SlotTicketProps {
  slot: CampaignSlot;
  draft: CampaignDraft;
  format: ContentFormat;
  displayWidth: number;
}

/** A slot's ticket at one format, drawn with the campaign client's renderer. */
const SlotTicket: React.FC<SlotTicketProps> = ({ slot, draft, format, displayWidth }) => {
  const { width, height } = getPixelSize(format);
  return (
    <TicketPreview
      clientId={draft.clientId}
      content={getTicketContent(slot, draft)}
      width={width}
      height={height}
      displayWidth={displayWidth}
      eslColour={format.media === 'esl' ? format.eslColour : undefined}
    />
  );
};

const Step08Templates: React.FC<StepProps> = ({ draft, update, errors, showErrors, goToStep }) => {
  const autoFilled = useRef(false);

  const approved = draft.products.filter(p => p.approved);
  const productSlots = draft.slots.filter(slot => isProductSlot(slot.kind));

  // On first arrival, fill the product slots once if the user has not picked anything yet.
  useEffect(() => {
    if (autoFilled.current) return;
    autoFilled.current = true;
    const allEmpty = draft.slots.filter(slot => isProductSlot(slot.kind)).every(slot => !slot.productSku);
    if (allEmpty && draft.products.some(p => p.approved)) {
      update({ slots: autoAssignSlots(draft) });
    }
  }, [draft, update]);

  const formats = getRequiredFormats(draft);

  if (formats.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={css.emptyText}>No devices are selected, so there are no screen or label sizes to design for.</p>
        <button type="button" className={`${styles.btnSmall} ${styles.btnSmallPink}`} onClick={() => goToStep(5)}>
          Select Devices
        </button>
      </div>
    );
  }

  const signageFormats = formats.filter(f => f.media === 'signage');
  const eslFormats = formats.filter(f => f.media === 'esl');
  // The format used for previews: the first screen, or the first label when there are no screens.
  const productPreviewFormat = signageFormats[0] ?? eslFormats[0];
  const messagePreviewFormat = signageFormats[0];

  const pack = getClientPack(draft.clientId);
  // ESL labels only show products, so message slots are not needed without signage.
  const isReady = (slot: CampaignSlot) =>
    isSlotComplete(slot) || (!isProductSlot(slot.kind) && signageFormats.length === 0);
  const isDuplicate = (slot: CampaignSlot) =>
    !!slot.productSku && draft.slots.filter(other => other.productSku === slot.productSku).length > 1;
  const readyCount = draft.slots.filter(slot => isReady(slot) && !isDuplicate(slot)).length;
  const productBySku = new Map<string, CampaignProduct>(approved.map(p => [p.sku, p]));

  const updateSlot = (index: number, patch: Partial<CampaignSlot>) => {
    update({ slots: draft.slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)) });
  };

  const usedInSlot = (sku: string, exceptIndex: number): number | null => {
    const index = draft.slots.findIndex((slot, i) => i !== exceptIndex && slot.productSku === sku);
    return index === -1 ? null : index + 1;
  };

  const missingText = (slot: CampaignSlot): string => {
    if (!isProductSlot(slot.kind)) return 'Needs a headline';
    if (!slot.productSku && !slot.ticketType) return 'Needs a product and a design';
    if (!slot.productSku) return 'Needs a product';
    return 'Needs a design';
  };

  const renderProductControls = (slot: CampaignSlot, index: number) => {
    const product = productBySku.get(slot.productSku);
    const duplicateOf = slot.productSku ? usedInSlot(slot.productSku, index) : null;
    return (
      <>
        <div className={css.field}>
          <label className={styles.label} htmlFor={`slot-product-${slot.id}`}>
            Product <span className={styles.required}>*</span>
          </label>
          <select
            id={`slot-product-${slot.id}`}
            className={`${styles.select} ${(!slot.productSku && showErrors) || duplicateOf ? styles.inputError : ''}`}
            value={slot.productSku}
            onChange={e => updateSlot(index, { productSku: e.target.value })}
          >
            <option value="">Choose an approved product</option>
            {approved.map(p => {
              const usedIn = usedInSlot(p.sku, index);
              return (
                <option key={p.sku} value={p.sku}>
                  {p.description} {p.size}
                  {usedIn ? ` (already in slot ${usedIn})` : ''}
                </option>
              );
            })}
          </select>
          {duplicateOf && (
            <p className={styles.errorText} role="alert">
              This product is already selected in slot {duplicateOf}. Choose a different product.
            </p>
          )}
          {product && !duplicateOf && (
            <p className={styles.helpText}>
              SKU {product.sku}, promo ${product.promoPrice.toFixed(2)} (was ${product.regularPrice.toFixed(2)})
            </p>
          )}
        </div>

        <div className={css.field}>
          <span className={styles.label}>
            Ticket design <span className={styles.required}>*</span>
          </span>
          <p className={css.fieldHint}>
            Shown with this slot&apos;s product at {productPreviewFormat.label}. The same design is produced in every
            size listed on the right.
          </p>
          <div className={css.designGrid} role="radiogroup" aria-label={`Ticket design for slot ${index + 1}`}>
            {pack.designs.map(design => {
              const selected = slot.ticketType === design.id;
              const previewSlot: CampaignSlot = { ...slot, ticketType: design.id };
              return (
                <div key={design.id} className={`${css.designCard} ${selected ? css.designCardSelected : ''}`}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={css.designSelect}
                    onClick={() => updateSlot(index, { ticketType: design.id })}
                    title={design.description}
                  >
                    <span className={css.designThumb}>
                      <SlotTicket
                        slot={previewSlot}
                        draft={draft}
                        format={productPreviewFormat}
                        displayWidth={fitWidth(productPreviewFormat, 150, 96)}
                      />
                    </span>
                    <span className={css.designName}>
                      {selected && <CheckIcon size={14} />}
                      {design.label}
                    </span>
                    <span className={css.designDesc}>{design.description}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  };

  const renderMessageControls = (slot: CampaignSlot, index: number) => {
    const suggestedHeadline = defaultHeadline(slot.kind);
    const suggestedBody = defaultBody(slot.kind, draft);
    return (
      <>
        <div className={css.field}>
          <label className={styles.label} htmlFor={`slot-headline-${slot.id}`}>
            Headline <span className={styles.required}>*</span>
          </label>
          <input
            id={`slot-headline-${slot.id}`}
            className={`${styles.input} ${!slot.headline.trim() && showErrors ? styles.inputError : ''}`}
            value={slot.headline}
            placeholder={suggestedHeadline || 'Enter a headline'}
            onChange={e => updateSlot(index, { headline: e.target.value })}
          />
        </div>
        <div className={css.field}>
          <label className={styles.label} htmlFor={`slot-body-${slot.id}`}>
            Supporting text
          </label>
          <textarea
            id={`slot-body-${slot.id}`}
            className={styles.textarea}
            rows={3}
            value={slot.body}
            placeholder={suggestedBody || 'Optional'}
            onChange={e => updateSlot(index, { body: e.target.value })}
          />
        </div>
        {suggestedHeadline && (
          <div className={css.field}>
            <button
              type="button"
              className={styles.btnOutline}
              onClick={() => updateSlot(index, { headline: suggestedHeadline, body: suggestedBody })}
            >
              <SparkleIcon size={14} />
              Use suggested text
            </button>
          </div>
        )}
        <div className={`${styles.alert} ${styles.alertWarning} ${css.noMargin}`}>
          <AlertIcon />
          <div>
            {pack.name} has not supplied an approved template for <strong>{slot.kind}</strong> yet. The preview is a
            draft design and will be replaced by the client&apos;s template once it is supplied.
          </div>
        </div>
      </>
    );
  };

  const renderPreview = (slot: CampaignSlot) => {
    const product = isProductSlot(slot.kind);
    const previewFormat = product ? productPreviewFormat : messagePreviewFormat;
    const slotFormats = product ? formats : signageFormats;

    if (!previewFormat) {
      return (
        <p className={css.fieldHint}>
          This campaign has no Digital Signage screens, and ESL labels only show products, so this slot will not be
          produced.
        </p>
      );
    }

    return (
      <>
        <span className={styles.label}>Preview, {previewFormat.label}</span>
        <div className={css.previewFrame}>
          <SlotTicket
            slot={slot}
            draft={draft}
            format={previewFormat}
            displayWidth={fitWidth(previewFormat, 280, 360)}
          />
        </div>
        <span className={`${styles.label} ${css.formatsLabel}`}>Produced in {slotFormats.length} format(s)</span>
        <div className={css.formatChips}>
          {slotFormats.map(f => (
            <span key={f.key} className={`${styles.badge} ${f.media === 'esl' ? styles.badgeBlue : ''}`}>
              {mediaShort(f)} {f.label}
            </span>
          ))}
        </div>
      </>
    );
  };

  return (
    <div>
      <p className={styles.sectionIntro}>
        Pick the ticket design for each slot in the campaign. Designs are the client&apos;s approved templates, so
        every ticket stays on brand; each one is produced automatically in every screen and label size you selected.
      </p>

      <div className={styles.alert}>
        <AlertIcon />
        <div>
          Only designs compatible with the selected media, device formats and sizes are shown. Digital Signage may use
          static or animated templates; ESL content must always be static. All {pack.name} ticket designs are static and
          available in every size, so they suit both screens and shelf labels.
        </div>
      </div>

      {approved.length === 0 && productSlots.length > 0 && (
        <div className={`${styles.alert} ${styles.alertWarning} ${css.alertRow}`}>
          <AlertIcon />
          <div className={css.alertText}>No products are approved yet, so the product slots cannot be filled.</div>
          <button type="button" className={`${styles.btnSmall} ${styles.btnSmallPink}`} onClick={() => goToStep(7)}>
            Approve Products
          </button>
        </div>
      )}

      {showErrors && errors.slots && (
        <div className={`${styles.alert} ${styles.alertError}`}>
          <AlertIcon />
          <div>{errors.slots}</div>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.counter}>
          <strong>{readyCount}</strong> of {draft.slots.length} slots ready
        </div>
      </div>

      <div className={css.slotList}>
        {draft.slots.map((slot, index) => {
          const duplicate = isDuplicate(slot);
          const complete = isSlotComplete(slot) && !duplicate;
          return (
            <section
              key={slot.id}
              className={`${styles.panel} ${css.slotCard} ${complete ? '' : css.slotIncomplete}`}
              aria-label={`Slot ${index + 1}`}
            >
              <div className={styles.panelHeader}>
                <span>
                  Slot {index + 1}
                  <span className={css.slotKind}>{slot.kind}</span>
                </span>
                {complete ? (
                  <span className={`${styles.badge} ${styles.badgeGreen}`}>
                    <CheckIcon size={12} /> Ready
                  </span>
                ) : (
                  <span className={`${styles.badge} ${duplicate ? styles.badgeRed : styles.badgeAmber}`}>
                    {duplicate ? 'Product used in another slot' : missingText(slot)}
                  </span>
                )}
              </div>
              <div className={`${styles.panelBody} ${css.slotBody}`}>
                <div className={css.slotControls}>
                  {isProductSlot(slot.kind) ? renderProductControls(slot, index) : renderMessageControls(slot, index)}
                </div>
                <div className={css.slotPreview}>{renderPreview(slot)}</div>
              </div>
            </section>
          );
        })}
      </div>

    </div>
  );
};

export default Step08Templates;
