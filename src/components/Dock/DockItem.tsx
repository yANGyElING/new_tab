import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DockItem as DockItemType } from './types';
import { useFavicon } from '@/hooks/useFavicon';
import { useTransparency } from '@/contexts/TransparencyContext';
import { ContextMenu, ContextMenuItem } from '@/components/ContextMenu';

interface DockItemProps {
  item: DockItemType;
  index: number;
  onEdit: (item: DockItemType) => void;
  onDelete: (id: string) => void;
  isMobile: boolean;
  showLabel?: boolean;
  isDark?: boolean;
}

export const DockItemComponent = memo(function DockItemComponent({
  item,
  index,
  onEdit,
  onDelete,
  isMobile,
  showLabel = false,
  isDark = false,
}: DockItemProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const { searchInNewTab } = useTransparency();

  // Use favicon hook for auto-fetching icons (not lazy since dock is always visible)
  const { faviconUrl, isLoading } = useFavicon(item.url, item.favicon);

  const handleClick = useCallback(() => {
    if (searchInNewTab) {
      window.open(item.url, '_blank');
    } else {
      window.location.href = item.url;
    }
  }, [item.url, searchInNewTab]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const contextMenuItems: ContextMenuItem[] = [
    {
      icon: 'fa-solid fa-pen-to-square',
      label: '编辑',
      onClick: () => onEdit(item),
    },
    {
      icon: 'fa-solid fa-trash',
      label: '删除',
      onClick: () => {
        if (confirm('确定要删除这个图标吗？')) {
          onDelete(item.id);
        }
      },
    },
  ];

  // Render icon: built-in icon or favicon
  // When showLabel is true, use smaller icon sizes
  const iconSizeClass = showLabel
    ? isMobile ? 'w-7 h-7' : 'w-8 h-8'
    : isMobile ? 'w-9 h-9' : 'w-10 h-10';
  const innerIconSizeClass = showLabel
    ? isMobile ? 'w-4 h-4' : 'w-5 h-5'
    : isMobile ? 'w-6 h-6' : 'w-7 h-7';
  const iconFontSize = showLabel
    ? isMobile ? 'text-sm' : 'text-base'
    : isMobile ? 'text-lg' : 'text-xl';

  // Theme-based styles
  const iconBgColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.15)';
  const spinnerColor = isDark ? 'text-white/50' : 'text-white/60';

  const renderIcon = () => {
    if (item.icon) {
      // Built-in icon with custom color
      return (
        <div
          className={`${iconSizeClass} rounded-[10px] flex items-center justify-center`}
          style={{
            backgroundColor: iconBgColor,
          }}
        >
          <i
            className={`${item.icon} ${iconFontSize}`}
            style={{ color: item.iconColor || '#FFFFFF' }}
          />
        </div>
      );
    }

    // Favicon
    return (
      <div
        className={`${iconSizeClass} rounded-[10px] overflow-hidden flex items-center justify-center`}
        style={{
          backgroundColor: iconBgColor,
        }}
      >
        {isLoading ? (
          <i className={`fa-solid fa-spinner fa-spin ${spinnerColor} text-sm`} />
        ) : (
          <img
            src={faviconUrl}
            alt={item.name}
            className={`${innerIconSizeClass} object-contain`}
            loading="lazy"
            draggable="false"
            onError={(e) => {
              // Fallback to globe icon
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerHTML =
                `<i class="fa-solid fa-globe ${spinnerColor} text-lg"></i>`;
            }}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <motion.div
        className="flex flex-col items-center cursor-pointer select-none relative group"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25,
          delay: index * 0.03,
        }}
        whileHover={{ scale: 1.15, y: -8 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        title={showLabel ? undefined : item.name}
      >
        {renderIcon()}
        {showLabel ? (
          // Show label below icon
          <span
            className={`mt-1 text-white/90 truncate max-w-[48px] text-center leading-tight ${
              isMobile ? 'text-[9px]' : 'text-[10px]'
            }`}
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            {item.name}
          </span>
        ) : (
          // Tooltip on hover
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900/90 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ textShadow: 'none' }}
          >
            {item.name}
          </div>
        )}
      </motion.div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
});
