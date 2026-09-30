import React, { useMemo, useState } from 'react';
import styles from '../wizard.module.css';
import local from './Step05Devices.module.css';
import {
  DEVICE_STATUSES,
  ESL_COLOURS,
  ESL_COLOUR_LABELS,
  ESL_LOCATIONS,
  ESL_SIZES,
  ESL_TAGS,
  LANDSCAPE_RESOLUTIONS,
  PORTRAIT_RESOLUTIONS,
  SIGNAGE_LOCATIONS,
  SIGNAGE_TAGS,
} from '../mockData';
import { STORE_BY_ID, getAvailableDevices, mediaIncludes, toggleValue, unique } from '../helpers';
import { AlertIcon, CheckIcon, CloseIcon, SearchIcon } from '../icons';
import type { Device, DeviceMedia, DeviceStatus, StepProps } from '../types';

type FilterKey = 'media' | 'tags' | 'location' | 'orientation' | 'resolution' | 'eslSize' | 'eslColour' | 'status';

const NO_FILTERS: Record<FilterKey, string[]> = {
  media: [],
  tags: [],
  location: [],
  orientation: [],
  resolution: [],
  eslSize: [],
  eslColour: [],
  status: [],
};

const PAGE_SIZE = 25;

const MEDIA_LABELS: Record<DeviceMedia, string> = { signage: 'Digital Signage', esl: 'ESL' };

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

function formatLabel(device: Device): string {
  return device.media === 'signage'
    ? `${device.orientation} ${device.resolution}`
    : `${device.eslSize} - ${ESL_COLOUR_LABELS[device.eslColour] ?? device.eslColour}`;
}

interface StoreCount {
  storeId: string;
  signageSelected: number;
  signageAvailable: number;
  eslSelected: number;
  eslAvailable: number;
}

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
    const groups: { key: FilterKey; label: string; options: string[] }[] = [];
    if (hasSignage && hasEsl) {
      groups.push({ key: 'media', label: 'Media type', options: ['signage', 'esl'] });
    }
    groups.push(
      { key: 'tags', label: 'Device tags', options: presentOptions([...SIGNAGE_TAGS, ...ESL_TAGS], pool.flatMap(d => d.tags)) },
      {
        key: 'location',
        label: 'In-store location',
        options: presentOptions([...SIGNAGE_LOCATIONS, ...ESL_LOCATIONS], pool.map(d => d.location)),
      },
    );
    if (hasSignage) {
      const signage = pool.filter(d => d.media === 'signage');
      groups.push(
        {
          key: 'orientation',
          label: 'Format and orientation (Digital Signage)',
          options: presentOptions(['Landscape', 'Portrait'], signage.map(d => d.orientation)),
        },
        {
          key: 'resolution',
          label: 'Screen resolution (Digital Signage)',
          options: presentOptions([...LANDSCAPE_RESOLUTIONS, ...PORTRAIT_RESOLUTIONS], signage.map(d => d.resolution)),
        },
      );
    }
    if (hasEsl) {
      const esl = pool.filter(d => d.media === 'esl');
      groups.push(
        { key: 'eslSize', label: 'ESL size', options: presentOptions(ESL_SIZES, esl.map(d => d.eslSize)) },
        { key: 'eslColour', label: 'ESL colour capability', options: presentOptions(ESL_COLOURS, esl.map(d => d.eslColour)) },
      );
    }
    groups.push({ key: 'status', label: 'Device status', options: presentOptions(DEVICE_STATUSES, pool.map(d => d.status)) });
    return groups.filter(group => group.options.length > 0);
  }, [pool, hasSignage, hasEsl]);

  const query = search.trim().toLowerCase();

  const matching = useMemo(() => {
    // Ignore filter values that are no longer offered for this pool.
    const active = (key: FilterKey) => {
      const group = filterGroups.find(g => g.key === key);
      return group ? filters[key].filter(value => group.options.includes(value)) : [];
    };
    const media = active('media');
    const tags = active('tags');
    const location = active('location');
    const orientation = active('orientation');
    const resolution = active('resolution');
    const eslSize = active('eslSize');
    const eslColour = active('eslColour');
    const status = active('status');

    return pool.filter(device => {
      if (media.length > 0 && !media.includes(device.media)) return false;
      if (tags.length > 0 && !device.tags.some(tag => tags.includes(tag))) return false;
      if (location.length > 0 && !location.includes(device.location)) return false;
      // Media-specific filters only match devices of that media type.
      if (orientation.length > 0 && !(device.media === 'signage' && orientation.includes(device.orientation))) return false;
      if (resolution.length > 0 && !resolution.includes(device.resolution)) return false;
      if (eslSize.length > 0 && !eslSize.includes(device.eslSize)) return false;
      if (eslColour.length > 0 && !eslColour.includes(device.eslColour)) return false;
      if (status.length > 0 && !status.includes(device.status)) return false;
      if (query) {
        const store = STORE_BY_ID.get(device.storeId);
        const text = `${device.name} ${store?.name ?? ''} ${store?.code ?? ''}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [pool, filters, filterGroups, query]);

  const { mediaCounts, storeCounts } = useMemo(() => {
    const totals: Record<DeviceMedia, { selected: number; available: number }> = {
      signage: { selected: 0, available: 0 },
      esl: { selected: 0, available: 0 },
    };
    const byStore = new Map<string, StoreCount>();
    for (const device of pool) {
      let row = byStore.get(device.storeId);
      if (!row) {
        row = { storeId: device.storeId, signageSelected: 0, signageAvailable: 0, eslSelected: 0, eslAvailable: 0 };
        byStore.set(device.storeId, row);
      }
      const isSelected = selected.has(device.id);
      totals[device.media].available += 1;
      if (isSelected) totals[device.media].selected += 1;
      if (device.media === 'signage') {
        row.signageAvailable += 1;
        if (isSelected) row.signageSelected += 1;
      } else {
        row.eslAvailable += 1;
        if (isSelected) row.eslSelected += 1;
      }
    }
    return { mediaCounts: totals, storeCounts: Array.from(byStore.values()) };
  }, [pool, selected]);

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
                  : 'The selected stores have no devices for the selected media.'}
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
  const storesWithSelection = storeCounts.filter(s => s.signageSelected + s.eslSelected > 0).length;
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

  const optionLabel = (key: FilterKey, value: string) => {
    if (key === 'media') return MEDIA_LABELS[value as DeviceMedia];
    if (key === 'eslColour') return ESL_COLOUR_LABELS[value] ?? value;
    return value;
  };

  const mediaTypes: DeviceMedia[] = [...(hasSignage ? ['signage' as const] : []), ...(hasEsl ? ['esl' as const] : [])];

  return (
    <div>
      <p className={styles.sectionIntro}>
        Available devices are filtered by the selected stores and media: {pool.length} devices across{' '}
        {storeCounts.length} {storeCounts.length === 1 ? 'store' : 'stores'}.
      </p>

      {showErrors && errors.deviceIds && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          <AlertIcon />
          <span>{errors.deviceIds}</span>
        </div>
      )}

      <div className={styles.statGrid} aria-live="polite">
        {mediaTypes.map(media => (
          <div key={media} className={styles.statCard}>
            <div className={styles.statLabel}>{MEDIA_LABELS[media]} devices selected</div>
            <div className={styles.statValue}>
              {mediaCounts[media].selected} <span className={local.statSub}>of {mediaCounts[media].available}</span>
            </div>
          </div>
        ))}
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total devices selected</div>
          <div className={styles.statValue}>
            {selectedCount} <span className={local.statSub}>of {pool.length}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Stores with devices selected</div>
          <div className={styles.statValue}>
            {storesWithSelection} <span className={local.statSub}>of {storeCounts.length}</span>
          </div>
        </div>
      </div>

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
          <span>Selected devices by store</span>
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
                  {hasSignage && <th className={styles.numeric}>Digital Signage selected</th>}
                  {hasEsl && <th className={styles.numeric}>ESL selected</th>}
                  <th className={styles.numeric}>Total selected</th>
                </tr>
              </thead>
              <tbody>
                {storeCounts.map(row => {
                  const store = STORE_BY_ID.get(row.storeId);
                  const total = row.signageSelected + row.eslSelected;
                  return (
                    <tr key={row.storeId} className={total > 0 ? styles.rowSelected : undefined}>
                      <td>
                        <span className={local.primaryText}>{store?.name ?? row.storeId}</span>{' '}
                        <span className={local.subText}>{store?.code}</span>
                      </td>
                      {hasSignage && (
                        <td className={styles.numeric}>
                          {row.signageSelected} of {row.signageAvailable}
                        </td>
                      )}
                      {hasEsl && (
                        <td className={styles.numeric}>
                          {row.eslSelected} of {row.eslAvailable}
                        </td>
                      )}
                      <td className={styles.numeric}>
                        {total} of {row.signageAvailable + row.eslAvailable}
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
          <span>Filter devices</span>
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
                        {optionLabel(group.key, option)}
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
          <strong>{selectedCount}</strong> of {pool.length} devices selected
        </div>
        <div className={styles.toolbarGroup}>
          <div className={styles.searchBox}>
            <input
              type="text"
              className={styles.input}
              placeholder="Search device or store"
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
                  aria-label="Select all devices on this page"
                  checked={allRowsSelected}
                  disabled={rows.length === 0}
                  onChange={e => setMany(rows, e.target.checked)}
                />
              </th>
              <th>Store</th>
              <th>Device</th>
              <th>Media</th>
              <th>Location</th>
              <th>Format / size</th>
              <th>Tags</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className={styles.emptyState}>No devices match the current filters.</div>
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
                  <td>
                    <span className={`${styles.badge} ${device.media === 'signage' ? styles.badgeBlue : styles.badgeDark}`}>
                      {MEDIA_LABELS[device.media]}
                    </span>
                  </td>
                  <td>{device.location}</td>
                  <td>
                    <div>{formatLabel(device)}</div>
                    {device.media === 'esl' && <div className={local.subText}>{device.labelCount} labels</div>}
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
            ? 'Showing 0 devices'
            : `Showing ${pageStart + 1}-${pageStart + rows.length} of ${matching.length} devices`}
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
