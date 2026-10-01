import React, { useState } from 'react';
import styles from '../wizard.module.css';
import local from './Step06Brief.module.css';
import {
  DATA_SOURCES,
  DATA_TO_ANALYSE,
  ESL_MAX_CHANGES_PER_DAY,
  EXTERNAL_FACTORS,
  MAX_SLOTS,
  MAX_SLOT_SECONDS,
  MIN_SLOT_SECONDS,
  OBJECTIVES,
  PRODUCT_SOURCES,
  SLOT_KINDS,
  SLOT_PRESETS,
  UPLOADED_PRODUCT_SOURCE,
} from '../options';
import { PRODUCT_BRANDS, PRODUCT_CATEGORIES, PRODUCT_SUPPLIERS } from '../mockData';
import {
  createDefaultSlots,
  createSlot,
  getAvailableDataTypes,
  getLoopSeconds,
  isProductSlot,
  nextSlotId,
  slotKindsInUse,
  toggleValue,
} from '../helpers';
import { AlertIcon, CheckIcon, EditIcon, EyeIcon, PlusIcon, RefreshIcon, SparkleIcon, TrashIcon } from '../icons';
import { VALIDATION_ENABLED } from '../validation';
import type { CampaignBrief, CampaignDraft, CampaignSlot, StepProps } from '../types';
import { buildCampaignPrompt, cleanRules, describeDataSources, describeProductSource, sourceNeedsDetail } from './promptBuilder';
import { downloadCsv, parseDataFile, parseProductFile, sampleDataCsv, sampleProductCsv } from './fileImport';

const RULE_MAX_LENGTH = 120;
const MAX_RULES = 8;

const RULE_EXAMPLES = [
  'Exclude products with fewer than 500 units in stock',
  'Exclude Spirits',
  'Prioritise Wine',
  'Only include products with a margin above 25%',
];

const DETAIL_OPTIONS: Record<string, string[]> = {
  Category: PRODUCT_CATEGORIES,
  Supplier: PRODUCT_SUPPLIERS,
  Brand: PRODUCT_BRANDS,
};

interface UploadBoxProps {
  id: string;
  fileName: string | null;
  summary: string;
  unmatched: string[];
  error: string;
  busy: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
  onSample: () => void;
  hint: string;
}

const UploadBox: React.FC<UploadBoxProps> = ({ id, fileName, summary, unmatched, error, busy, onFile, onRemove, onSample, hint }) => (
  <div className={local.uploadBox}>
    <div className={local.uploadRow}>
      <label htmlFor={id} className={`${styles.btnSmall} ${styles.btnSmallDark} ${local.uploadBtn}`}>
        <UploadIcon /> {fileName ? 'Replace file' : 'Choose file'}
      </label>
      <input
        id={id}
        type="file"
        accept=".xlsx,.csv"
        className={local.fileInput}
        disabled={busy}
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
      <button type="button" className={styles.btnOutline} onClick={onSample}>
        Download sample file
      </button>
      {busy && <span className={styles.helpText}>Reading file...</span>}
    </div>
    {fileName ? (
      <div className={local.uploadFile}>
        <CheckIcon size={14} />
        <span>
          <strong>{fileName}</strong> - {summary}
        </span>
        <button type="button" className={local.linkBtn} onClick={onRemove}>
          Remove
        </button>
      </div>
    ) : (
      <div className={styles.helpText}>{hint}</div>
    )}
    {fileName && unmatched.length > 0 && (
      <div className={local.uploadWarning}>
        {unmatched.length} SKU{unmatched.length === 1 ? '' : 's'} in the file {unmatched.length === 1 ? 'is' : 'are'} not in
        the product catalog and {unmatched.length === 1 ? 'was' : 'were'} skipped: {unmatched.slice(0, 8).join(', ')}
        {unmatched.length > 8 ? ` and ${unmatched.length - 8} more` : ''}.
      </div>
    )}
    {error && <div className={styles.errorText}>{error}</div>}
  </div>
);

const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const ChevronIcon = ({ up }: { up: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points={up ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}></polyline>
  </svg>
);

const plural = (count: number, word: string) => (count === 1 || word.endsWith('s') ? word : `${word}s`);

/** e.g. "5 product promotions, 1 loyalty advert, 1 seasonal greeting, 1 opening hours". */
const describeSlotBreakdown = (slots: CampaignSlot[]) =>
  slotKindsInUse(slots)
    .map(kind => {
      const count = slots.filter(slot => slot.kind === kind).length;
      return `${count} ${plural(count, kind.toLowerCase())}`;
    })
    .join(', ');

/** e.g. "8 slots x 8 sec = 64-second loop". */
const describeSlotLoop = (draft: Pick<CampaignDraft, 'slots' | 'slotSeconds'>) =>
  `${draft.slots.length} slot${draft.slots.length === 1 ? '' : 's'} x ${draft.slotSeconds} sec = ${getLoopSeconds(draft)}-second loop`;

const isValidSlotSeconds = (seconds: number) =>
  Number.isInteger(seconds) && seconds >= MIN_SLOT_SECONDS && seconds <= MAX_SLOT_SECONDS;

const fileError = (error: unknown) => (error instanceof Error ? error.message : 'The file could not be read.');

const Step06Brief: React.FC<StepProps> = ({ draft, update, errors, showErrors }) => {
  const { brief } = draft;
  const [editing, setEditing] = useState(!draft.prompt);
  const [generating, setGenerating] = useState(false);
  const [reading, setReading] = useState<'data' | 'products' | null>(null);
  const [dataFileError, setDataFileError] = useState('');
  const [productFileError, setProductFileError] = useState('');

  const hasPrompt = draft.prompt.trim() !== '';
  const isStale = hasPrompt && draft.prompt !== buildCampaignPrompt(draft);
  const needsDetail = sourceNeedsDetail(brief.productSource);
  const briefHasErrors = !!(errors.dataSources || errors.dataToAnalyse || errors.productSource || errors.slots || errors.slotSeconds);
  const availableData = getAvailableDataTypes(brief);
  const usesUpload = brief.dataSources.includes('upload');
  const usesProductFile = brief.productSource === UPLOADED_PRODUCT_SOURCE;
  const showAnswers = editing || !hasPrompt || briefHasErrors;

  const missing: string[] = [];
  if (!draft.objective) missing.push('campaign objective');
  if (brief.dataSources.length === 0) missing.push('data source');
  else if (usesUpload && !brief.dataFile) missing.push('data file');
  if (brief.dataToAnalyse.length === 0) missing.push('data to analyse');
  if (!brief.productSource) missing.push('products to consider');
  else if (usesProductFile && !brief.productFile) missing.push('product list file');
  else if (needsDetail && !brief.productSourceDetail) missing.push(brief.productSource.toLowerCase());
  if (draft.slots.length === 0) missing.push('campaign slots');
  if (!isValidSlotSeconds(draft.slotSeconds)) missing.push('seconds per slot');
  if (!VALIDATION_ENABLED) missing.length = 0;

  const setBrief = (patch: Partial<CampaignBrief>) => update({ brief: { ...brief, ...patch } });

  // Data that the chosen sources cannot supply is deselected along with the source.
  const setSources = (patch: Pick<Partial<CampaignBrief>, 'dataSources' | 'dataFile'>) => {
    const next = { ...brief, ...patch };
    const available = getAvailableDataTypes(next);
    setBrief({ ...patch, dataToAnalyse: brief.dataToAnalyse.filter(type => available.includes(type)) });
  };

  const handleDataFile = async (file: File) => {
    setDataFileError('');
    setReading('data');
    try {
      setSources({ dataFile: await parseDataFile(file) });
    } catch (error) {
      setDataFileError(fileError(error));
    } finally {
      setReading(null);
    }
  };

  const handleProductFile = async (file: File) => {
    setProductFileError('');
    setReading('products');
    try {
      setBrief({ productFile: await parseProductFile(file) });
    } catch (error) {
      setProductFileError(fileError(error));
    } finally {
      setReading(null);
    }
  };

  const usesEsl = draft.media === 'esl' || draft.media === 'both';
  const slotBreakdown = describeSlotBreakdown(draft.slots);
  const setSlots = (slots: CampaignSlot[]) => update({ slots });

  // Keeps the slots already planned; adds product promotions at the end or trims from the end.
  const applyPreset = (count: number, seconds: number) => {
    const slots = draft.slots.slice(0, count);
    while (slots.length < count) slots.push(createSlot(nextSlotId(slots)));
    update({ slotSeconds: seconds, slots });
  };

  // Product, design and message text belong to the old kind, so they are cleared.
  const setSlotKind = (index: number, kind: string) =>
    setSlots(draft.slots.map((slot, i) => (i === index && slot.kind !== kind ? createSlot(slot.id, kind) : slot)));

  const moveSlot = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= draft.slots.length) return;
    const slots = [...draft.slots];
    [slots[index], slots[target]] = [slots[target], slots[index]];
    setSlots(slots);
  };

  const setRule = (index: number, value: string) =>
    setBrief({ additionalRules: brief.additionalRules.map((rule, i) => (i === index ? value : rule)) });

  const generate = () => {
    if (generating || missing.length > 0) return;
    setGenerating(true);
    const prompt = buildCampaignPrompt(draft);
    setTimeout(() => {
      update({ prompt });
      setGenerating(false);
      setEditing(false);
    }, 700);
  };

  const panelTitle = (number: number, title: string, required: boolean) => (
    <span className={local.panelTitle}>
      <span className={local.number}>{number}</span>
      <span>
        {title} {required && <span className={styles.required}>*</span>}
      </span>
    </span>
  );

  const regenerateButton = (
    <button type="button" className={`${styles.btnSmall} ${styles.btnSmallPink}`} onClick={generate} disabled={generating || missing.length > 0}>
      <RefreshIcon size={14} /> Regenerate Prompt
    </button>
  );

  if (!showAnswers) {
    const rules = cleanRules(brief.additionalRules);
    return (
      <div>
        <p className={styles.sectionIntro}>
          Ticket-IT has combined your answers with the campaign schedule, stores, media and selected devices to build
          the AI prompt. You do not need to write or edit it yourself.
        </p>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>Your answers</span>
            <button type="button" className={styles.btnOutline} onClick={() => setEditing(true)} disabled={generating}>
              <EditIcon size={14} /> Edit Answers
            </button>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.infoGrid}>
              <div>
                <div className={styles.infoLabel}>Campaign objective</div>
                <div className={styles.infoValue}>{draft.objective || '-'}</div>
              </div>
              <div>
                <div className={styles.infoLabel}>Data source</div>
                <div className={styles.infoValue}>{describeDataSources(brief)}</div>
              </div>
              <div>
                <div className={styles.infoLabel}>Data to analyse</div>
                <div className={styles.infoValue}>{brief.dataToAnalyse.join(', ') || '-'}</div>
              </div>
              <div>
                <div className={styles.infoLabel}>Products to consider</div>
                <div className={styles.infoValue}>{describeProductSource(brief)}</div>
              </div>
              <div>
                <div className={styles.infoLabel}>External factors</div>
                <div className={styles.infoValue}>{brief.externalFactors.join(', ') || 'None'}</div>
              </div>
              <div>
                <div className={styles.infoLabel}>Content required: campaign slots</div>
                <div className={styles.infoValue}>
                  {draft.slots.length === 0 ? '-' : `${describeSlotLoop(draft)}: ${slotBreakdown}`}
                </div>
              </div>
              <div>
                <div className={styles.infoLabel}>Additional rules</div>
                <div className={styles.infoValue}>{rules.length === 0 ? 'None' : `${rules.length} rule${rules.length === 1 ? '' : 's'}`}</div>
              </div>
            </div>
            {rules.length > 0 && (
              <ul className={local.ruleSummary}>
                {rules.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {isStale && (
          <div className={`${styles.alert} ${styles.alertWarning}`}>
            <AlertIcon />
            <div className={local.alertBody}>
              This prompt is out of date. Your answers or the campaign setup (schedule, stores, media or devices) have
              changed since it was generated. Regenerate the prompt before you continue.
              <div className={local.alertAction}>{regenerateButton}</div>
            </div>
          </div>
        )}

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>Generated AI prompt</span>
            <span className={`${styles.badge} ${isStale ? styles.badgeAmber : styles.badgeGreen}`}>
              {isStale ? 'Out of date' : 'Up to date'}
            </span>
          </div>
          <div className={styles.panelBody}>
            {generating ? (
              <div className={local.generating}>
                <span className={styles.spinner}></span> Building the prompt from your answers...
              </div>
            ) : (
              <textarea
                className={styles.promptTextarea}
                value={draft.prompt}
                rows={20}
                readOnly
                aria-label="Generated AI prompt"
              />
            )}
            <div className={local.promptActions}>
              <button type="button" className={styles.btnOutline} onClick={() => setEditing(true)} disabled={generating}>
                <EditIcon size={14} /> Edit Answers
              </button>
              {regenerateButton}
              {!isStale && !generating && (
                <span className={local.continueHint}>Happy with the prompt? Select Continue to see the recommended products.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className={styles.sectionIntro}>
        Answer the questions below instead of writing an AI prompt. Ticket-IT combines your answers with the campaign
        schedule, stores, media and selected devices to generate the complete prompt for you.
      </p>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>{panelTitle(1, 'Campaign objective', true)}</div>
        <div className={styles.panelBody}>
          <div className={styles.chipGroup}>
            {OBJECTIVES.map(objective => (
              <button
                key={objective}
                type="button"
                className={`${styles.chip} ${draft.objective === objective ? styles.chipSelected : ''}`}
                aria-pressed={draft.objective === objective}
                onClick={() => update({ objective })}
              >
                {objective}
              </button>
            ))}
          </div>
          <div className={styles.helpText}>Carried over from the Create Campaign step. Changing it here updates the campaign.</div>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          {panelTitle(2, 'Data to analyse', true)}
          <span className={styles.panelHeaderMeta}>{brief.dataToAnalyse.length} selected</span>
        </div>
        <div className={styles.panelBody}>
          <div className={local.subLabel}>
            Where does the data come from? <span className={styles.required}>*</span>
          </div>
          <div className={local.sourceCards}>
            {DATA_SOURCES.map(source => {
              const selected = brief.dataSources.includes(source.value);
              const provides = source.value === 'upload' ? (brief.dataFile?.provides ?? []) : source.provides;
              return (
                <button
                  key={source.value}
                  type="button"
                  aria-pressed={selected}
                  className={`${local.sourceCard} ${selected ? local.sourceCardSelected : ''}`}
                  onClick={() => setSources({ dataSources: toggleValue(brief.dataSources, source.value) })}
                >
                  <span className={local.sourceCheck}>{selected && <CheckIcon size={12} />}</span>
                  <span className={local.sourceText}>
                    <span className={local.sourceName}>
                      {source.label}
                      {source.value !== 'upload' && <span className={styles.badge}>Sample data</span>}
                    </span>
                    <span className={local.sourceDescription}>{source.description}</span>
                    <span className={local.sourceProvides}>
                      Provides: {provides.length > 0 ? provides.join(', ') : 'depends on the columns in your file'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {showErrors && errors.dataSources && <div className={styles.errorText}>{errors.dataSources}</div>}

          {usesUpload && (
            <UploadBox
              id="brief-data-file"
              fileName={brief.dataFile?.fileName ?? null}
              summary={
                brief.dataFile
                  ? `${brief.dataFile.rows.length} SKU${brief.dataFile.rows.length === 1 ? '' : 's'} matched, provides ${brief.dataFile.provides.join(', ')}`
                  : ''
              }
              unmatched={brief.dataFile?.unmatched ?? []}
              error={dataFileError}
              busy={reading === 'data'}
              onFile={handleDataFile}
              onRemove={() => setSources({ dataFile: null })}
              onSample={() => downloadCsv('sample-retail-data.csv', sampleDataCsv())}
              hint="Excel (.xlsx) or CSV with a SKU column and any of: Weekly units, Margin %, Stock on hand. Your figures replace the sample figures for those SKUs."
            />
          )}

          <div className={`${local.subLabel} ${local.subLabelSpaced}`}>
            What should be analysed? <span className={styles.required}>*</span>
          </div>
          <div className={styles.chipGroup}>
            {DATA_TO_ANALYSE.map(source => {
              const available = availableData.includes(source);
              const selected = brief.dataToAnalyse.includes(source);
              return (
                <button
                  key={source}
                  type="button"
                  className={`${styles.chip} ${selected ? styles.chipSelected : ''} ${available ? '' : local.chipDisabled}`}
                  aria-pressed={selected}
                  disabled={!available}
                  title={available ? undefined : 'Not provided by the selected data sources'}
                  onClick={() => setBrief({ dataToAnalyse: toggleValue(brief.dataToAnalyse, source) })}
                >
                  {source}
                </button>
              );
            })}
          </div>
          <div className={styles.helpText}>
            {brief.dataSources.length === 0
              ? 'Select a data source first. Each source provides different data.'
              : 'Greyed-out data is not provided by the selected sources.'}
          </div>
          {showErrors && errors.dataToAnalyse && <div className={styles.errorText}>{errors.dataToAnalyse}</div>}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>{panelTitle(3, 'Products to consider', true)}</div>
        <div className={styles.panelBody}>
          <div className={styles.chipGroup}>
            {PRODUCT_SOURCES.map(source => (
              <button
                key={source}
                type="button"
                className={`${styles.chip} ${brief.productSource === source ? styles.chipSelected : ''}`}
                aria-pressed={brief.productSource === source}
                onClick={() => {
                  if (source !== brief.productSource) setBrief({ productSource: source, productSourceDetail: '' });
                }}
              >
                {source}
              </button>
            ))}
          </div>
          {showErrors && errors.productSource && <div className={styles.errorText}>{errors.productSource}</div>}

          {needsDetail && (
            <div className={`${styles.formGroup} ${local.detailRow}`}>
              <label className={styles.label} htmlFor="brief-source-detail">
                {brief.productSource} <span className={styles.required}>*</span>
              </label>
              <select
                id="brief-source-detail"
                className={`${styles.select} ${showErrors && !brief.productSourceDetail ? styles.inputError : ''}`}
                value={brief.productSourceDetail}
                onChange={e => setBrief({ productSourceDetail: e.target.value })}
              >
                <option value="">Select a {brief.productSource.toLowerCase()}</option>
                {(DETAIL_OPTIONS[brief.productSource] ?? []).map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}
          {usesProductFile && (
            <UploadBox
              id="brief-product-file"
              fileName={brief.productFile?.fileName ?? null}
              summary={
                brief.productFile
                  ? `${brief.productFile.rows.length} product${brief.productFile.rows.length === 1 ? '' : 's'} matched${
                      brief.productFile.rows.some(row => row.promoPrice !== undefined) ? ', promo prices taken from the file' : ''
                    }`
                  : ''
              }
              unmatched={brief.productFile?.unmatched ?? []}
              error={productFileError}
              busy={reading === 'products'}
              onFile={handleProductFile}
              onRemove={() => setBrief({ productFile: null })}
              onSample={() => downloadCsv('sample-product-list.csv', sampleProductCsv())}
              hint="Excel (.xlsx) or CSV with a SKU column and optionally a Promo price column. Only these products are used; they are ranked by your objective on the next step."
            />
          )}
          {brief.productSource === 'User-selected products' && (
            <div className={styles.helpText}>You will add the products yourself on the next step.</div>
          )}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          {panelTitle(4, 'External factors', false)}
          <span className={styles.panelHeaderMeta}>Optional</span>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.chipGroup}>
            {EXTERNAL_FACTORS.map(factor => (
              <button
                key={factor}
                type="button"
                className={`${styles.chip} ${brief.externalFactors.includes(factor) ? styles.chipSelected : ''}`}
                aria-pressed={brief.externalFactors.includes(factor)}
                onClick={() => setBrief({ externalFactors: toggleValue(brief.externalFactors, factor) })}
              >
                {factor}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          {panelTitle(5, 'Content required: campaign slots', true)}
          <span className={styles.panelHeaderMeta}>
            {draft.slots.length} slot{draft.slots.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.helpText} style={{ marginTop: 0, marginBottom: 14 }}>
            The campaign runs as a loop of slots. Each slot is one piece of content shown for the same number of
            seconds. You choose the product and design for each product slot on the next steps.
          </div>

          <div className={local.slotControls}>
            <div className={local.secondsField}>
              <label className={local.subLabel} htmlFor="brief-slot-seconds">
                Seconds per slot <span className={styles.required}>*</span>
              </label>
              <input
                id="brief-slot-seconds"
                type="number"
                min={MIN_SLOT_SECONDS}
                max={MAX_SLOT_SECONDS}
                step={1}
                className={`${styles.input} ${local.secondsInput} ${showErrors && errors.slotSeconds ? styles.inputError : ''}`}
                value={Number.isFinite(draft.slotSeconds) && draft.slotSeconds !== 0 ? draft.slotSeconds : ''}
                onChange={e => update({ slotSeconds: e.target.value === '' ? 0 : Number(e.target.value) })}
              />
            </div>
            <div className={local.presetField}>
              <div className={local.subLabel}>Quick structures</div>
              <div className={local.presetRow}>
                {SLOT_PRESETS.map(preset => {
                  const active = draft.slots.length === preset.slots && draft.slotSeconds === preset.seconds;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      className={`${styles.btnOutline} ${active ? local.presetActive : ''}`}
                      aria-pressed={active}
                      onClick={() => applyPreset(preset.slots, preset.seconds)}
                    >
                      {preset.label}
                    </button>
                  );
                })}
                <button type="button" className={styles.btnOutline} onClick={() => setSlots(createDefaultSlots())}>
                  <RefreshIcon size={14} /> Use example structure
                </button>
              </div>
            </div>
          </div>
          {showErrors && errors.slotSeconds ? (
            <div className={styles.errorText}>{errors.slotSeconds}</div>
          ) : (
            <div className={styles.helpText}>
              Between {MIN_SLOT_SECONDS} and {MAX_SLOT_SECONDS} seconds. The example structure is 5 product promotions,
              1 loyalty advert, 1 seasonal greeting and 1 opening hours slot.
            </div>
          )}

          {draft.slots.length > 0 && (
            <ol className={local.slotList}>
              {draft.slots.map((slot, index) => {
                const product = isProductSlot(slot.kind);
                return (
                  <li key={slot.id} className={local.slotRow}>
                    <span className={local.slotNumber}>{index + 1}</span>
                    <select
                      className={`${styles.select} ${local.slotSelect}`}
                      value={slot.kind}
                      aria-label={`Slot ${index + 1} content`}
                      onChange={e => setSlotKind(index, e.target.value)}
                    >
                      {SLOT_KINDS.map(kind => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </select>
                    <span className={`${styles.badge} ${product ? styles.badgePink : styles.badgeBlue} ${local.slotBadge}`}>
                      {product ? 'Product' : 'Message'}
                    </span>
                    <div className={local.slotActions}>
                      <button
                        type="button"
                        className={local.slotMove}
                        aria-label={`Move slot ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() => moveSlot(index, -1)}
                      >
                        <ChevronIcon up />
                      </button>
                      <button
                        type="button"
                        className={local.slotMove}
                        aria-label={`Move slot ${index + 1} down`}
                        disabled={index === draft.slots.length - 1}
                        onClick={() => moveSlot(index, 1)}
                      >
                        <ChevronIcon up={false} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnGhost}`}
                        aria-label={`Remove slot ${index + 1}`}
                        onClick={() => setSlots(draft.slots.filter((_, i) => i !== index))}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {draft.slots.length < MAX_SLOTS ? (
            <button
              type="button"
              className={`${styles.btnDashed} ${local.addSlot}`}
              onClick={() => setSlots([...draft.slots, createSlot(nextSlotId(draft.slots))])}
            >
              <PlusIcon /> Add slot
            </button>
          ) : (
            <div className={styles.helpText}>A campaign can have up to {MAX_SLOTS} slots.</div>
          )}
          {showErrors && errors.slots && <div className={styles.errorText}>{errors.slots}</div>}

          {draft.slots.length > 0 && (
            <div className={local.slotSummary}>
              <strong>{describeSlotLoop(draft)} on Digital Signage</strong>
              <span>{slotBreakdown}</span>
            </div>
          )}

          {usesEsl && (
            <div className={styles.helpText}>
              ESL labels show one product each and change up to {ESL_MAX_CHANGES_PER_DAY} times a day, so only product
              slots go to ESL. Message slots run on Digital Signage only.
            </div>
          )}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          {panelTitle(6, 'Additional rules', false)}
          <span className={styles.panelHeaderMeta}>Optional</span>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.helpText} style={{ marginTop: 0, marginBottom: 12 }}>
            One short sentence per rule, for stock thresholds, exclusions or campaign priorities.
          </div>
          {brief.additionalRules.length > 0 && (
            <div className={local.ruleList}>
              {brief.additionalRules.map((rule, index) => (
                <div key={index} className={local.ruleRow}>
                  <span className={local.ruleIndex}>{index + 1}</span>
                  <input
                    type="text"
                    className={styles.input}
                    value={rule}
                    maxLength={RULE_MAX_LENGTH}
                    placeholder={`e.g. ${RULE_EXAMPLES[index % RULE_EXAMPLES.length]}`}
                    aria-label={`Additional rule ${index + 1}`}
                    onChange={e => setRule(index, e.target.value)}
                  />
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnGhost}`}
                    aria-label={`Remove rule ${index + 1}`}
                    onClick={() => setBrief({ additionalRules: brief.additionalRules.filter((_, i) => i !== index) })}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
          {brief.additionalRules.length < MAX_RULES && (
            <button
              type="button"
              className={styles.btnDashed}
              onClick={() => setBrief({ additionalRules: [...brief.additionalRules, ''] })}
            >
              <PlusIcon /> Add rule
            </button>
          )}
        </div>
      </div>

      {hasPrompt && isStale && (
        <div className={`${styles.alert} ${styles.alertWarning}`}>
          <AlertIcon />
          <div className={local.alertBody}>
            Your answers or the campaign setup have changed since the prompt was generated, so the current prompt is
            out of date. Regenerate it before you continue.
          </div>
        </div>
      )}
      {hasPrompt && !isStale && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>
          <CheckIcon />
          <div className={local.alertBody}>The generated prompt matches these answers. You can view it or continue.</div>
        </div>
      )}

      <div className={local.generateBar}>
        {generating ? (
          <div className={local.generating}>
            <span className={styles.spinner}></span> Building the prompt from your answers...
          </div>
        ) : (
          <>
            <button
              type="button"
              className={`${styles.btnWithIcon} ${styles.btnPink}`}
              onClick={generate}
              disabled={missing.length > 0}
            >
              <div className={styles.btnIcon}>{hasPrompt ? <RefreshIcon /> : <SparkleIcon />}</div>
              <div className={styles.btnText}>{hasPrompt ? 'Regenerate Prompt' : 'Generate Prompt'}</div>
            </button>
            {hasPrompt && !briefHasErrors && (
              <button type="button" className={styles.btnOutline} onClick={() => setEditing(false)}>
                <EyeIcon size={14} /> View Prompt
              </button>
            )}
            {missing.length > 0 && (
              <span className={styles.helpText}>To generate the prompt, complete: {missing.join(', ')}.</span>
            )}
          </>
        )}
      </div>
      {showErrors && errors.prompt && <div className={styles.errorText}>{errors.prompt}</div>}
    </div>
  );
};

export default Step06Brief;
