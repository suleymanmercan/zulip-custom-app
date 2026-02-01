import { useState } from 'react';
import { X } from 'lucide-react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const emojiCategories = {
  'Yüzler': ['😊', '😂', '🤣', '😍', '😘', '😎', '🤔', '😴', '😢', '😭', '😡', '🤯', '😱', '🥳', '🤪', '😇', '🥺', '👀'],
  'Eller': ['👍', '👎', '👌', '✌️', '🤞', '🤝', '👏', '🙌', '🙏', '💪', '✊', '👊', '🤘', '👋', '🤙'],
  'Kalpler': ['❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'Semboller': ['✨', '⭐', '🌟', '💫', '🔥', '💯', '✅', '❌', '⚠️', '💡', '🚀', '🎉', '🎊', '🎈', '🎁'],
};

export const EmojiPicker = ({ onSelect, onClose }: EmojiPickerProps) => {
  const [activeCategory, setActiveCategory] = useState('Yüzler');

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 bg-[#1a1e23] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <span className="text-sm font-bold text-gray-300">Emoji Seç</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-2 border-b border-gray-800 overflow-x-auto">
        {Object.keys(emojiCategories).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeCategory === category
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="p-3 max-h-64 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-8 gap-1">
          {emojiCategories[activeCategory as keyof typeof emojiCategories].map((emoji, index) => (
            <button
              key={index}
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              className="w-9 h-9 flex items-center justify-center text-2xl hover:bg-gray-800 rounded-lg transition-all hover:scale-110 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Footer tip */}
      <div className="p-2 border-t border-gray-800 bg-gray-900/50">
        <p className="text-[10px] text-gray-600 text-center">
          Veya <span className="text-indigo-400">:emoji_name:</span> yazabilirsin
        </p>
      </div>
    </div>
  );
};
