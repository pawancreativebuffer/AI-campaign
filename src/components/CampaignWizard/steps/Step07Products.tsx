import React, { useState } from 'react';
import styles from '../wizard.module.css';
import local from './Step07Products.module.css';
import { PRODUCT_SLOT_KINDS } from '../options';
import { PRODUCT_CATALOG } from '../mockData';
import { addProductSlots, formatCurrency, getStoreRanging, isProductSlot } from '../helpers';
import { AlertIcon, CheckIcon, CloseIcon, PlusIcon, RefreshIcon, SearchIcon, SparkleIcon, TrashIcon } from '../icons';
import type { CampaignProduct, CatalogProduct, StepProps, Store } from '../types';
import { describeDataSources, describeProductSource } from './promptBuilder';
import {
  CATALOG_BY_SKU,
  createUserProduct,
  formatNumber,
  getCatalogProduct,
  recommendProducts,
  savingAmount,
  savingPct,
  weeksOfCover,
} from './recommendation';

const MAX_SEARCH_RESULTS = 6;

const MAX_STORES_LISTED = 12;

const storeNames = (stores: Store[]) => {
  const names = stores.slice(0, MAX_STORES_LISTED).map(store => `${store.name} (${store.code})`);
  if (stores.length > MAX_STORES_LISTED) names.push(`and ${stores.length - MAX_STORES_LISTED} more`);
  return names.join(', ');
};

/** Which of the campaign's stores sell a product, so the user knows where its ad makes sense. */
const StoreRangingList: React.FC<{ sold: Store[]; notSold: Store[] }> = ({ sold, notSold }) => (
  <div className={local.ranging}>
    <div>
      <strong className={local.rangingSold}>Sold in {sold.length}:</strong> {sold.length > 0 ? storeNames(sold) : 'none of the selected stores'}
    </div>
    {notSold.length > 0 && (
      <>
        <div>
          <strong className={local.rangingNotSold}>Not sold in {notSold.length}:</strong> {storeNames(notSold)}
        </div>
        <div className={local.sub}>
          The campaign plays in every selected store, so screens in these stores would advertise a product that is not on
          their shelves.
        </div>
      </>
    )}
  </div>
);

const Step07Products: React.FC<StepProps> = ({ draft, update, goToStep }) => {
  const { products } = draft;
  const [generating, setGenerating] = useState(false);
  const [noMatches, setNoMatches] = useState(false);
  const [replacingSku, setReplacingSku] = useState<string | null>(null);
  const [reasonSku, setReasonSku] = useState<string | null>(null);
  const [storesSku, setStoresSku] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const userSelectedOnly = draft.brief.productSource === 'User-selected products';
  const storeCount = draft.storeIds.length;
  const approvedCount = products.filter(p => p.approved).length;
  const messageSlots = draft.slots.filter(slot => !isProductSlot(slot.kind));
  const messageBreakdown = Array.from(new Set(messageSlots.map(slot => slot.kind)))
    .map(kind => `${messageSlots.filter(slot => slot.kind === kind).length} ${kind.toLowerCase()}`)
    .join(', ');
  const aiCount = products.filter(p => p.source === 'ai').length;
  const inList = new Set(products.map(p => p.sku));
  const available = PRODUCT_CATALOG.filter(p => !inList.has(p.sku));

  // The slot plan from step 6 decides what each product is used for; this step only needs enough products.
  const productSlots = draft.slots.filter(slot => isProductSlot(slot.kind));
  const slotBreakdown = PRODUCT_SLOT_KINDS.map(kind => ({
    kind,
    count: productSlots.filter(slot => slot.kind === kind).length,
  }))
    .filter(item => item.count > 0)
    .map(item => `${item.count} ${item.kind.toLowerCase()}`)
    .join(', ');

  const term = query.trim().toLowerCase();
  const matches = term
    ? available.filter(p => p.sku.includes(term) || `${p.description} ${p.size}`.toLowerCase().includes(term))
    : [];

  const generate = () => {
    if (generating) return;
    setGenerating(true);
    setNoMatches(false);
    setReplacingSku(null);
    const manual = products.filter(p => p.source === 'manual');
    const picks = recommendProducts(draft, manual.map(p => p.sku));
    setTimeout(() => {
      update({ products: [...picks, ...manual] });
      setNoMatches(picks.length === 0);
      setGenerating(false);
    }, 900);
  };

  const patchProduct = (sku: string, patch: Partial<CampaignProduct>) =>
    update({ products: products.map(p => (p.sku === sku ? { ...p, ...patch } : p)) });

  const removeProduct = (sku: string) => {
    update({ products: products.filter(p => p.sku !== sku) });
    if (replacingSku === sku) setReplacingSku(null);
  };

  const replaceProduct = (sku: string, replacement: CatalogProduct) => {
    update({ products: products.map(p => (p.sku === sku ? createUserProduct(replacement, draft, sku) : p)) });
    setReplacingSku(null);
  };

  const addProduct = (product: CatalogProduct) => {
    update({ products: [...products, createUserProduct(product, draft)] });
    setNoMatches(false);
  };

  const addPanel = (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span>Add products manually</span>
        <span className={styles.panelHeaderMeta}>{available.length} catalog products available</span>
      </div>
      <div className={styles.panelBody}>
        <div className={`${styles.searchBox} ${local.addSearch}`}>
          <input
            type="text"
            className={styles.input}
            placeholder="Search by SKU or description"
            aria-label="Search the product catalog by SKU or description"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <SearchIcon />
        </div>
        {term && matches.length === 0 && (
          <div className={styles.helpText}>No catalog products match &quot;{query.trim()}&quot; that are not already in the campaign.</div>
        )}
        {matches.length > 0 && (
          <div className={local.resultList}>
            {matches.slice(0, MAX_SEARCH_RESULTS).map(product => (
              <div key={product.sku} className={local.resultItem}>
                <div>
                  <span className={local.resultName}>
                    {product.sku} - {product.description} {product.size}
                  </span>
                  <div className={local.sub}>
                    {product.category} | {product.brand} | {formatCurrency(product.promoPrice)} (was{' '}
                    {formatCurrency(product.regularPrice)}) | {formatNumber(product.stockOnHand)} in stock
                  </div>
                </div>
                <button type="button" className={styles.btnSmall} onClick={() => addProduct(product)}>
                  <PlusIcon size={14} /> Add
                </button>
              </div>
            ))}
          </div>
        )}
        {matches.length > MAX_SEARCH_RESULTS && (
          <div className={styles.helpText}>
            Showing {MAX_SEARCH_RESULTS} of {matches.length} matches. Keep typing to narrow the search.
          </div>
        )}
      </div>
    </div>
  );

  if (generating) {
    return (
      <div className={local.loading}>
        <span className={styles.spinner}></span>
        Analysing {draft.brief.dataToAnalyse.join(', ').toLowerCase() || 'retailer'} data for the {draft.objective || 'campaign'} objective...
      </div>
    );
  }

  return (
    <div>
      <p className={styles.sectionIntro}>
        Review the products recommended from your campaign brief. Approve, remove or replace each one, or add products
        yourself. Only approved products are used to generate content.
      </p>
      <div className={local.sourceNote}>
        <strong>Data source:</strong> {describeDataSources(draft.brief)} | <strong>Products:</strong>{' '}
        {describeProductSource(draft.brief)}
      </div>
      {draft.slots.length > 0 && (
        <div className={`${styles.alert} ${approvedCount === productSlots.length ? styles.alertSuccess : styles.alertError}`}>
          {approvedCount === productSlots.length ? <CheckIcon /> : <AlertIcon />}
          <div>
            <div>
              Your plan (step 6) has <strong>{draft.slots.length} slots</strong>:{' '}
              <strong>
                {productSlots.length} need{productSlots.length === 1 ? 's' : ''} a product
              </strong>
              {slotBreakdown && ` (${slotBreakdown})`}
              {messageSlots.length > 0 && (
                <>
                  {' '}and {messageSlots.length} {messageSlots.length === 1 ? 'is a message' : 'are messages'} with no product (
                  {messageBreakdown})
                </>
              )}
              .
            </div>
            <div className={local.bannerStatus}>
              {approvedCount === productSlots.length &&
                `${approvedCount} of ${productSlots.length} products approved: one for each product slot. You can continue.`}
              {approvedCount < productSlots.length &&
                `${approvedCount} of ${productSlots.length} products approved. Approve ${productSlots.length - approvedCount} more to continue.`}
              {approvedCount > productSlots.length &&
                `${approvedCount} products approved for ${productSlots.length} product slots: ${approvedCount - productSlots.length} too many. Unapprove or remove ${approvedCount - productSlots.length}, or add slots, to continue.`}
            </div>
            {approvedCount > productSlots.length && (
              <div className={local.bannerActions}>
                <button
                  type="button"
                  className={`${styles.btnSmall} ${styles.btnSmallDark}`}
                  onClick={() => update({ slots: addProductSlots(draft.slots, approvedCount - productSlots.length) })}
                >
                  <PlusIcon size={14} /> Add {approvedCount - productSlots.length} product slot
                  {approvedCount - productSlots.length === 1 ? '' : 's'} to the plan
                </button>
                <span className={local.sub}>
                  The loop becomes {draft.slots.length + approvedCount - productSlots.length} slots x {draft.slotSeconds} sec ={' '}
                  {(draft.slots.length + approvedCount - productSlots.length) * draft.slotSeconds} sec.
                </span>
              </div>
            )}
          </div>
        </div>
      )}


      {noMatches && (
        <div className={`${styles.alert} ${styles.alertWarning}`}>
          <AlertIcon />
          <div>
            No products matched the campaign brief. Relax the additional rules or the product selection on the{' '}
            Campaign Brief step, or add products manually below.{' '}
            <button type="button" className={styles.btnOutline} onClick={() => goToStep(6)}>
              Edit brief
            </button>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className={local.cta}>
          {userSelectedOnly ? (
            <>
              <div className={local.ctaTitle}>No products added yet</div>
              <div>
                The brief is set to user-selected products, so there are no AI recommendations. Search the catalog
                below to add the products for this campaign.
              </div>
            </>
          ) : (
            <>
              <div className={local.ctaTitle}>Get AI-recommended products</div>
              <div>
                Ticket-IT will rank the catalog against your brief ({draft.objective || 'no'} objective,{' '}
                {draft.brief.dataToAnalyse.length} data source{draft.brief.dataToAnalyse.length === 1 ? '' : 's'}) and
                propose products for the {storeCount} selected stores.
              </div>
              <button type="button" className={`${styles.btnWithIcon} ${styles.btnPink}`} onClick={generate}>
                <div className={styles.btnIcon}>
                  <SparkleIcon />
                </div>
                <div className={styles.btnText}>Generate Recommendations</div>
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <div className={styles.counter}>
              <strong>{approvedCount}</strong> of {products.length} products approved
            </div>
            <div className={styles.toolbarGroup}>
              <button
                type="button"
                className={styles.btnSmall}
                disabled={approvedCount === products.length}
                onClick={() => update({ products: products.map(p => ({ ...p, approved: true })) })}
              >
                <CheckIcon size={14} /> Approve all
              </button>
              {!userSelectedOnly && (
                <button type="button" className={`${styles.btnSmall} ${styles.btnSmallPink}`} onClick={generate}>
                  <RefreshIcon size={14} /> Regenerate recommendations
                </button>
              )}
            </div>
          </div>
          {!userSelectedOnly && (
            <div className={styles.helpText} style={{ marginTop: 0, marginBottom: 12 }}>
              Regenerating replaces the {aiCount} AI recommendation{aiCount === 1 ? '' : 's'} and keeps products you
              added or chose yourself.
            </div>
          )}

          <div className={styles.tableWrapper} style={{ marginBottom: 16 }}>
            <table className={`${styles.table} ${local.productTable}`}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th className={styles.numeric}>Promo price</th>
                  <th className={styles.numeric}>Was price</th>
                  <th className={styles.numeric}>Save</th>
                  <th className={styles.numeric}>Margin</th>
                  <th>Stock and stores</th>
                  <th className={local.actionsCol}></th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const catalog = getCatalogProduct(product.sku, draft);
                  const reasonOpen = reasonSku === product.sku;
                  const storesOpen = storesSku === product.sku;
                  const ranging = storesOpen ? getStoreRanging(product.sku, draft) : null;
                  return (
                    <React.Fragment key={product.sku}>
                      <tr>
                        <td className={local.sku}>{product.sku}</td>
                        <td className={local.description}>
                          {product.description}
                          <div className={local.sub}>
                            {product.size}
                            {product.source === 'manual' && ' | Added by you'}
                          </div>
                          <button
                            type="button"
                            className={local.whyBtn}
                            aria-expanded={reasonOpen}
                            onClick={() => setReasonSku(reasonOpen ? null : product.sku)}
                          >
                            {reasonOpen ? 'Hide reason' : product.source === 'ai' ? 'Why recommended?' : 'Details'}
                          </button>
                        </td>
                        <td className={`${styles.numeric} ${local.promoPrice}`}>{formatCurrency(product.promoPrice)}</td>
                        <td className={styles.numeric}>{formatCurrency(product.regularPrice)}</td>
                        <td className={styles.numeric}>
                          {formatCurrency(savingAmount(product))}
                          <div className={local.sub}>{savingPct(product)}% off</div>
                        </td>
                        <td className={styles.numeric}>{product.marginPct}%</td>
                        <td className={local.stock}>
                          {formatNumber(product.stockOnHand)} units
                          {catalog && <div className={local.sub}>{weeksOfCover(catalog).toFixed(1)} weeks of cover</div>}
                          <button
                            type="button"
                            className={`${local.whyBtn} ${product.eligibleStores < storeCount ? local.storesWarn : ''}`}
                            aria-expanded={storesOpen}
                            onClick={() => setStoresSku(storesOpen ? null : product.sku)}
                          >
                            Sold in {product.eligibleStores} of {storeCount} stores {storesOpen ? '▲' : '▼'}
                          </button>
                        </td>
                        <td className={local.actionsCol}>
                          <div className={`${styles.rowActions} ${local.actions}`}>
                            <button
                              type="button"
                              aria-pressed={product.approved}
                              className={`${local.approveBtn} ${product.approved ? local.approveBtnOn : ''}`}
                              onClick={() => patchProduct(product.sku, { approved: !product.approved })}
                            >
                              {product.approved && <CheckIcon size={14} />}
                              {product.approved ? 'Approved' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              className={styles.btnOutline}
                              disabled={available.length === 0}
                              onClick={() => setReplacingSku(replacingSku === product.sku ? null : product.sku)}
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.iconBtnGhost}`}
                              aria-label={`Remove ${product.description}`}
                              title="Remove"
                              onClick={() => removeProduct(product.sku)}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {reasonOpen && (
                        <tr className={local.replaceRow}>
                          <td colSpan={8}>
                            <strong>AI recommendation reason:</strong> {product.reason}
                          </td>
                        </tr>
                      )}
                      {ranging && (
                        <tr className={local.replaceRow}>
                          <td colSpan={8}>
                            <StoreRangingList sold={ranging.sold} notSold={ranging.notSold} />
                          </td>
                        </tr>
                      )}
                      {replacingSku === product.sku && (
                        <tr className={local.replaceRow}>
                          <td colSpan={8}>
                            <div className={local.replaceBar}>
                              <span>
                                Replace {product.sku} {product.description} with:
                              </span>
                              <select
                                className={`${styles.select} ${local.replaceSelect}`}
                                value=""
                                aria-label={`Replacement for ${product.description}`}
                                onChange={e => {
                                  const replacement = CATALOG_BY_SKU.get(e.target.value);
                                  if (replacement) replaceProduct(product.sku, replacement);
                                }}
                              >
                                <option value="">Select a product</option>
                                {available.map(option => (
                                  <option key={option.sku} value={option.sku}>
                                    {option.sku} - {option.description} {option.size} ({formatCurrency(option.promoPrice)})
                                  </option>
                                ))}
                              </select>
                              <button type="button" className={styles.btnOutline} onClick={() => setReplacingSku(null)}>
                                <CloseIcon size={14} /> Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {addPanel}
    </div>
  );
};

export default Step07Products;
