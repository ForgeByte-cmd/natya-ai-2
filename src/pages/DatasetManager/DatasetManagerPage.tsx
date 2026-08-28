import React, { useState, useEffect } from 'react';
import {
  Upload,
  Database,
  BarChart3,
  Layers,
  Sparkles,
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  DatasetMediaType,
  DatasetSample,
  DatasetStats,
  ModelVersion,
  PerformanceAnalysisReport,
  PerformanceMetadata,
} from '../../types/dataset';
import {
  getDatasetSamples,
  getDatasetStats,
  getModelVersions,
  deleteDatasetSample,
  getPerformanceReportById,
} from '../../services/dataset/createDatasetRecord';
import { DatasetForm } from '../../components/dataset/DatasetForm';
import { DatasetUploader } from '../../components/dataset/DatasetUploader';
import { DatasetFilters, DatasetFilterState } from '../../components/dataset/DatasetFilters';
import { DatasetTable } from '../../components/dataset/DatasetTable';
import { DatasetReviewModal } from '../../components/dataset/DatasetReviewModal';
import { DatasetStatsView } from '../../components/dataset/DatasetStatsView';
import { PerformanceResultView } from '../../components/dataset/PerformanceResultView';
import { analyzePerformanceMedia } from '../../services/dataset/analyzePerformance';

interface DatasetManagerPageProps {
  initialPerformanceId?: string;
  onNavigateToLiveCamera?: () => void;
}

export function DatasetManagerPage({
  initialPerformanceId,
  onNavigateToLiveCamera,
}: DatasetManagerPageProps) {
  const [activeTab, setActiveTab] = useState<'INGEST' | 'BROWSE' | 'STATS'>('INGEST');
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<string | null>(
    initialPerformanceId || null
  );

  // Form State
  const [mediaType, setMediaType] = useState<DatasetMediaType>('PERFORMANCE_VIDEO');
  const [metadata, setMetadata] = useState<PerformanceMetadata>({
    danceFormId: 'bharatanatyam',
    category: 'CLASSICAL',
    state: 'Tamil Nadu',
    region: 'South India',
    performanceType: 'SOLO',
    occasion: 'Margam Recital',
    language: 'Tamil / Sanskrit',
    description: '',
    performerConsent: true,
    uploaderAuthorization: true,
    source: {
      title: 'Kalakshetra Foundation & Traditional Natya Archives',
      organization: 'Classical Dance Heritage Center',
      sourceType: 'ARCHIVE',
      verified: true,
    },
    mudraId: 'pataka',
    mudraHandedness: 'Both',
    poseId: 'aramandi',
    bodyOrientation: 'FRONTAL',
  });

  // Data State
  const [samples, setSamples] = useState<DatasetSample[]>([]);
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([]);
  const [reviewingSample, setReviewingSample] = useState<DatasetSample | null>(null);
  const [activeReport, setActiveReport] = useState<PerformanceAnalysisReport | null>(null);

  // Filters State
  const [filters, setFilters] = useState<DatasetFilterState>({
    searchQuery: '',
    danceFormId: '',
    category: '',
    mediaType: '',
    status: 'ALL',
    sortBy: 'NEWEST',
  });

  const reloadData = () => {
    const loadedSamples = getDatasetSamples();
    setSamples(loadedSamples);
    setStats(getDatasetStats());
    setModelVersions(getModelVersions());
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Handle viewing a specific performance
  useEffect(() => {
    if (selectedPerformanceId) {
      const existingReport = getPerformanceReportById(selectedPerformanceId);
      if (existingReport) {
        setActiveReport(existingReport);
      } else {
        const sample = samples.find((s) => s.id === selectedPerformanceId);
        if (sample) {
          // Generate on the fly if needed
          analyzePerformanceMedia({
            sampleId: sample.id,
            title: sample.title,
            mediaType: sample.mediaType,
            mediaUrl: sample.mediaUrl,
            thumbnailUrl: sample.thumbnailUrl,
            metadata: sample.metadata,
            frames: sample.extractedFrames || [],
            duration: sample.duration || 1,
          }).then((r) => setActiveReport(r));
        }
      }
    } else {
      setActiveReport(null);
    }
  }, [selectedPerformanceId, samples]);

  const handleSampleCreated = (newSample: DatasetSample) => {
    reloadData();
  };

  const handleDeleteSample = (sampleId: string) => {
    deleteDatasetSample(sampleId);
    reloadData();
  };

  // Filter and sort samples
  const filteredSamples = samples
    .filter((s) => {
      // Status Filter
      if (filters.status !== 'ALL' && s.status !== filters.status) return false;
      // Dance form filter
      if (filters.danceFormId && s.danceFormId !== filters.danceFormId) return false;
      // Media type filter
      if (filters.mediaType && s.mediaType !== filters.mediaType) return false;
      // Search query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const titleMatch = s.title.toLowerCase().includes(q);
        const dfMatch = (s.danceFormName || '').toLowerCase().includes(q);
        const mudraMatch = (s.mudraName || '').toLowerCase().includes(q);
        const poseMatch = (s.poseName || '').toLowerCase().includes(q);
        const sourceMatch = (s.metadata?.source?.title || '').toLowerCase().includes(q);
        if (!titleMatch && !dfMatch && !mudraMatch && !poseMatch && !sourceMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'NEWEST') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (filters.sortBy === 'OLDEST') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (filters.sortBy === 'TITLE') {
        return a.title.localeCompare(b.title);
      }
      if (filters.sortBy === 'DURATION') {
        return (b.duration || 0) - (a.duration || 0);
      }
      return 0;
    });

  // If viewing a detailed performance report
  if (activeReport) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 p-4 md:p-8">
        <PerformanceResultView
          report={activeReport}
          onBack={() => setSelectedPerformanceId(null)}
        />
      </div>
    );
  }

  return (
    <div id="dataset-manager-page" className="min-h-screen bg-stone-950 text-stone-100 p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-950/90 border border-amber-800/60 text-amber-300 text-xs font-mono">
              Research & Machine Learning Pipeline
            </span>
            <span className="text-xs text-stone-400">v2.4 Production</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
            Performance Dataset & Shastric Knowledge Manager
          </h1>
          <p className="text-xs md:text-sm text-stone-400 mt-1 max-w-2xl">
            Ingest, extract MediaPipe landmarks, validate Anga-shuddhi, partition training splits, and extract deep cultural meaning from Natyashastra recordings.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 bg-stone-900 p-1 rounded-2xl border border-stone-800 self-start md:self-auto shrink-0">
          <button
            onClick={() => setActiveTab('INGEST')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'INGEST'
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload & Ingest</span>
          </button>

          <button
            onClick={() => setActiveTab('BROWSE')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'BROWSE'
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Archival Dataset ({samples.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('STATS')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'STATS'
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Model & Splits</span>
          </button>
        </div>
      </div>

      {/* TAB 1: INGEST & UPLOAD */}
      {activeTab === 'INGEST' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Metadata & Shastric Form (7 cols) */}
          <div className="lg:col-span-7">
            <DatasetForm
              mediaType={mediaType}
              onMediaTypeChange={setMediaType}
              metadata={metadata}
              onMetadataChange={setMetadata}
            />
          </div>

          {/* Right Column: Multi-File Drag & Drop Uploader (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center space-x-2 border-b border-stone-800 pb-3">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm md:text-base font-bold text-white">
                  Media Ingestion & Landmark Extraction
                </h3>
              </div>

              <DatasetUploader
                mediaType={mediaType}
                metadata={metadata}
                onSampleCreated={handleSampleCreated}
                onNavigateToPerformance={(perfId) => setSelectedPerformanceId(perfId)}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BROWSE & REVIEW DATASET */}
      {activeTab === 'BROWSE' && (
        <div className="space-y-4">
          <DatasetFilters
            filters={filters}
            onFilterChange={setFilters}
            onReset={() =>
              setFilters({
                searchQuery: '',
                danceFormId: '',
                category: '',
                mediaType: '',
                status: 'ALL',
                sortBy: 'NEWEST',
              })
            }
            totalResults={filteredSamples.length}
          />

          <DatasetTable
            samples={filteredSamples}
            onReviewSample={(s) => setReviewingSample(s)}
            onViewPerformance={(id) => setSelectedPerformanceId(id)}
            onDeleteSample={handleDeleteSample}
          />
        </div>
      )}

      {/* TAB 3: ML SPLITS, METRICS & RETRAINING */}
      {activeTab === 'STATS' && stats && (
        <DatasetStatsView
          stats={stats}
          modelVersions={modelVersions}
          onModelRetrained={reloadData}
        />
      )}

      {/* Human Review Modal */}
      {reviewingSample && (
        <DatasetReviewModal
          sample={reviewingSample}
          onClose={() => setReviewingSample(null)}
          onUpdated={() => {
            reloadData();
            setReviewingSample(null);
          }}
        />
      )}
    </div>
  );
}
