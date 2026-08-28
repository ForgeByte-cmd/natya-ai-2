import React, { useState } from 'react';
import { X, Search, Filter, Sparkles, MapPin, Music, Award } from 'lucide-react';
import { DANCE_FORMS } from '../data/dances/danceForms';
import { DanceFormCategory, DanceFormRecord } from '../types/dance';

interface DanceFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectForm?: (form: DanceFormRecord) => void;
}

export const DanceFormDrawer: React.FC<DanceFormDrawerProps> = ({
  isOpen,
  onClose,
  onSelectForm,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [activeForm, setActiveForm] = useState<DanceFormRecord | null>(null);

  if (!isOpen) return null;

  const categories: { label: string; value: string }[] = [
    { label: 'All Forms (45+)', value: 'ALL' },
    { label: 'Classical (8 Traditions)', value: 'CLASSICAL' },
    { label: 'Folk Dances', value: 'FOLK' },
    { label: 'Ritual & Devotional', value: 'RITUAL' },
    { label: 'Martial & Tribal', value: 'TRIBAL' },
    { label: 'Dance-Theatre', value: 'THEATRE' },
  ];

  const regions: string[] = ['ALL', 'South India', 'North India', 'West India', 'East India', 'Northeast India'];

  const filteredForms = DANCE_FORMS.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.movementCharacteristics.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || f.category === selectedCategory;
    const matchesRegion = selectedRegion === 'ALL' || f.region.includes(selectedRegion);

    return matchesSearch && matchesCategory && matchesRegion;
  });

  return (
    <div
      id="dance-forms-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="dance-forms-modal-card"
        className="bg-stone-900 border border-stone-700/80 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-xl font-bold text-white">
                Indian Classical & Traditional Dance Traditions
              </h2>
              <p className="text-xs text-stone-400">
                Official repository of 8 Classical Traditions & 35+ Folk & Tribal Art Forms
              </p>
            </div>
          </div>
          <button
            id="btn-close-dance-drawer"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-full bg-stone-800 hover:bg-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-stone-950/60 border-b border-stone-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                id="input-search-dance"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dance name, state, rhythm, mudra..."
                className="w-full pl-9 pr-4 py-2 bg-stone-900 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Region Filter */}
            <select
              id="select-region"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r === 'ALL' ? 'All Indian Regions' : r}
                </option>
              ))}
            </select>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => setSelectedCategory(c.value)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedCategory === c.value
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-800/80 text-stone-400 hover:text-stone-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dance Form Grid & Detail View */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredForms.map((df) => (
            <div
              key={df.id}
              onClick={() => setActiveForm(df)}
              className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-amber-500/60 transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-bold text-white group-hover:text-amber-400 transition">
                      {df.name}
                    </span>
                    <span className="text-xs font-serif text-amber-200/80">
                      {df.nativeName}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      df.category === 'CLASSICAL'
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {df.category}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 text-xs text-stone-400 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>
                    {df.state} • {df.region}
                  </span>
                </div>

                <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed mb-3">
                  {df.description}
                </p>
              </div>

              <div className="pt-2 border-t border-stone-800/60 flex flex-wrap gap-1">
                {df.signatureMudras.slice(0, 3).map((sm, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 bg-stone-800 text-stone-300 rounded"
                  >
                    {sm}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Form Detail Sub-Modal */}
        {activeForm && (
          <div
            id="dance-detail-submodal"
            className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setActiveForm(null)}
          >
            <div
              className="bg-stone-900 border border-stone-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveForm(null)}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-2xl font-bold text-white">{activeForm.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  {activeForm.category}
                </span>
              </div>
              <p className="text-base font-serif text-amber-300/90 mb-3">{activeForm.nativeName}</p>

              <div className="space-y-4 text-xs text-stone-300">
                <div>
                  <h5 className="font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Origin & Tradition
                  </h5>
                  <p>{activeForm.state} ({activeForm.region}) — {activeForm.communityOrTradition}</p>
                </div>

                <div>
                  <h5 className="font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Movement & Postural Aesthetics
                  </h5>
                  <p className="leading-relaxed">{activeForm.movementCharacteristics}</p>
                </div>

                <div>
                  <h5 className="font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Musical Instruments & Tala
                  </h5>
                  <p className="leading-relaxed">{activeForm.musicCharacteristics}</p>
                </div>

                <div>
                  <h5 className="font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Key Stances & Signature Mudras
                  </h5>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {activeForm.keyStances.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-stone-800 rounded text-stone-200">
                        {s}
                      </span>
                    ))}
                    {activeForm.signatureMudras.map((m, i) => (
                      <span key={i} className="px-2 py-0.5 bg-amber-950/60 text-amber-300 border border-amber-800/40 rounded">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-800">
                  <h5 className="font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Authoritative Citations
                  </h5>
                  {activeForm.sources.map((src, i) => (
                    <div key={i} className="text-[11px] text-stone-400">
                      • {src.title} {src.organization ? `(${src.organization})` : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
