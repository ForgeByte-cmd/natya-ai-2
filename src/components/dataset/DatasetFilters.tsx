import React from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { DatasetMediaType, DatasetStatus } from '../../types/dataset';
import { DANCE_FORMS } from '../../data/dances/danceForms';

export interface DatasetFilterState {
  searchQuery: string;
  danceFormId: string;
  category: string;
  mediaType: string;
  status: string;
  sortBy: 'NEWEST' | 'OLDEST' | 'TITLE' | 'DURATION';
}

interface DatasetFiltersProps {
  filters: DatasetFilterState;
  onFilterChange: (filters: DatasetFilterState) => void;
  onReset: () => void;
  totalResults: number;
}

export function DatasetFilters({
  filters,
  onFilterChange,
  onReset,
  totalResults,
}: DatasetFiltersProps) {
  return (
    <div id="dataset-filters-bar" className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3.5 shadow-lg">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by title, dance form, mudra, pose, or institution..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800 shrink-0 overflow-x-auto">
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: 'APPROVED', label: 'Approved' },
              { id: 'UNVERIFIED', label: 'Pending Review' },
              { id: 'REJECTED', label: 'Rejected' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => onFilterChange({ ...filters, status: tab.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filters.status === tab.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Filter Dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Dance Form Dropdown */}
        <select
          value={filters.danceFormId}
          onChange={(e) => onFilterChange({ ...filters, danceFormId: e.target.value })}
          className="px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-300 focus:outline-none focus:border-amber-500"
        >
          <option value="">All Dance Traditions</option>
          {DANCE_FORMS.map((df) => (
            <option key={df.id} value={df.id}>
              {df.name}
            </option>
          ))}
        </select>

        {/* Media Type Dropdown */}
        <select
          value={filters.mediaType}
          onChange={(e) => onFilterChange({ ...filters, mediaType: e.target.value })}
          className="px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-300 focus:outline-none focus:border-amber-500"
        >
          <option value="">All Media Types</option>
          <option value="PERFORMANCE_VIDEO">Videos (Full Performance)</option>
          <option value="PERFORMANCE_PHOTO">Photos (Full Body)</option>
          <option value="MUDRA_PHOTO">Mudra Isolations</option>
          <option value="POSE_PHOTO">Pose Isolations</option>
          <option value="MOVEMENT_VIDEO">Movement Clips</option>
        </select>

        {/* Sort By Dropdown */}
        <select
          value={filters.sortBy}
          onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as any })}
          className="px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-300 focus:outline-none focus:border-amber-500"
        >
          <option value="NEWEST">Sort: Newest First</option>
          <option value="OLDEST">Sort: Oldest First</option>
          <option value="TITLE">Sort: Alphabetical</option>
          <option value="DURATION">Sort: Duration</option>
        </select>

        {/* Reset Filters */}
        <button
          onClick={onReset}
          className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset Filters ({totalResults})</span>
        </button>
      </div>
    </div>
  );
}
