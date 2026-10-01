import React, { useMemo, useState } from 'react';
import styles from '../wizard.module.css';
import local from './Step05Devices.module.css';
import {
  DEVICES,
  DEVICE_STATUSES,
  ESL_SIZES,
  LANDSCAPE_RESOLUTIONS,
  PORTRAIT_RESOLUTIONS,
  SIGNAGE_LOCATIONS,
  SIGNAGE_TAGS,
} from '../mockData';
import { STORE_BY_ID, getAvailableDevices, getCampaignShelfLabels, mediaIncludes, toggleValue, unique } from '../helpers';
import { AlertIcon, CheckIcon, CloseIcon, SearchIcon } from '../icons';
import type { CampaignDraft, Device, DeviceStatus, StepProps } from '../types';

type FilterKey = 'tags' | 'location' | 'orientation' | 'resolution' | 'status';

const NO_FILTERS: Record<FilterKey, string[]> = {
  tags: [],
  location: [],
  orientation: [],
  resolution: [],
  status: [],
};

const PAGE_SIZE = 25;

const STATUS_BADGE: Record<DeviceStatus, string> = {
  Online: styles.badgeGreen,
  Offline: styles.badgeRed,
  Maintenance: styles.badgeAmber,
};

/** The values from `order` that occur in `present`, so options with no devices are not offered. */
function presentOptions(order: string[], present: string[]): string[] {
  const found = new Set(present);
  return unique(order).filter(value => found.has(value));
}

interface StoreCount {
  storeId: string;
  selected: number;
  available: number;
}

/**
 * ESL labels are not picked: each sits under one product, so the campaign products' labels update
 * automatically. This panel explains that and shows what the selected stores have.
 */
const EslLabelsPanel: React.FC<{ draft: CampaignDraft; goToStep: (step: number) => void }> = ({ draft, goToStep }) => {
  const storeIds = new Set(draft.storeIds);
  const groups = DEVICES.filter(d => d.media === 'esl' && storeIds.has(d.storeId));
  const storesWithEsl = new Set(groups.map(d => d.storeId)).size;
  const sizes = ESL_SIZES.filter(size => groups.some(d => d.eslSize === size));
  const labels = getCampaignShelfLabels(draft);
  const approved = draft.products.filter(p => p.approved).length;
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span>ESL shelf labels</span>
        <span className={`${styles.badge} ${styles.badgeGreen}`}>Automatic</span>
      </div>
      <div className={styles.panelBody}>
        <p className={styles.sectionIntro}>
          ESL labels are not picked here. Each label sits on the shelf under one product and only shows that product, so
          every campaign product&apos;s label updates automatically in each selected store that sells it.
        </p>
        <div className={styles.infoGrid}>
          <div>
            <div className={styles.infoLabel}>Selected stores with ESL</div>
            <div className={styles.infoValue}>
              {storesWithEsl} of {draft.storeIds.length}
            </div>
          </div>
          <div>
            <div className={styles.infoLabel}>Label sizes in these stores</div>
            <div className={styles.infoValue}>{sizes.length > 0 ? sizes.join(', ') : '-'}</div>
          </div>
          <div>
            <div className={styles.infoLabel}>Labels that will update</div>
            <div className={styles.infoValue}>
              {approved > 0
                ? `${labels.length} (${approved} products x the stores that sell them)`
                : 'Known once the products are chosen on step 7'}
            </div>
          </div>
        </div>
        {draft.storeIds.length === 0 && (
          <button type="button" className={`${styles.btnSmall} ${local.eslAction}`} onClick={() => goToStep(3)}>
            Select Stores
          </button>
        )}
      </div>
    </div>
  );
};

const Step05Devices: React.FC<StepProps> = ({ draft, update, errors, showErrors, goToStep }) => {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showBreakdown, setShowBreakdown] = useState(true);

  const pool = useMemo(() => getAvailableDevices(draft), [draft]);
  const selected = useMemo(() => new Set(draft.deviceIds), [draft.deviceIds]);

  const hasSignage = mediaIncludes(draft.media, 'signage');
  const hasEsl = mediaIncludes(draft.media, 'esl');

  const filterGroups = useMemo(() => {
    const groups: { key: FilterKey; label: string; options: string[] }[] = [
      { key: 'tags', label: 'Device tags', options: presentOptions(SIGNAGE_TAGS, pool.flatMap(d => d.tags)) },
      { key: 'location', label: 'In-store location', options: presentOptions(SIGNAGE_LOCATIONS, pool.map(d => d.location)) },
      {
        key: 'orientation',
        label: 'Format and orientation',
        options: presentOptions(['Landscape', 'Portrait'], pool.map(d => d.orientation)),
      },
      {
        key: 'resolution',
        label: 'Screen resolution',
        options: presentOptions([...LANDSCAPE_RESOLUTIONS, ...PORTRAIT_RESOLUTIONS], pool.map(d => d.resolution)),
      },
      { key: 'status', label: 'Device status', options: presentOptions(DEVICE_STATUSES, pool.map(d => d.status)) },
    ];
    return groups.filter(group => group.options.length > 0);
  }, [pool]);

  const query = search.trim().toLowerCase();

  const matching = useMemo(() => {
    // Ignore filter values that are no longer offered for this pool.
    const active = (key: FilterKey) => {
      const group = filterGroups.find(g => g.key === key);
      return group ? filters[key].filter(value => group.options.includes(value)) : [];
    };
    const tags = active('tags');
    const location = active('location');
    const orientation = active('orientation');
    const resolution = active('resolution');
    const status = active('status');

    return pool.filter(device => {
      if (tags.length > 0 && !device.tags.some(tag => tags.includes(tag))) return false;
      if (location.length > 0 && !location.includes(device.location)) return false;
      if (orientation.length > 0 && !orientation.includes(device.orientation)) return false;
      if (resolution.length > 0 && !resolution.includes(device.resolution)) return false;
      if (status.length > 0 && !status.includes(device.status)) return false;
      if (query) {
        const store = STORE_BY_ID.get(device.storeId);
        const text = `${device.name} ${store?.name ?? ''} ${store?.code ?? ''}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [pool, filters, filterGroups, query]);

  const storeCounts = useMemo(() => {
    const byStore = new Map<string, StoreCount>();
    for (const device of pool) {
      const row = byStore.get(device.storeId) ?? { storeId: device.storeId, selected: 0, available: 0 };
      row.available += 1;
      if (selected.has(device.id)) row.selected += 1;
      byStore.set(device.storeId, row);
    }
    return Array.from(byStore.values());
  }, [pool, selected]);

  // ESL-only campaign: there are no screens to pick.
  if (!hasSignage && hasEsl) {
    return <EslLabelsPanel draft={draft} goToStep={goToStep} />;
  }

  if (pool.length === 0) {
    const noStores = draft.storeIds.length === 0;
    const noMedia = !draft.media;
    return (
      <div className={styles.panel}>
        <div className={styles.emptyState}>
          <p>
            {noStores && noMedia
              ? 'Select the campaign stores and media first. Available devices are filtered by both.'
              : noStores
                ? 'Select the campaign stores first. Available devices are filtered by the selected stores.'
                : noMedia
                  ? 'Select the campaign media first. Available devices are filtered by the selected media.'
                  : 'The selected stores have no Digital Signage screens.'}
          </p>
          <div className={local.emptyActions}>
            {(noStores || !noMedia) && (
              <button type="button" className={styles.btnSmall} onClick={() => goToStep(3)}>
                Select Stores
              </button>
            )}
            {(noMedia || !noStores) && (
              <button type="button" className={`${styles.btnSmall} ${styles.btnSmallPink}`} onClick={() => goToStep(4)}>
                Select Media
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const selectedDevices = pool.filter(d => selected.has(d.id));
  const selectedCount = selectedDevices.length;
  const unavailableCount = selectedDevices.filter(d => d.status !== 'Online').length;
  const storesWithSelection = storeCounts.filter(s => s.selected > 0).length;
  const filtersActive = query !== '' || matching.length !== pool.length || filterGroups.some(g => filters[g.key].length > 0);

  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const rows = matching.slice(pageStart, pageStart + PAGE_SIZE);
  const allRowsSelected = rows.length > 0 && rows.every(d => selected.has(d.id));

  // Keep the selection in pool order whatever order it was picked in.
  const setMany = (devices: Device[], checked: boolean) => {
    const next = new Set(selected);
    devices.forEach(d => (checked ? next.add(d.id) : next.delete(d.id)));
    update({ deviceIds: pool.filter(d => next.has(d.id)).map(d => d.id) });
  };

  const toggleFilter = (key: FilterKey, value: string) => {
    setFilters(prev => ({ ...prev, [key]: toggleValue(prev[key], value) }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(NO_FILTERS);
    setSearch('');
    setPage(1);
  };


  return (
    <div>
      <p className={styles.sectionIntro}>
        Pick the Digital Signage screens for this campaign: {pool.length} screens across {storeCounts.length}{' '}
        {storeCounts.length === 1 ? 'store' : 'stores'}.
        {hasEsl && ' ESL shelf labels are not picked; they update automatically (see below).'}
      </p>

      {showErrors && errors.deviceIds && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          <AlertIcon />
          <span>{errors.deviceIds}</span>
        </div>
      )}

      <div className={styles.statGrid} aria-live="polite">
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Screens selected</div>
          <div className={styles.statValue}>
            {selectedCount} <span className={local.statSub}>of {pool.length}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Stores with screens selected</div>
          <div className={styles.statValue}>
            {storesWithSelection} <span className={local.statSub}>of {storeCounts.length}</span>
          </div>
        </div>
      </div>

      {hasEsl && <EslLabelsPanel draft={draft} goToStep={goToStep} />}

      {unavailableCount > 0 && (
        <div className={`${styles.alert} ${styles.alertWarning}`}>
          <AlertIcon />
          <span>
            {unavailableCount} selected {unavailableCount === 1 ? 'device is' : 'devices are'} offline or in maintenance.
            They can stay in the campaign and will receive content when they are back online.
          </span>
        </div>
      )}

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span>Selected screens by store</span>
          <button
            type="button"
            className={styles.btnOutline}
            aria-expanded={showBreakdown}
            onClick={() => setShowBreakdown(v => !v)}
          >
            {showBreakdown ? 'Hide' : 'Show'}
          </button>
        </div>
        {showBreakdown && (
          <div className={local.breakdownScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Store</th>
                  <th className={styles.numeric}>Screens selected</th>
                </tr>
              </thead>
              <tbody>
                {storeCounts.map(row => {
                  const store = STORE_BY_ID.get(row.storeId);
                  return (
                    <tr key={row.storeId} className={row.selected > 0 ? styles.rowSelected : undefined}>
                      <td>
                        <span className={local.primaryText}>{store?.name ?? row.storeId}</span>{' '}
                        <span className={local.subText}>{store?.code}</span>
                      </td>
                      <td className={styles.numeric}>
                        {row.selected} of {row.available}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span>Filter screens</span>
          <button type="button" className={local.resetBtn} onClick={resetFilters} disabled={!filtersActive}>
            Reset filters
          </button>
        </div>
        <div className={styles.panelBody}>
          <div className={local.filterGrid}>
            {filterGroups.map(group => (
              <div key={group.key}>
                <div className={local.filterLabel}>
                  {group.label}
                  {filters[group.key].length > 0 && <span> ({filters[group.key].length})</span>}
                </div>
                <div className={styles.chipGroup} role="group" aria-label={group.label}>
                  {group.options.map(option => {
                    const active = filters[group.key].includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={active}
                        className={`${styles.chip} ${local.filterChip} ${active ? styles.chipSelected : ''}`}
                        onClick={() => toggleFilter(group.key, option)}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.counter} aria-live="polite">
          <strong>{selectedCount}</strong> of {pool.length} screens selected
        </div>
        <div className={styles.toolbarGroup}>
          <div className={styles.searchBox}>
            <input
              type="text"
              className={styles.input}
              placeholder="Search screen or store"
              aria-label="Search by device name, store name or store code"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <SearchIcon />
          </div>
          <button
            type="button"
            className={styles.btnSmall}
            disabled={matching.length === 0}
            onClick={() => setMany(matching, true)}
          >
            <CheckIcon size={14} />
            {filtersActive ? `Select All (${matching.length} matching)` : 'Select All'}
          </button>
          <button
            type="button"
            className={`${styles.btnSmall} ${styles.btnSmallPink}`}
            disabled={selectedCount === 0}
            onClick={() => update({ deviceIds: [] })}
          >
            <CloseIcon size={14} />
            Clear All
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={local.checkCol}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  aria-label="Select all screens on this page"
                  checked={allRowsSelected}
                  disabled={rows.length === 0}
                  onChange={e => setMany(rows, e.target.checked)}
                />
              </th>
              <th>Store</th>
              <th>Screen</th>
              <th>Location</th>
              <th>Format / size</th>
              <th>Tags</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className={styles.emptyState}>No screens match the current filters.</div>
                </td>
              </tr>
            )}
            {rows.map(device => {
              const store = STORE_BY_ID.get(device.storeId);
              const checked = selected.has(device.id);
              return (
                <tr key={device.id} className={checked ? styles.rowSelected : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      aria-label={`Select ${device.name} at ${store?.name ?? device.storeId}`}
                      checked={checked}
                      onChange={() => setMany([device], !checked)}
                    />
                  </td>
                  <td>
                    <div className={local.primaryText}>{store?.name ?? device.storeId}</div>
                    <div className={local.subText}>{store?.code}</div>
                  </td>
                  <td>{device.name}</td>
                  <td>{device.location}</td>
                  <td>
                    {device.orientation} {device.resolution}
                  </td>
                  <td>
                    <div className={local.tagList}>
                      {device.tags.map(tag => (
                        <span key={tag} className={styles.badge}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${STATUS_BADGE[device.status]}`}>
                      {device.status !== 'Online' && <AlertIcon size={12} />}
                      {device.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={local.pagination}>
        <span>
          {matching.length === 0
            ? 'Showing 0 screens'
            : `Showing ${pageStart + 1}-${pageStart + rows.length} of ${matching.length} screens`}
          {filtersActive ? ' matching the current filters' : ''}
        </span>
        <div className={local.pageControls}>
          <button
            type="button"
            className={styles.btnOutline}
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {pageCount}
          </span>
          <button
            type="button"
            className={styles.btnOutline}
            disabled={currentPage >= pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Step05Devices;
