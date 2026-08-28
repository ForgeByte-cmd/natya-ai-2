import React from 'react';
import { BookMarked, Sparkles, User, Heart } from 'lucide-react';
import { SceneMatch } from '../types/story';

interface StorySceneCardProps {
  scenes: SceneMatch[];
}

export const StorySceneCard: React.FC<StorySceneCardProps> = ({ scenes }) => {
  if (!scenes || scenes.length === 0) return null;

  const activeScene = scenes[0];

  return (
    <div
      id="story-scene-card"
      className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <BookMarked className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">
            Mythological Narrative Match
          </h3>
        </div>
        <span className="text-[11px] font-mono text-stone-400">
          {Math.round(activeScene.confidence * 100)}% Scene Fit
        </span>
      </div>

      <h4 className="text-base font-bold text-white mb-0.5">{activeScene.storyTitle}</h4>
      <div className="flex items-center space-x-2 text-xs font-serif text-amber-300/90 mb-2.5">
        <span>Scene: {activeScene.sceneName}</span>
        <span>•</span>
        <span className="text-rose-400">Rasa: {activeScene.rasa}</span>
      </div>

      <p className="text-xs text-stone-300 leading-relaxed mb-3">
        {activeScene.narrativeDescription}
      </p>

      {/* Characters Pill list */}
      <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-xs text-stone-400">
          <User className="w-3.5 h-3.5 text-stone-400" />
          <span>Characters:</span>
          <span className="text-stone-200 font-medium">{activeScene.characters.join(', ')}</span>
        </div>

        <div className="text-[11px] text-purple-300 font-medium flex items-center space-x-1">
          <Sparkles className="w-3 h-3" />
          <span>{activeScene.culturalSignificance}</span>
        </div>
      </div>
    </div>
  );
};
