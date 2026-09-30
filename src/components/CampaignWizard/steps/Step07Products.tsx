import React, { useState } from 'react';
import styles from '../wizard.module.css';
import local from './Step07Products.module.css';
import { CONTENT_TYPES } from '../options';
import { PRODUCT_CATALOG } from '../mockData';
import { formatCurrency } from '../helpers';
import { AlertIcon, CheckIcon, CloseIcon, PlusIcon, RefreshIcon, SearchIcon, SparkleIcon, TrashIcon } from '../icons';
import type { CampaignProduct, CatalogProduct, StepProps } from '../types';
import {
  CATALOG_BY_SKU,
  createUserProduct,
  formatNumber,
  recommendProducts,
  savingAmount,
  savingPct,
  weeksOfCover,
} from './recommendation';

const MAX_SEARCH_RESULTS = 6;

const Step07Products: React.FC<StepProps> = ({ draft, update, errors, showErrors, goToStep }) => {
  const { products } = draft;
  const [generating, setGenerating] = useState(false);
  const [noMatches, setNoMatches] = useState(false);
  const [replacingSku, setReplacingSku] = useState<string | null>(null);
  const [reasonSku, setReasonSku] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const userSelectedOnly = draft.brief.productSource === 'User-selected products';
  const storeCount = draft.storeIds.length;
  const approvedCount = products.filter(p => p.approved).length;
  const aiCount = products.filter(p => p.source === 'ai').length;
  const inList = new Set(products.map(p => p.sku));
  const available = PRODUCT_CATALOG.filter(p => !inList.has(p.sku));

  const baseContentTypes = draft.brief.contentRequired.length > 0 ? draft.brief.contentRequired : CONTENT_TYPES;

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

  const errorAlert = showErrors && errors.products && (
    <div className={`${styles.alert} ${styles.alertError}`}>
      <AlertIcon />
      <div>{errors.products}</div>
    </div>
  );

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

      {errorAlert}

      {noMatches && (
        <div className={`${styles.alert} ${styles.alertWarning}`}>
          <AlertIcon />
          <div>
            No products matched the campaign brief. Relax the additional rules or the product selection on the{' '}
            Campaign Brief screen, or add products manually below.{' '}
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
                  <th>Product</th>
                  <th className={styles.numeric}>Price</th>
                  <th className={styles.numeric}>Margin</th>
                  <th>Stock and stores</th>
                  <th>Content type</th>
                  <th className={local.actionsCol}></th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const catalog = CATALOG_BY_SKU.get(product.sku);
                  const contentTypes = baseContentTypes.includes(product.contentType)
                    ? baseContentTypes
                    : [product.contentType, ...baseContentTypes];
                  const reasonOpen = reasonSku === product.sku;
                  return (
                    <React.Fragment key={product.sku}>
                      <tr>
                        <td className={local.description}>
                          {product.description}
                          <div className={local.sub}>
                            SKU {product.sku} | {product.size}
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
                        <td className={styles.numeric}>
                          <span className={local.promoPrice}>{formatCurrency(product.promoPrice)}</span>
                          <div className={local.sub}>Was {formatCurrency(product.regularPrice)}</div>
                          <div className={local.sub}>
                            Save {formatCurrency(savingAmount(product))} ({savingPct(product)}%)
                          </div>
                        </td>
                        <td className={styles.numeric}>{product.marginPct}%</td>
                        <td className={local.stock}>
                          {formatNumber(product.stockOnHand)} units
                          {catalog && <div className={local.sub}>{weeksOfCover(catalog).toFixed(1)} weeks of cover</div>}
                          <div className={local.sub}>
                            Eligible in {product.eligibleStores} of {storeCount} stores
                          </div>
                        </td>
                        <td>
                          <select
                            className={`${styles.select} ${local.contentSelect}`}
                            value={product.contentType}
                            aria-label={`Content type for ${product.description}`}
                            onChange={e => patchProduct(product.sku, { contentType: e.target.value })}
                          >
                            {contentTypes.map(type => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
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
                          <td colSpan={6}>
                            <strong>AI recommendation reason:</strong> {product.reason}
                          </td>
                        </tr>
                      )}
                      {replacingSku === product.sku && (
                        <tr className={local.replaceRow}>
                          <td colSpan={6}>
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
