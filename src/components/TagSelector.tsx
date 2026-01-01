import { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TagSelectorProps {
  selectedTags: string[];
  maxTags?: number;
  isDark?: boolean;
  onChange: (tags: string[]) => void;
}

const STORAGE_KEY = 'tag-history';

// Get tag history from localStorage
const getTagHistory = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save tag to history
const saveTagToHistory = (tag: string) => {
  try {
    const history = getTagHistory();
    if (!history.includes(tag)) {
      const newHistory = [tag, ...history].slice(0, 20); // Keep max 20 tags
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    }
  } catch {}
};

export const TagSelector = memo(function TagSelector({
  selectedTags,
  maxTags = 2,
  isDark = true,
  onChange,
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [tagHistory, setTagHistory] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load tag history on mount
  useEffect(() => {
    setTagHistory(getTagHistory());
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && selectedTags.length < maxTags && !selectedTags.includes(trimmed)) {
      onChange([...selectedTags, trimmed]);
      saveTagToHistory(trimmed);
      setTagHistory(getTagHistory());
      setInputValue('');
    }
  };

  const handleRemoveTag = (index: number) => {
    onChange(selectedTags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      handleRemoveTag(selectedTags.length - 1);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  // Filter suggestions: exclude already selected, match input
  const suggestions = tagHistory.filter(
    (tag) => !selectedTags.includes(tag) && tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  const canAddMore = selectedTags.length < maxTags;

  // Theme styles
  const containerBg = isDark ? 'bg-white/10' : 'bg-gray-100';
  const containerBorder = isDark ? 'border-white/20' : 'border-gray-200';
  const inputText = isDark ? 'text-white placeholder-white/40' : 'text-gray-900 placeholder-gray-400';
  const tagBg = isDark ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-700';
  const tagHover = isDark ? 'hover:bg-blue-500/50' : 'hover:bg-blue-200';
  const dropdownBg = isDark ? 'bg-gray-800/95' : 'bg-white/95';
  const dropdownBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const itemHover = isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100';
  const itemText = isDark ? 'text-white/70' : 'text-gray-600';
  const hintText = isDark ? 'text-white/30' : 'text-gray-400';

  return (
    <div className="relative" ref={containerRef}>
      {/* Input Container */}
      <div
        className={`flex flex-wrap items-center gap-1 px-2 py-1.5 ${containerBg} ${containerBorder} border rounded-lg min-h-[30px] cursor-text transition-all ${
          isOpen ? 'ring-1 ring-blue-500' : ''
        }`}
        onClick={() => {
          inputRef.current?.focus();
          setIsOpen(true);
        }}
      >
        {/* Selected Tags */}
        {selectedTags.map((tag, index) => (
          <motion.span
            key={tag}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className={`group/tag inline-flex items-center px-1.5 py-0.5 ${tagBg} text-[10px] rounded`}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(index);
              }}
              className={`${tagHover} rounded p-0.5 transition-all ml-0.5 opacity-0 group-hover/tag:opacity-100 w-0 group-hover/tag:w-auto overflow-hidden`}
            >
              <i className="fa-solid fa-times text-[8px]" />
            </button>
          </motion.span>
        ))}

        {/* Input */}
        {canAddMore && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            className={`flex-1 min-w-[60px] bg-transparent ${inputText} text-xs focus:outline-none`}
            placeholder={selectedTags.length === 0 ? '添加标签...' : ''}
            maxLength={10}
          />
        )}

        {/* Tag count hint */}
        {!canAddMore && (
          <span className={`text-[10px] ${hintText} ml-1`}>已满</span>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && canAddMore && (tagHistory.length > 0 || inputValue) && (
          <motion.div
            className={`absolute top-full left-0 right-0 mt-1 ${dropdownBg} backdrop-blur-xl rounded-lg ${dropdownBorder} border shadow-xl overflow-hidden z-50`}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <div className="max-h-32 overflow-y-auto">
              {/* Create new tag option */}
              {inputValue && !tagHistory.includes(inputValue) && (
                <button
                  type="button"
                  className={`w-full px-2.5 py-1.5 text-left text-xs ${itemHover} ${itemText} transition-colors flex items-center gap-2`}
                  onClick={() => handleAddTag(inputValue)}
                >
                  <i className="fa-solid fa-plus text-[10px] text-blue-400" />
                  <span>创建 "<span className="text-blue-400">{inputValue}</span>"</span>
                </button>
              )}

              {/* Suggestions - show all history when no input */}
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`w-full px-2.5 py-1.5 text-left text-xs ${itemHover} ${itemText} transition-colors flex items-center gap-2`}
                  onClick={() => {
                    handleAddTag(tag);
                    setInputValue('');
                  }}
                >
                  <i className="fa-solid fa-tag text-[10px] opacity-50" />
                  {tag}
                </button>
              ))}

              {/* Empty state - only when no history at all */}
              {tagHistory.length === 0 && !inputValue && (
                <div className={`px-2.5 py-2 text-xs ${hintText} text-center`}>
                  输入标签名称...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
