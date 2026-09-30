import React, { useMemo, useState } from 'react';
import styles from '../wizard.module.css';
import local from './Step03Stores.module.css';
import { REGIONS, STORES, STORE_FORMATS, STORE_GROUPS, STORE_TAGS } from '../mockData';
import { toggleValue } from '../helpers';
import { AlertIcon, SearchIcon } from '../icons';
import type { StepProps } from '../types';

type FilterKey = 'region' | 'format' | 'group' | 'tags';

const FILTERS: { key: FilterKey; label: string; options: string[] }[] = [
  { key: 'region', label: 'Geographic region', options: REGIONS },
  { key: 'format', label: 'Store format', options: STORE_FORMATS },
  { key: 'group', label: 'Store group', options: STORE_GROUPS },
  { key: 'tags', label: 'Store tags', options: STORE_TAGS },
];

const NO_FILTERS: Record<FilterKey, string[]> = { region: [], format: [], group: [], tags: [] };

const Step03Stores: React.FC<StepProps> = ({ draft, update, errors, showErrors }) => {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [search, setSearch] = useState('');

  const selected = useMemo(() => new Set(draft.storeIds), [draft.storeIds]);

  const query = search.trim().toLowerCase();
  const filtersActive = query !== '' || FILTERS.some(f => filters[f.key].length > 0);

  const matching = useMemo(
    () =>
      STORES.filter(store => {
        if (filters.region.length > 0 && !filters.region.includes(store.region)) return false;
        if (filters.format.length > 0 && !filters.format.includes(store.format)) return false;
        if (filters.group.length > 0 && !filters.group.includes(store.group)) return false;
        if (filters.tags.length > 0 && !store.tags.some(tag => filters.tags.includes(tag))) return false;
        if (query && !store.name.toLowerCase().includes(query) && !store.code.includes(query)) return false;
        return true;
      }),
    [filters, query],
  );

  const rows = matching;
  const allRowsSelected = rows.length > 0 && rows.every(store => selected.has(store.id));

  // Keep the selection in network order whatever order it was picked in.
  const save = (ids: Set<string>) => update({ storeIds: STORES.filter(s => ids.has(s.id)).map(s => s.id) });

  const setMany = (storeIds: string[], checked: boolean) => {
    const next = new Set(selected);
    storeIds.forEach(id => (checked ? next.add(id) : next.delete(id)));
    save(next);
  };

  const toggleFilter = (key: FilterKey, value: string) =>
    setFilters(prev => ({ ...prev, [key]: toggleValue(prev[key], value) }));

  const resetFilters = () => {
    setFilters(NO_FILTERS);
    setSearch('');
  };

  return (
    <div>
      <p className={styles.sectionIntro}>
        Filter the network by region, format, group or tags, or search for an individual store, then select the stores
        that will run this campaign.
      </p>

      {showErrors && errors.storeIds && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          <AlertIcon />
          <span>{errors.storeIds}</span>
        </div>
      )}

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span>Filter stores</span>
          <button type="button" className={local.resetBtn} onClick={resetFilters} disabled={!filtersActive}>
            Reset filters
          </button>
        </div>
        <div className={styles.panelBody}>
          <div className={local.filterGrid}>
            {FILTERS.map(filter => (
              <div key={filter.key}>
                <div className={local.filterLabel}>
                  {filter.label}
                  {filters[filter.key].length > 0 && <span> ({filters[filter.key].length})</span>}
                </div>
                <div className={styles.chipGroup} role="group" aria-label={filter.label}>
                  {filter.options.map(option => {
                    const active = filters[filter.key].includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={active}
                        className={`${styles.chip} ${local.filterChip} ${active ? styles.chipSelected : ''}`}
                        onClick={() => toggleFilter(filter.key, option)}
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
          <strong>{draft.storeIds.length}</strong> of {STORES.length} stores selected
        </div>
        <div className={styles.toolbarGroup}>
          <div className={styles.searchBox}>
            <input
              type="text"
              className={styles.input}
              placeholder="Search store name or code"
              aria-label="Search individual store by name or code"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <SearchIcon />
          </div>
        </div>
      </div>

      <div className={`${styles.tableWrapper} ${styles.tableScroll}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={local.checkCol}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  aria-label="Select all stores in the list"
                  checked={allRowsSelected}
                  disabled={rows.length === 0}
                  onChange={e => setMany(rows.map(s => s.id), e.target.checked)}
                />
              </th>
              <th>Code</th>
              <th>Store</th>
              <th>Region</th>
              <th>Format</th>
              <th>Group</th>
              <th>Tags</th>
              <th>Opening hours</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className={styles.emptyState}>
                    No stores match the current filters.
                  </div>
                </td>
              </tr>
            )}
            {rows.map(store => {
              const checked = selected.has(store.id);
              return (
                <tr key={store.id} className={checked ? styles.rowSelected : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      aria-label={`Select store ${store.code} ${store.name}`}
                      checked={checked}
                      onChange={() => setMany([store.id], !checked)}
                    />
                  </td>
                  <td>{store.code}</td>
                  <td className={local.storeName}>{store.name}</td>
                  <td>{store.region}</td>
                  <td>{store.format}</td>
                  <td>{store.group}</td>
                  <td>
                    <div className={local.tagList}>
                      {store.tags.map(tag => (
                        <span key={tag} className={styles.badge}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {store.openingTime} - {store.closingTime}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={local.tableNote}>
        Showing {rows.length} {rows.length === 1 ? 'store' : 'stores'}
        {filtersActive ? ' matching the current filters' : ''}.
      </div>
    </div>
  );
};

export default Step03Stores;
