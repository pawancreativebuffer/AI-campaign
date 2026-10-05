import React, { useEffect, useRef, useState } from 'react';
import styles from '../wizard.module.css';
import css from './Step09Preview.module.css';
import TicketPreview from './TicketPreview';
import { getSlotOutputs, getTicketContent } from './ticketContent';
import type { SlotOutput } from './ticketContent';
import { ESL_COLOUR_LABELS } from '../mockData';
import { getClientPack, getDesignLabel } from '../clients';
import { getLoopSeconds, getPixelSize, getProductShelfLabels, getRequiredFormats, isProductSlot, mediaLabel, unique } from '../helpers';
import { isSlotComplete } from '../validation';
import { AlertIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon, RefreshIcon, SparkleIcon } from '../icons';
import type { CampaignDraft, CampaignSlot, ContentFormat, DeviceMedia, StepProps } from '../types';

interface Filters {
  media: 'all' | DeviceMedia;
  format: string;
  size: string;
  slot: string;
}

const ALL = 'all';
const NO_FILTERS: Filters = { media: ALL, format: ALL, size: ALL, slot: ALL };
const PAGE_SIZE = 24;
const GENERATION_TICKS = 12;
const TICK_MS = 150;
const PLAYER_TICK_MS = 100;

// "Format" is the orientation of a screen or the colour capability of a label; "size" is its resolution or label size.
const formatOf = (f: ContentFormat) =>
  f.media === 'signage' ? f.orientation : (ESL_COLOUR_LABELS[f.eslColour] ?? f.eslColour);
const sizeOf = (f: ContentFormat) => (f.media === 'signage' ? f.resolution : f.eslSize);
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Name of the slot's design in the client's template pack. Message slots use the draft message design. */
function designName(slot: CampaignSlot, clientId: string): string {
  if (slot.kind === 'Retail Media') return 'Supplied artwork';
  if (!isProductSlot(slot.kind)) return 'Draft design';
  return slot.ticketType ? getDesignLabel(clientId, slot.ticketType) : 'No design';
}

/** Product name for product slots, headline for message slots. */
function slotTitle(slot: CampaignSlot, draft: CampaignDraft): string {
  const content = getTicketContent(slot, draft);
  return content.product ? `${content.product.description} ${content.product.size}` : (content.headline ?? '');
}

/** Largest on-screen width that keeps the format inside maxWidth x maxHeight. */
function fitWidth(format: ContentFormat, maxWidth: number, maxHeight: number): number {
  const { width, height } = getPixelSize(format);
  return Math.max(1, Math.min(maxWidth, Math.round((maxHeight * width) / height)));
}

interface TicketProps {
  slot: CampaignSlot;
  format: ContentFormat;
  draft: CampaignDraft;
  maxWidth: number;
  maxHeight: number;
}

const Ticket = ({ slot, format, draft, maxWidth, maxHeight }: TicketProps) => {
  const { width, height } = getPixelSize(format);
  return (
    <TicketPreview
      clientId={draft.clientId}
      content={getTicketContent(slot, draft)}
      width={width}
      height={height}
      displayWidth={fitWidth(format, maxWidth, maxHeight)}
      eslColour={format.media === 'esl' ? format.eslColour : undefined}
    />
  );
};

const PlayIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="6 4 20 12 6 20 6 4"></polygon>
  </svg>
);

const PauseIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="5" y="4" width="5" height="16"></rect>
    <rect x="14" y="4" width="5" height="16"></rect>
  </svg>
);

// ---------- Digital Signage loop player ----------

interface PlayerProps {
  draft: CampaignDraft;
  formats: ContentFormat[]; // signage formats only, at least one
}

const SignagePlayer = ({ draft, formats }: PlayerProps) => {
  const [formatKey, setFormatKey] = useState(formats[0].key);
  const [playing, setPlaying] = useState(true);
  const [pos, setPos] = useState({ index: 0, elapsed: 0 });

  const format = formats.find(f => f.key === formatKey) ?? formats[0];
  const count = draft.slots.length;
  const durationMs = Math.max(1, draft.slotSeconds) * 1000;

  useEffect(() => {
    if (!playing || count === 0) return undefined;
    const id = setInterval(() => {
      setPos(prev =>
        prev.elapsed + PLAYER_TICK_MS >= durationMs
          ? { index: (prev.index + 1) % count, elapsed: 0 }
          : { index: prev.index, elapsed: prev.elapsed + PLAYER_TICK_MS },
      );
    }, PLAYER_TICK_MS);
    return () => clearInterval(id);
  }, [playing, count, durationMs]);

  if (count === 0) return null;
  const index = pos.index % count;
  const slot = draft.slots[index];
  const goTo = (i: number) => setPos({ index: (i + count) % count, elapsed: 0 });
  const secondsLeft = Math.ceil((durationMs - pos.elapsed) / 1000);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span>Digital Signage loop</span>
        <span className={styles.panelHeaderMeta}>
          {plural(count, 'slot')} x {draft.slotSeconds} sec = {getLoopSeconds(draft)} sec loop
        </span>
      </div>
      <div className={styles.panelBody}>
        <div className={css.playerTop}>
          <p className={css.playerIntro}>
            This is how the screens play the campaign: each slot shows for {draft.slotSeconds} seconds, then the next
            one, and the loop repeats.
          </p>
          {formats.length > 1 && (
            <label className={css.filter}>
              <span className={styles.label}>Screen format</span>
              <select className={styles.select} value={format.key} onChange={e => setFormatKey(e.target.value)}>
                {formats.map(f => (
                  <option key={f.key} value={f.key}>
                    {f.label} ({plural(f.deviceCount, 'device')})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className={css.playerStage}>
          <div key={slot.id}>
            <Ticket slot={slot} format={format} draft={draft} maxWidth={560} maxHeight={420} />
          </div>
        </div>

        <div className={css.playerInfo}>
          <span className={`${styles.badge} ${styles.badgeDark}`}>
            Slot {index + 1} of {count}
          </span>
          <span className={styles.badge}>{slot.kind}</span>
          <span className={css.playerTitle}>{slotTitle(slot, draft)}</span>
          <span className={css.playerDesign}>{designName(slot, draft.clientId)}</span>
        </div>

        <div className={css.segments} aria-hidden="true">
          {draft.slots.map((s, i) => {
            const fill = i < index ? 100 : i === index ? (pos.elapsed / durationMs) * 100 : 0;
            return (
              <div key={s.id} className={css.segment}>
                <div
                  className={`${css.segmentFill} ${i === index ? css.segmentFillCurrent : ''}`}
                  style={{ width: `${fill}%` }}
                ></div>
              </div>
            );
          })}
        </div>

        <div className={css.controls}>
          <button type="button" className={styles.btnOutline} onClick={() => goTo(index - 1)}>
            <ArrowLeftIcon size={14} /> Previous
          </button>
          <button
            type="button"
            className={`${styles.btnSmall} ${styles.btnSmallPink} ${css.playBtn}`}
            onClick={() => setPlaying(p => !p)}
          >
            {playing ? <PauseIcon /> : <PlayIcon />} {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" className={styles.btnOutline} onClick={() => goTo(index + 1)}>
            Next <ArrowRightIcon size={14} />
          </button>
          <span className={css.timeLeft}>{playing ? `Next slot in ${secondsLeft} sec` : 'Paused'}</span>
        </div>

        <div className={css.thumbStrip}>
          {draft.slots.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`${css.thumb} ${i === index ? css.thumbActive : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Show slot ${i + 1}: ${s.kind}`}
              aria-current={i === index ? 'true' : undefined}
            >
              <div className={css.thumbStage}>
                <Ticket slot={s} format={format} draft={draft} maxWidth={112} maxHeight={72} />
              </div>
              <span className={css.thumbLabel}>
                {i + 1}. {s.kind}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------- Step ----------

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
  const incomplete = draft.slots.filter(slot => !isSlotComplete(slot)).length;

  if (formats.length === 0 || draft.slots.length === 0 || incomplete > 0) {
    const problem =
      formats.length === 0
        ? { text: 'No devices are selected, so there are no content formats to generate.', step: 5, action: 'Select Devices' }
        : draft.slots.length === 0
          ? { text: 'The campaign has no slots. Add slots before generating content.', step: 8, action: 'Set Up Slots' }
          : {
              text: `${plural(incomplete, 'slot')} of ${draft.slots.length} still ${incomplete === 1 ? 'needs' : 'need'} a product and design (or a headline) before content can be generated.`,
              step: 8,
              action: 'Complete Slots',
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

  const allOutputs = getSlotOutputs(draft);
  const eslLabelCount = (sku: string, formatKey: string) =>
    getProductShelfLabels(draft, sku).filter(l => `esl|${l.size}|${l.colour}` === formatKey).length;
  const total = allOutputs.length;
  const clientName = getClientPack(draft.clientId).name;
  const signageFormats = formats.filter(f => f.media === 'signage');

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
          {done} of {plural(total, 'output')} rendered with the {clientName} ticket designs
        </div>
      </div>
    );
  }

  const summary = (
    <div className={styles.statGrid}>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Slots</div>
        <div className={styles.statValue}>{draft.slots.length}</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Formats</div>
        <div className={styles.statValue}>{formats.length}</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Outputs</div>
        <div className={styles.statValue}>{total}</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Loop length</div>
        <div className={styles.statValue}>{getLoopSeconds(draft)} sec</div>
      </div>
    </div>
  );

  if (!draft.contentGenerated) {
    return (
      <div>
        <p className={styles.sectionIntro}>
          Content is generated for every slot in every required format, using the {clientName} design chosen for
          each slot. Digital Signage screens play all {plural(draft.slots.length, 'slot')} in turn ({draft.slotSeconds}{' '}
          sec each). An ESL shelf label sits under one product, so each product gets one ESL ticket per size of its own
          labels, sent only to those labels.
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
                  <th className={styles.numeric}>Screens / labels</th>
                  <th>Slots included</th>
                  <th className={styles.numeric}>Outputs</th>
                </tr>
              </thead>
              <tbody>
                {formats.map(format => {
                  const count = allOutputs.filter(o => o.format.key === format.key).length;
                  return (
                    <tr key={format.key}>
                      <td>{mediaLabel(format.media)}</td>
                      <td>{format.label}</td>
                      <td className={styles.numeric}>{format.deviceCount}</td>
                      <td>{format.media === 'signage' ? 'All slots, as a loop' : 'Each product on its own shelf labels'}</td>
                      <td className={styles.numeric}>{count}</td>
                    </tr>
                  );
                })}
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

  // ----- Generated: play the signage loop, then preview each output by media type, format and size -----
  const changeFilters = (patch: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...patch }));
    setVisible(PAGE_SIZE);
  };

  const byMedia = allOutputs.filter(o => filters.media === ALL || o.format.media === filters.media);
  const formatOptions = unique(byMedia.map(o => formatOf(o.format)));
  const byFormat = byMedia.filter(o => filters.format === ALL || formatOf(o.format) === filters.format);
  const sizeOptions = unique(byFormat.map(o => sizeOf(o.format)));
  const bySize = byFormat.filter(o => filters.size === ALL || sizeOf(o.format) === filters.size);
  const outputs: SlotOutput[] = bySize.filter(o => filters.slot === ALL || o.slot.id === filters.slot);
  const mediaOptions = unique(formats.map(f => f.media));
  const isFiltered = filters.media !== ALL || filters.format !== ALL || filters.size !== ALL || filters.slot !== ALL;

  return (
    <div>
      <div className={`${styles.alert} ${styles.alertSuccess}`}>
        <CheckIcon />
        <div>
          {plural(total, 'output')} generated from {plural(draft.slots.length, 'slot')} in{' '}
          {plural(formats.length, 'format')}. Play the Digital Signage loop, or check each output below.
        </div>
      </div>

      {summary}

      <div className={css.regenerateRow}>
        <button type="button" className={styles.btnOutline} onClick={generate}>
          <RefreshIcon size={14} /> Regenerate Content
        </button>
      </div>

      {signageFormats.length > 0 ? (
        <SignagePlayer draft={draft} formats={signageFormats} />
      ) : (
        <div className={styles.alert}>
          <AlertIcon />
          <div>This campaign has no Digital Signage screens, so there is no loop to play. ESL outputs are below.</div>
        </div>
      )}

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span>All outputs</span>
          <span className={styles.panelHeaderMeta}>
            Showing {Math.min(visible, outputs.length)} of {plural(outputs.length, 'output')}
            {isFiltered && ` (${total} in total)`}
          </span>
        </div>
        <div className={styles.panelBody}>
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
                <select
                  className={styles.select}
                  value={filters.size}
                  onChange={e => changeFilters({ size: e.target.value })}
                >
                  <option value={ALL}>All sizes</option>
                  {sizeOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className={css.filter}>
                <span className={styles.label}>Slot</span>
                <select
                  className={styles.select}
                  value={filters.slot}
                  onChange={e => changeFilters({ slot: e.target.value })}
                >
                  <option value={ALL}>All slots</option>
                  {draft.slots.map((slot, i) => (
                    <option key={slot.id} value={slot.id}>
                      {i + 1}. {slot.kind}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {isFiltered && (
              <button type="button" className={styles.btnOutline} onClick={() => changeFilters(NO_FILTERS)}>
                Clear filters
              </button>
            )}
          </div>

          {outputs.length === 0 ? (
            <div className={styles.emptyState}>
              No outputs match these filters.
              {filters.media === 'esl' && filters.slot !== ALL && ' ESL labels only show product slots.'}
            </div>
          ) : (
            <div className={css.outputGrid}>
              {outputs.slice(0, visible).map(({ slot, slotNumber, format }) => (
                <article key={`${format.key}|${slot.id}`} className={css.outputCard}>
                  <div className={css.stage}>
                    <Ticket slot={slot} format={format} draft={draft} maxWidth={216} maxHeight={200} />
                  </div>
                  <div className={css.outputBody}>
                    <div className={css.outputTitle}>
                      Slot {slotNumber}: {slotTitle(slot, draft)}
                    </div>
                    <div className={css.outputBadges}>
                      <span className={`${styles.badge} ${format.media === 'esl' ? styles.badgeBlue : styles.badgePink}`}>
                        {mediaLabel(format.media)}
                      </span>
                      <span className={styles.badge}>{slot.kind}</span>
                    </div>
                    <dl className={css.outputMeta}>
                      <dt>Design</dt>
                      <dd>{designName(slot, draft.clientId)}</dd>
                      <dt>Media</dt>
                      <dd>{format.media === 'esl' ? 'Static (ESL)' : slot.mediaType || 'Static'}</dd>
                      <dt>Format / size</dt>
                      <dd>{format.label}</dd>
                      <dt>{format.media === 'esl' ? 'Labels' : 'Screens'}</dt>
                      <dd>{format.media === 'esl' ? eslLabelCount(slot.productSku, format.key) : format.deviceCount}</dd>
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
      </div>
    </div>
  );
};

export default Step09Preview;
