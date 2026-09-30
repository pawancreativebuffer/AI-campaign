import React, { useEffect, useRef, useState } from 'react';
import styles from '../wizard.module.css';
import css from './Step09Preview.module.css';
import ContentPreview from './ContentPreview';
import { ESL_COLOUR_LABELS } from '../mockData';
import { TEMPLATE_BY_ID, getRequiredFormats, mediaLabel, unique } from '../helpers';
import { AlertIcon, CheckIcon, RefreshIcon, SparkleIcon } from '../icons';
import type { ContentFormat, DeviceMedia, StepProps, Template } from '../types';

interface FormatTemplate {
  format: ContentFormat;
  template: Template;
}

interface Filters {
  media: 'all' | DeviceMedia;
  format: string;
  size: string;
  sku: string;
}

const ALL = 'all';
const NO_FILTERS: Filters = { media: ALL, format: ALL, size: ALL, sku: ALL };
const PAGE_SIZE = 24;
const GENERATION_TICKS = 12;
const TICK_MS = 150;

// "Format" is the orientation of a screen or the colour capability of a label; "size" is its resolution or label size.
const formatOf = (f: ContentFormat) =>
  f.media === 'signage' ? f.orientation : (ESL_COLOUR_LABELS[f.eslColour] ?? f.eslColour);
const sizeOf = (f: ContentFormat) => (f.media === 'signage' ? f.resolution : f.eslSize);
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const Step09Preview: React.FC<StepProps> = ({ draft, update, errors, showErrors, goToStep }) => {
  const [tick, setTick] = useState<number | null>(null); // null = not generating
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const formats = getRequiredFormats(draft);
  const approved = draft.products.filter(p => p.approved);
  const pairs: FormatTemplate[] = formats.flatMap(format => {
    const template = TEMPLATE_BY_ID.get(draft.templateSelections[format.key] ?? '');
    return template ? [{ format, template }] : [];
  });
  const missingTemplates = formats.length - pairs.length;
  const total = approved.length * pairs.length;

  if (formats.length === 0 || approved.length === 0 || missingTemplates > 0) {
    const problem =
      formats.length === 0
        ? { text: 'No devices are selected, so there are no content formats to generate.', step: 5, action: 'Select Devices' }
        : approved.length === 0
          ? { text: 'No products are approved. Approve at least one product to generate content.', step: 7, action: 'Select Products' }
          : {
              text: `${plural(missingTemplates, 'format')} of ${formats.length} still ${missingTemplates === 1 ? 'needs' : 'need'} a template before content can be generated.`,
              step: 8,
              action: 'Select Templates',
            };
    return (
      <div className={styles.emptyState}>
        <p className={css.emptyText}>{problem.text}</p>
        <button
          type="button"
          className={`${styles.btnSmall} ${styles.btnSmallPink}`}
          onClick={() => goToStep(problem.step)}
        >
          {problem.action}
        </button>
      </div>
    );
  }

  const generate = () => {
    if (timer.current) clearInterval(timer.current);
    if (draft.contentGenerated) update({ contentGenerated: false });
    setFilters(NO_FILTERS);
    setVisible(PAGE_SIZE);
    setTick(0);
    let current = 0;
    timer.current = setInterval(() => {
      current += 1;
      if (current < GENERATION_TICKS) {
        setTick(current);
        return;
      }
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setTick(null);
      update({ contentGenerated: true });
    }, TICK_MS);
  };

  if (tick !== null) {
    const done = Math.round((total * tick) / GENERATION_TICKS);
    return (
      <div className={css.generating} role="status">
        <span className={styles.spinner}></span>
        <div className={css.generatingTitle}>Generating content...</div>
        <div className={css.progressTrack}>
          <div className={css.progressFill} style={{ width: `${(tick / GENERATION_TICKS) * 100}%` }}></div>
        </div>
        <div className={styles.helpText}>
          {done} of {plural(total, 'output')} rendered from the approved templates
        </div>
      </div>
    );
  }

  const summary = (
    <div className={styles.statGrid}>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Approved products</div>
        <div className={styles.statValue}>{approved.length}</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Formats</div>
        <div className={styles.statValue}>{pairs.length}</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Outputs ({approved.length} x {pairs.length})</div>
        <div className={styles.statValue}>{total}</div>
      </div>
    </div>
  );

  if (!draft.contentGenerated) {
    return (
      <div>
        <p className={styles.sectionIntro}>
          Content is generated for every approved product in every required format, using the template selected for
          that format. {plural(approved.length, 'approved product')} x {plural(pairs.length, 'format')} ={' '}
          <strong>{plural(total, 'output')}</strong>.
        </p>

        {summary}

        {showErrors && errors.content && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <AlertIcon />
            <div>{errors.content}</div>
          </div>
        )}

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>What will be generated</span>
            <span className={styles.panelHeaderMeta}>{plural(total, 'output')}</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Media</th>
                  <th>Format / size</th>
                  <th className={styles.numeric}>Devices</th>
                  <th>Template</th>
                  <th>Type</th>
                  <th className={styles.numeric}>Outputs</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map(({ format, template }) => (
                  <tr key={format.key}>
                    <td>{mediaLabel(format.media)}</td>
                    <td>{format.label}</td>
                    <td className={styles.numeric}>{format.deviceCount}</td>
                    <td>{template.name}</td>
                    <td>
                      <span className={`${styles.badge} ${template.kind === 'Animated' ? styles.badgeBlue : ''}`}>
                        {template.kind}
                      </span>
                    </td>
                    <td className={styles.numeric}>{approved.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={css.generateRow}>
          <button type="button" className={`${styles.btnWithIcon} ${styles.btnPink}`} onClick={generate}>
            <div className={styles.btnIcon}>
              <SparkleIcon />
            </div>
            <div className={styles.btnText}>Generate Content</div>
          </button>
        </div>
      </div>
    );
  }

  // ----- Generated: preview each output by media type, format and size -----
  const changeFilters = (patch: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...patch }));
    setVisible(PAGE_SIZE);
  };

  const mediaOptions = unique(pairs.map(p => p.format.media));
  const mediaPairs = pairs.filter(p => filters.media === ALL || p.format.media === filters.media);
  const formatOptions = unique(mediaPairs.map(p => formatOf(p.format)));
  const formatPairs = mediaPairs.filter(p => filters.format === ALL || formatOf(p.format) === filters.format);
  const sizeOptions = unique(formatPairs.map(p => sizeOf(p.format)));
  const shownPairs = formatPairs.filter(p => filters.size === ALL || sizeOf(p.format) === filters.size);
  const shownProducts = approved.filter(p => filters.sku === ALL || p.sku === filters.sku);
  const outputs = shownPairs.flatMap(pair => shownProducts.map(product => ({ ...pair, product })));
  const isFiltered = filters.media !== ALL || filters.format !== ALL || filters.size !== ALL || filters.sku !== ALL;

  return (
    <div>
      <div className={`${styles.alert} ${styles.alertSuccess}`}>
        <CheckIcon />
        <div>
          {plural(total, 'output')} generated from {plural(approved.length, 'approved product')} in{' '}
          {plural(pairs.length, 'format')}. Preview each output by media type, format and size below.
        </div>
      </div>

      {summary}

      <div className={styles.toolbar}>
        <div className={css.filters}>
          <label className={css.filter}>
            <span className={styles.label}>Media type</span>
            <select
              className={styles.select}
              value={filters.media}
              onChange={e => changeFilters({ media: e.target.value as Filters['media'], format: ALL, size: ALL })}
            >
              <option value={ALL}>All media</option>
              {mediaOptions.map(media => (
                <option key={media} value={media}>
                  {mediaLabel(media)}
                </option>
              ))}
            </select>
          </label>
          <label className={css.filter}>
            <span className={styles.label}>Format</span>
            <select
              className={styles.select}
              value={filters.format}
              onChange={e => changeFilters({ format: e.target.value, size: ALL })}
            >
              <option value={ALL}>All formats</option>
              {formatOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className={css.filter}>
            <span className={styles.label}>Size</span>
            <select className={styles.select} value={filters.size} onChange={e => changeFilters({ size: e.target.value })}>
              <option value={ALL}>All sizes</option>
              {sizeOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className={css.filter}>
            <span className={styles.label}>Product</span>
            <select className={styles.select} value={filters.sku} onChange={e => changeFilters({ sku: e.target.value })}>
              <option value={ALL}>All products</option>
              {approved.map(product => (
                <option key={product.sku} value={product.sku}>
                  {product.description} {product.size}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.toolbarGroup}>
          {isFiltered && (
            <button type="button" className={styles.btnOutline} onClick={() => changeFilters(NO_FILTERS)}>
              Clear filters
            </button>
          )}
          <button type="button" className={styles.btnOutline} onClick={generate}>
            <RefreshIcon size={14} /> Regenerate Content
          </button>
        </div>
      </div>

      <div className={css.resultCount}>
        Showing {Math.min(visible, outputs.length)} of {plural(outputs.length, 'output')}
        {isFiltered && ` (${total} in total)`}
      </div>

      {outputs.length === 0 ? (
        <div className={styles.emptyState}>No outputs match these filters.</div>
      ) : (
        <div className={css.outputGrid}>
          {outputs.slice(0, visible).map(({ format, template, product }) => (
            <article key={`${format.key}|${product.sku}`} className={css.outputCard}>
              <div className={css.stage}>
                <ContentPreview template={template} format={format} product={product} size="large" />
              </div>
              <div className={css.outputBody}>
                <div className={css.outputTitle}>
                  {product.description} <span className={css.outputSize}>{product.size}</span>
                </div>
                <div className={css.outputBadges}>
                  <span className={`${styles.badge} ${styles.badgePink}`}>{mediaLabel(format.media)}</span>
                  <span className={`${styles.badge} ${template.kind === 'Animated' ? styles.badgeBlue : ''}`}>
                    {template.kind}
                  </span>
                </div>
                <dl className={css.outputMeta}>
                  <dt>Format / size</dt>
                  <dd>{format.label}</dd>
                  <dt>Template</dt>
                  <dd>{template.name}</dd>
                  <dt>Devices</dt>
                  <dd>{format.deviceCount}</dd>
                </dl>
              </div>
            </article>
          ))}
        </div>
      )}

      {outputs.length > visible && (
        <div className={css.generateRow}>
          <button type="button" className={styles.btnOutline} onClick={() => setVisible(v => v + PAGE_SIZE)}>
            Show more ({outputs.length - visible} remaining)
          </button>
        </div>
      )}
    </div>
  );
};

export default Step09Preview;
