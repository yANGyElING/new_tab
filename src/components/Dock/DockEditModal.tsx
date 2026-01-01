import { useState, useEffect, memo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DockItem } from './types';
import { IconDropdown } from './IconDropdown';
import { TagSelector } from '@/components/TagSelector';
import { useTransparency } from '@/contexts/TransparencyContext';

interface DockEditModalProps {
  item?: DockItem | null;
  onClose: () => void;
  onSave: (item: DockItem) => void;
}

export const DockEditModal = memo(function DockEditModal({
  item,
  onClose,
  onSave,
}: DockEditModalProps) {
  const { darkMode } = useTransparency();
  const isEditing = !!item?.id;
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedUrlRef = useRef<string>('');

  const [formData, setFormData] = useState({
    name: item?.name || '',
    url: item?.url || '',
    favicon: item?.favicon || '',
    icon: item?.icon || '',
    iconColor: item?.iconColor || '#FFFFFF',
    location: item?.location || 'dock' as 'dock' | 'home',
    note: item?.note || '',
  });

  const [formTags, setFormTags] = useState<string[]>(item?.tags || []);
  const [autoFetching, setAutoFetching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isUrlValid = formData.url.trim().startsWith('http');
  const canSubmit = formData.name.trim() && isUrlValid;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Auto-fetch when URL changes (debounced)
  const autoFetch = useCallback(async (url: string) => {
    if (!url.trim().startsWith('http')) return;
    if (url === lastFetchedUrlRef.current) return;

    try {
      setAutoFetching(true);
      lastFetchedUrlRef.current = url;
      const domain = new URL(url).hostname;

      let pageTitle = '';
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
        const data = await response.json();
        if (data.contents) {
          const titleMatch = data.contents.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) pageTitle = titleMatch[1].trim();
        }
      } catch {}

      const faviconUrls = [
        `https://favicon.im/${domain}?larger=true`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      ];

      let workingFavicon = '';
      for (const faviconUrl of faviconUrls) {
        try {
          const img = new Image();
          const result = await new Promise<string>((resolve, reject) => {
            img.onload = () => resolve(faviconUrl);
            img.onerror = reject;
            img.src = faviconUrl;
            setTimeout(reject, 3000);
          });
          workingFavicon = result;
          break;
        } catch { continue; }
      }

      setFormData((prev) => ({
        ...prev,
        favicon: workingFavicon || prev.favicon,
        name: prev.name || pageTitle || domain.replace('www.', '').split('.')[0],
        icon: workingFavicon ? '' : prev.icon,
      }));
      setErrors({});
    } catch {
      setErrors({ url: '无法解析该网址' });
    } finally {
      setAutoFetching(false);
    }
  }, []);

  // Debounced URL change handler
  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    if (formData.url.trim().startsWith('http') && formData.url !== lastFetchedUrlRef.current) {
      fetchTimeoutRef.current = setTimeout(() => {
        autoFetch(formData.url);
      }, 800);
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [formData.url, autoFetch]);

  const handleIconSelect = (icon: string, color: string) => {
    setFormData((prev) => ({ ...prev, icon, iconColor: color, favicon: '' }));
  };

  const handleUpload = (dataUrl: string) => {
    setFormData((prev) => ({ ...prev, favicon: dataUrl, icon: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const newItem: DockItem = {
      id: item?.id || `dock-${Date.now()}`,
      name: formData.name.trim(),
      url: formData.url.trim(),
      favicon: formData.favicon,
      icon: formData.icon || undefined,
      iconColor: formData.iconColor || undefined,
      location: formData.location,
      tags: formTags.length > 0 ? formTags : undefined,
      note: formData.note.trim() || undefined,
    };

    onSave(newItem);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  // Theme styles
  const modalBg = darkMode ? 'bg-gray-900/95' : 'bg-white/95';
  const borderColor = darkMode ? 'border-white/10' : 'border-gray-200';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-white/50' : 'text-gray-400';
  const inputBg = darkMode ? 'bg-white/10' : 'bg-gray-100';
  const inputBorder = darkMode ? 'border-white/20' : 'border-gray-200';
  const inputText = darkMode ? 'text-white placeholder-white/40' : 'text-gray-900 placeholder-gray-400';
  const btnSecondary = darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700';
  const btnDisabled = darkMode ? 'bg-white/5 text-white/30' : 'bg-gray-50 text-gray-300';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={`${modalBg} backdrop-blur-xl rounded-2xl p-4 w-80 mx-4 ${borderColor} border shadow-2xl`}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold ${textColor}`}>
              {isEditing ? '编辑' : '添加快捷方式'}
            </h3>
            <button onClick={onClose} className={`p-1 ${textMuted} hover:${textColor} rounded transition-colors`}>
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          </div>

          {/* Icon Preview */}
          <div className="flex items-center justify-center mb-3 relative">
            <IconDropdown
              selectedIcon={formData.icon}
              selectedColor={formData.iconColor}
              favicon={formData.favicon}
              isDark={darkMode}
              onSelect={handleIconSelect}
              onUpload={handleUpload}
            />
            {autoFetching && (
              <div className="absolute -right-2 -top-2">
                <i className="fa-solid fa-spinner fa-spin text-blue-400 text-xs" />
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {/* URL */}
            <div className="relative">
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                className={`w-full px-2.5 py-1.5 ${inputBg} ${inputBorder} border rounded-lg ${inputText} text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8`}
                placeholder="输入网址"
              />
              {autoFetching && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <i className="fa-solid fa-spinner fa-spin text-blue-400 text-[10px]" />
                </div>
              )}
            </div>
            {errors.url && <p className="text-[10px] text-red-400">{errors.url}</p>}

            {/* Name */}
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-2.5 py-1.5 ${inputBg} ${inputBorder} border rounded-lg ${inputText} text-xs focus:outline-none focus:ring-1 focus:ring-blue-500`}
              placeholder="名称"
              maxLength={20}
            />

            {/* Tags - Notion Style */}
            <TagSelector
              selectedTags={formTags}
              maxTags={2}
              isDark={darkMode}
              onChange={setFormTags}
            />

            {/* Note */}
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              className={`w-full px-2.5 py-1.5 ${inputBg} ${inputBorder} border rounded-lg ${inputText} text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none`}
              placeholder="备注"
              rows={2}
              maxLength={100}
            />

            {/* Location Toggle - More Elegant */}
            <div className="flex items-center justify-between py-1">
              <span className={`text-xs ${textMuted}`}>
                <i className="fa-solid fa-location-dot mr-1.5 text-[10px]" />
                展示位置
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, location: 'dock' }))}
                  className={`px-2 py-1 text-[10px] rounded-md transition-all ${
                    formData.location === 'dock'
                      ? 'bg-blue-500 text-white'
                      : `${darkMode ? 'text-white/50 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`
                  }`}
                >
                  <i className="fa-solid fa-grip-lines mr-1" />
                  Dock
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, location: 'home' }))}
                  className={`px-2 py-1 text-[10px] rounded-md transition-all ${
                    formData.location === 'home'
                      ? 'bg-blue-500 text-white'
                      : `${darkMode ? 'text-white/50 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`
                  }`}
                >
                  <i className="fa-solid fa-house mr-1" />
                  主页
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1.5">
              <motion.button
                type="button"
                onClick={onClose}
                className={`flex-1 px-2.5 py-1.5 ${btnSecondary} rounded-lg text-xs transition-colors`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                取消
              </motion.button>
              <motion.button
                type="submit"
                disabled={!canSubmit}
                className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  canSubmit ? 'bg-blue-500 hover:bg-blue-600 text-white' : btnDisabled
                }`}
                whileHover={canSubmit ? { scale: 1.02 } : {}}
                whileTap={canSubmit ? { scale: 0.98 } : {}}
              >
                {isEditing ? '保存' : '添加'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
