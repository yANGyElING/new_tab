import { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BUILT_IN_ICONS, ICON_COLORS } from './types';

interface IconDropdownProps {
  selectedIcon?: string;
  selectedColor?: string;
  favicon?: string;
  isDark?: boolean;
  onSelect: (icon: string, color: string) => void;
  onUpload: (dataUrl: string) => void;
}

export const IconDropdown = memo(function IconDropdown({
  selectedIcon,
  selectedColor = '#FFFFFF',
  favicon,
  isDark = true,
  onSelect,
  onUpload,
}: IconDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIcon, setCurrentIcon] = useState(selectedIcon || '');
  const [currentColor, setCurrentColor] = useState(selectedColor);
  const [customIcons, setCustomIcons] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentIcon(selectedIcon || '');
    setCurrentColor(selectedColor);
  }, [selectedIcon, selectedColor]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleIconSelect = (icon: string) => {
    setCurrentIcon(icon);
    onSelect(icon, currentColor);
  };

  const handleColorSelect = (color: string) => {
    setCurrentColor(color);
    if (currentIcon) onSelect(currentIcon, color);
  };

  const handleCustomColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCurrentColor(color);
    if (currentIcon) onSelect(currentIcon, color);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          setCustomIcons(prev => [...prev, dataUrl]);
          onUpload(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const renderPreviewIcon = () => {
    if (currentIcon) {
      return <i className={`${currentIcon} text-lg`} style={{ color: currentColor }} />;
    }
    if (favicon) {
      return (
        <img src={favicon} alt="图标" className="w-6 h-6 object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      );
    }
    return <i className="fa-solid fa-icons text-white/30 text-lg" />;
  };

  // Theme styles
  const bgColor = isDark ? 'bg-gray-800/95' : 'bg-white/95';
  const borderColor = isDark ? 'border-white/10' : 'border-gray-200';
  const dividerColor = isDark ? 'bg-white/10' : 'bg-gray-200';
  const scrollThumb = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
  const scrollThumbHover = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';

  const displayIcons = BUILT_IN_ICONS.slice(0, 20);
  const hasCustom = customIcons.length > 0;

  // Check if current color is a custom color (not in presets)
  const isCustomColor = !ICON_COLORS.some(c => c.value === currentColor);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative group"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
            isOpen ? 'ring-2 ring-blue-400' : 'group-hover:ring-2 group-hover:ring-blue-400/50'
          }`}
          style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
        >
          {renderPreviewIcon()}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <motion.i
            className={`fa-solid fa-chevron-down text-[7px] ${isDark ? 'text-white/70' : 'text-gray-600'}`}
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </motion.button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`absolute top-full left-1/2 mt-2 w-[252px] ${bgColor} backdrop-blur-xl rounded-xl ${borderColor} border shadow-2xl overflow-hidden z-50`}
            style={{ x: '-50%' }}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {/* Icons Area */}
            <div
              className="p-2 overflow-y-auto dock-icon-scroll"
              style={{
                maxHeight: hasCustom ? '108px' : 'none',
                scrollbarWidth: 'thin',
                scrollbarColor: `${scrollThumb} transparent`,
              }}
            >
              <style>{`
                .dock-icon-scroll::-webkit-scrollbar { width: 3px; }
                .dock-icon-scroll::-webkit-scrollbar-track { background: transparent; }
                .dock-icon-scroll::-webkit-scrollbar-thumb { background: ${scrollThumb}; border-radius: 3px; }
                .dock-icon-scroll::-webkit-scrollbar-thumb:hover { background: ${scrollThumbHover}; }
              `}</style>
              <div className="grid grid-cols-7 gap-1">
                {displayIcons.map((icon) => (
                  <motion.button
                    key={icon.id}
                    type="button"
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      currentIcon === icon.icon
                        ? `${isDark ? 'bg-blue-500/40' : 'bg-blue-500/20'} ring-1 ring-blue-400`
                        : `${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleIconSelect(icon.icon)}
                    title={icon.name}
                  >
                    <i
                      className={`${icon.icon} text-xs`}
                      style={{ color: currentIcon === icon.icon ? currentColor : (isDark ? '#fff' : '#374151') }}
                    />
                  </motion.button>
                ))}

                {customIcons.map((dataUrl, idx) => (
                  <motion.button
                    key={`custom-${idx}`}
                    type="button"
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      favicon === dataUrl
                        ? `${isDark ? 'bg-blue-500/40' : 'bg-blue-500/20'} ring-1 ring-blue-400`
                        : `${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onUpload(dataUrl)}
                  >
                    <img src={dataUrl} alt="" className="w-5 h-5 object-contain" />
                  </motion.button>
                ))}

                <motion.button
                  type="button"
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border border-dashed ${
                    isDark ? 'border-white/15 hover:bg-white/10' : 'border-gray-200 hover:bg-gray-100'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current?.click()}
                  title="上传图标"
                >
                  <i className={`fa-solid fa-plus text-[10px] ${isDark ? 'text-white/30' : 'text-gray-300'}`} />
                </motion.button>
              </div>
            </div>

            {/* Separator */}
            <div className={`mx-2 h-px ${dividerColor}`} />

            {/* Colors Row - 7 presets + 1 custom picker */}
            <div className="p-2">
              <div className="flex justify-between">
                {ICON_COLORS.map((color) => (
                  <motion.button
                    key={color.name}
                    type="button"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      currentColor === color.value
                        ? `ring-2 ring-offset-1 ring-blue-400 ${isDark ? 'ring-offset-gray-800' : 'ring-offset-white'}`
                        : ''
                    }`}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleColorSelect(color.value)}
                    title={color.name}
                  >
                    {currentIcon ? (
                      <i className={`${currentIcon} text-xs`} style={{ color: color.value }} />
                    ) : (
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color.value }} />
                    )}
                  </motion.button>
                ))}

                {/* Custom Color Picker */}
                <motion.button
                  type="button"
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all relative overflow-hidden ${
                    isCustomColor
                      ? `ring-2 ring-offset-1 ring-blue-400 ${isDark ? 'ring-offset-gray-800' : 'ring-offset-white'}`
                      : ''
                  }`}
                  style={{
                    background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                  }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => colorInputRef.current?.click()}
                  title="自定义颜色"
                >
                  {currentIcon && isCustomColor && (
                    <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'bg-gray-800/80' : 'bg-white/80'}`}>
                      <i className={`${currentIcon} text-xs`} style={{ color: currentColor }} />
                    </div>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={colorInputRef} type="color" value={currentColor} className="hidden" onChange={handleCustomColor} />
    </div>
  );
});
