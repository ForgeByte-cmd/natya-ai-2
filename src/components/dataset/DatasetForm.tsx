import React, { useEffect } from 'react';
import {
  DatasetMediaType,
  PerformanceMetadata,
} from '../../types/dataset';
import { DANCE_FORMS } from '../../data/dances/danceForms';
import { ASAMYUTA_MUDRAS } from '../../data/mudras/asamyuta';
import { SAMYUTA_MUDRAS } from '../../data/mudras/samyuta';
import { DANCE_POSES } from '../../data/poses/dancePoses';
import { DANCE_MOVEMENTS } from '../../data/movements/danceMovements';
import { Sparkles, Info, ShieldCheck, BookOpen, UserCheck } from 'lucide-react';

interface DatasetFormProps {
  mediaType: DatasetMediaType;
  onMediaTypeChange: (type: DatasetMediaType) => void;
  metadata: PerformanceMetadata;
  onMetadataChange: (metadata: PerformanceMetadata) => void;
}

export function DatasetForm({
  mediaType,
  onMediaTypeChange,
  metadata,
  onMetadataChange,
}: DatasetFormProps) {
  // When dance form changes, auto-populate state, region, and category
  const handleDanceFormChange = (formId: string) => {
    const selectedForm = DANCE_FORMS.find((d) => d.id === formId);
    if (!selectedForm) return;

    onMetadataChange({
      ...metadata,
      danceFormId: formId,
      category: selectedForm.category,
      state: selectedForm.state,
      region: selectedForm.region,
      occasion: metadata.occasion || selectedForm.occasion.split(',')[0],
      source: {
        title: selectedForm.sources[0]?.title || 'Traditional Natya Shastra Documentation',
        organization: selectedForm.sources[0]?.organization || selectedForm.name + ' Heritage Archive',
        sourceType: selectedForm.sources[0]?.sourceType || 'TRADITIONAL_TEXT',
        verified: true,
      },
    });
  };

  const allMudras = [...ASAMYUTA_MUDRAS, ...SAMYUTA_MUDRAS];

  return (
    <div id="dataset-metadata-form" className="space-y-6 bg-stone-900/90 border border-stone-800 rounded-2xl p-5 md:p-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm md:text-base font-bold text-white">
            Performance & Shastric Metadata
          </h3>
        </div>
        <span className="text-[11px] text-stone-400 hidden sm:inline">
          Auto-populated from Natyashastra Knowledge Base
        </span>
      </div>

      {/* Row 1: Media Type & Dance Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Media Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1.5">
            Media Type <span className="text-rose-400">*</span>
          </label>
          <select
            id="select-media-type"
            value={mediaType}
            onChange={(e) => onMediaTypeChange(e.target.value as DatasetMediaType)}
            className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500 transition"
          >
            <option value="PERFORMANCE_VIDEO">Full Performance Video (MP4, WebM, MOV)</option>
            <option value="PERFORMANCE_PHOTO">Performance Photo (JPG, PNG, WEBP)</option>
            <option value="MUDRA_PHOTO">Mudra Hand Gesture Isolation (Photo)</option>
            <option value="POSE_PHOTO">Full-Body Stance / Pose (Photo)</option>
            <option value="MOVEMENT_VIDEO">Codified Movement Clip (Video)</option>
            <option value="TRAINING_SEQUENCE">Verified Landmark Training Sequence</option>
          </select>
        </div>

        {/* Dynamic Dance Form Selector */}
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1.5">
            Dance Tradition <span className="text-rose-400">*</span>
          </label>
          <select
            id="select-dance-form"
            value={metadata.danceFormId}
            onChange={(e) => handleDanceFormChange(e.target.value)}
            className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500 transition"
          >
            <optgroup label="Classical Dance Traditions (8 SNA Recognized)">
              {DANCE_FORMS.filter((d) => d.category === 'CLASSICAL').map((df) => (
                <option key={df.id} value={df.id}>
                  {df.name} ({df.state})
                </option>
              ))}
            </optgroup>
            <optgroup label="Regional Folk & Traditional Dances">
              {DANCE_FORMS.filter((d) => d.category !== 'CLASSICAL').map((df) => (
                <option key={df.id} value={df.id}>
                  {df.name} ({df.state}) - {df.category}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Row 2: Performance Type, Category, State */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1.5">
            Performance Type
          </label>
          <select
            id="select-performance-type"
            value={metadata.performanceType}
            onChange={(e) =>
              onMetadataChange({
                ...metadata,
                performanceType: e.target.value as 'SOLO' | 'DUET' | 'GROUP',
              })
            }
            className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
          >
            <option value="SOLO">Solo Performance</option>
            <option value="DUET">Duet (Yugma)</option>
            <option value="GROUP">Group Ensemble (Vrindanritya)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1.5">
            Tradition Category
          </label>
          <input
            type="text"
            value={metadata.category}
            onChange={(e) =>
              onMetadataChange({
                ...metadata,
                category: e.target.value as any,
              })
            }
            className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-300 focus:outline-none focus:border-amber-500"
            placeholder="CLASSICAL, FOLK, RITUAL, etc."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1.5">
            State / Region
          </label>
          <input
            type="text"
            value={metadata.state || ''}
            onChange={(e) =>
              onMetadataChange({
                ...metadata,
                state: e.target.value,
              })
            }
            className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-300 focus:outline-none focus:border-amber-500"
            placeholder="e.g. Tamil Nadu, Kerala, Gujarat"
          />
        </div>
      </div>

      {/* Row 3: Specific Shastric Labeling (Mudra, Pose, Movement) */}
      <div className="p-4 rounded-xl bg-stone-950 border border-stone-800/90 space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Shastric & Kinematic Labels
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mudra Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Associated Mudra
            </label>
            <select
              id="select-mudra"
              value={metadata.mudraId || ''}
              onChange={(e) =>
                onMetadataChange({
                  ...metadata,
                  mudraId: e.target.value || undefined,
                })
              }
              className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            >
              <option value="">None / Full Choreography</option>
              <optgroup label="Asamyuta Hastas (Single Hand - 28)">
                {ASAMYUTA_MUDRAS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} - {m.sanskritName}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Samyuta Hastas (Combined Hands - 24)">
                {SAMYUTA_MUDRAS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} - {m.sanskritName}
                  </option>
                ))}
              </optgroup>
            </select>

            {metadata.mudraId && (
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-[11px] text-stone-400">Hand:</span>
                {(['Both', 'Right', 'Left'] as const).map((hand) => (
                  <button
                    key={hand}
                    type="button"
                    onClick={() => onMetadataChange({ ...metadata, mudraHandedness: hand })}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                      metadata.mudraHandedness === hand
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-stone-900 text-stone-400 border-stone-800'
                    }`}
                  >
                    {hand}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pose Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Associated Stance / Pose
            </label>
            <select
              id="select-pose"
              value={metadata.poseId || ''}
              onChange={(e) =>
                onMetadataChange({
                  ...metadata,
                  poseId: e.target.value || undefined,
                })
              }
              className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            >
              <option value="">None / Dynamic Movement</option>
              {DANCE_POSES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="mt-2">
              <select
                value={metadata.bodyOrientation || 'FRONTAL'}
                onChange={(e) =>
                  onMetadataChange({
                    ...metadata,
                    bodyOrientation: e.target.value as any,
                  })
                }
                className="w-full px-2 py-1 bg-stone-900 border border-stone-800 rounded-lg text-[11px] text-stone-400"
              >
                <option value="FRONTAL">Frontal Angle (0°)</option>
                <option value="THREE_QUARTER">Three-Quarter Profile (45°)</option>
                <option value="PROFILE_LEFT">Left Lateral Profile (90°)</option>
                <option value="PROFILE_RIGHT">Right Lateral Profile (90°)</option>
              </select>
            </div>
          </div>

          {/* Movement Selector & Segment Markers */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Codified Movement
            </label>
            <select
              id="select-movement"
              value={metadata.movementId || ''}
              onChange={(e) =>
                onMetadataChange({
                  ...metadata,
                  movementId: e.target.value || undefined,
                })
              }
              className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            >
              <option value="">None / Continuous Adavu</option>
              {DANCE_MOVEMENTS.map((mov) => (
                <option key={mov.id} value={mov.id}>
                  {mov.name}
                </option>
              ))}
            </select>

            {mediaType.includes('VIDEO') && (
              <div className="mt-2 flex items-center space-x-2 text-[11px] text-stone-400">
                <span>Segment:</span>
                <input
                  type="number"
                  placeholder="Start (s)"
                  value={metadata.segmentStartTime || 0}
                  onChange={(e) =>
                    onMetadataChange({
                      ...metadata,
                      segmentStartTime: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-16 px-1.5 py-0.5 bg-stone-900 border border-stone-800 rounded text-center text-stone-200"
                  step="0.5"
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="End (s)"
                  value={metadata.segmentEndTime || 10}
                  onChange={(e) =>
                    onMetadataChange({
                      ...metadata,
                      segmentEndTime: parseFloat(e.target.value) || 10,
                    })
                  }
                  className="w-16 px-1.5 py-0.5 bg-stone-900 border border-stone-800 rounded text-center text-stone-200"
                  step="0.5"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Occasion, Language, Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1.5">
            Occasion / Recital Context
          </label>
          <input
            type="text"
            value={metadata.occasion || ''}
            onChange={(e) =>
              onMetadataChange({
                ...metadata,
                occasion: e.target.value,
              })
            }
            className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            placeholder="e.g. Margam Varnam, Navratri, Temple Utsavam"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1.5">
            Lyrical / Cultural Language
          </label>
          <input
            type="text"
            value={metadata.language || ''}
            onChange={(e) =>
              onMetadataChange({
                ...metadata,
                language: e.target.value,
              })
            }
            className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            placeholder="e.g. Sanskrit, Tamil, Telugu, Hindi"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-stone-300 mb-1.5">
          Performance Notes & Choreography Description
        </label>
        <textarea
          rows={2}
          value={metadata.description || ''}
          onChange={(e) =>
            onMetadataChange({
              ...metadata,
              description: e.target.value,
            })
          }
          className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
          placeholder="Describe the choreography section, Gharana/Bani lineage, rhythm (Tala/Laya), and narrative context..."
        />
      </div>

      {/* Row 5: Cultural Source, Attribution, License */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-stone-800">
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1.5">
            Verified Cultural Source / Institution <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={metadata.source.title}
            onChange={(e) =>
              onMetadataChange({
                ...metadata,
                source: {
                  ...metadata.source,
                  title: e.target.value,
                },
              })
            }
            className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            placeholder="e.g. Kalakshetra Foundation / Sangeet Natak Akademi / Guru Archive"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1.5">
            Attribution & Archival License
          </label>
          <input
            type="text"
            value={metadata.attribution || ''}
            onChange={(e) =>
              onMetadataChange({
                ...metadata,
                attribution: e.target.value,
                license: 'CC BY-NC-SA 4.0 (Cultural Heritage Research)',
              })
            }
            className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            placeholder="Performer/Videographer attribution and permissions"
          />
        </div>
      </div>

      {/* Mandatory Consent & Copyright Agreements */}
      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2.5">
        <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Ethics, Performer Consent & Copyright Validation</span>
        </div>

        <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-stone-300">
          <input
            type="checkbox"
            id="checkbox-performer-consent"
            checked={metadata.performerConsent}
            onChange={(e) =>
              onMetadataChange({
                ...metadata,
                performerConsent: e.target.checked,
              })
            }
            className="mt-0.5 rounded border-stone-700 text-amber-600 focus:ring-amber-500 focus:ring-offset-stone-900"
          />
          <span>
            <strong>Performer Consent Confirmed:</strong> The performing artist(s) have explicitly granted consent to record, analyze, and archive their performance data for Indian classical dance research.
          </span>
        </label>

        <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-stone-300">
          <input
            type="checkbox"
            id="checkbox-uploader-auth"
            checked={metadata.uploaderAuthorization}
            onChange={(e) =>
              onMetadataChange({
                ...metadata,
                uploaderAuthorization: e.target.checked,
              })
            }
            className="mt-0.5 rounded border-stone-700 text-amber-600 focus:ring-amber-500 focus:ring-offset-stone-900"
          />
          <span>
            <strong>Authorized Uploader:</strong> I verify that I possess all necessary copyright rights or legitimate academic permissions for this media. Internet scrapings without consent are prohibited.
          </span>
        </label>
      </div>
    </div>
  );
}
