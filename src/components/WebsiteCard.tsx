import { motion } from 'framer-motion';
import { useState, useRef, useEffect, memo, useCallback, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import Tilt from 'react-parallax-tilt';
import { DockEditModal } from './Dock';
import type { DockItem } from './Dock';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { useTransparency } from '@/contexts/TransparencyContext';
import { useLazyFavicon } from '@/hooks/useLazyFavicon';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { userStatsManager } from '@/hooks/useUserStats';

interface WebsiteCardData {
  id: string;
  name: string;
  url: string;
  favicon: string;
  tags: string[];
  note?: string;
  icon?: string;        // Built-in icon (FontAwesome class)
  iconColor?: string;   // Icon color
  visitCount?: number;
  lastVisit?: string;
}

interface WebsiteCardProps {
  id: string;
  name: string;
  url: string;
  favicon: string;
  tags: string[];
  visitCount: number;
  note?: string;
  icon?: string;
  iconColor?: string;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  onSave: (data: WebsiteCardData) => void;
  onDelete?: (id: string) => void;
  onCardSave?: () => void; // 可选的保存回调，用于触发同步
  onAddCard?: () => void; // 新增卡片回调
}

function isIpAddress(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname.includes(':')) return true; // IPv6
  // IPv4
  return /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(hostname);
}

export const WebsiteCard = memo(function WebsiteCardComponent({
  id,
  name,
  url,
  favicon,
  tags,
  visitCount,
  note,
  icon,
  iconColor,
  index,
  moveCard,
  onSave,
  onDelete,
  onCardSave,
  onAddCard,
}: WebsiteCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [, setClickAnimation] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const {
    autoSortEnabled,
    searchInNewTab,
    searchBarColor,
    searchBarOpacity,
    cardBlurEnabled,
    cardNameEnabled,
    cardTagsEnabled,
    cardVisitCountEnabled,
    cardSize,
  } = useTransparency();
  const { faviconUrl, isLoading, error } = useLazyFavicon(url, favicon, cardRef);
  const { isMobile, deviceType, getCardClasses } = useResponsiveLayout();
  const cardBorderRadius = isMobile ? 12 : 16;

  // 计算动态卡片宽度（基于cardSize百分比），根据设备类型使用正确的基准宽度
  const baseCardWidth = useMemo(() => {
    if (deviceType === 'mobile') return 64; // 4rem = 64px
    if (deviceType === 'tablet') return 80; // 5rem = 80px
    return 88; // desktop/wide: 5.5rem = 88px
  }, [deviceType]);

  const scaledCardWidth = Math.max(40, Math.min(120, (baseCardWidth * cardSize) / 100));

  // 判断是否显示错误占位
  const showErrorPlaceholder = !icon && (error || imgError || !faviconUrl);

  const subtitleText = useMemo(() => {
    if (note) return note;
    try {
      const hostname = new URL(url).hostname;
      return isIpAddress(hostname) ? '' : hostname;
    } catch {
      return '';
    }
  }, [note, url]);

  const [{ isDragging }, drag] = useDrag({
    type: 'WEBSITE_CARD',
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => !isMobile && !autoSortEnabled, // 移动端或启用自动排序时禁用拖拽
  });

  const [, drop] = useDrop({
    accept: 'WEBSITE_CARD',
    hover(item: { id: string; index: number }, monitor) {
      if (!cardRef.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      // 如果是同一个位置，不处理
      if (dragIndex === hoverIndex) return;

      // 获取卡片的边界矩形
      const hoverBoundingRect = cardRef.current.getBoundingClientRect();

      // 获取卡片中心点
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;

      // 获取鼠标位置
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      // 计算鼠标在hover卡片中的位置
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;

      // 判断是水平还是垂直移动（根据网格布局）
      // 获取每行的卡片数量（可以通过容器宽度和卡片宽度计算）
      const cardsPerRow = Math.floor(window.innerWidth / 150); // 假设每个卡片约150px宽

      const dragRow = Math.floor(dragIndex / cardsPerRow);
      const hoverRow = Math.floor(hoverIndex / cardsPerRow);
      const isSameRow = dragRow === hoverRow;

      if (isSameRow) {
        // 同一行，检查水平位置
        if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) {
          return; // 向右拖，但还没超过中点
        }
        if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
          return; // 向左拖，但还没超过中点
        }
      } else {
        // 不同行，检查垂直位置
        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY * 0.3) {
          return; // 向下拖，但只进入了30%
        }
        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY * 1.7) {
          return; // 向上拖，但只进入了30%
        }
      }

      // 执行交换
      moveCard(dragIndex, hoverIndex);

      // 更新item的index，这很重要！
      item.index = hoverIndex;
    },
  });

  drop(cardRef);
  drag(cardRef);

  // 清理定时器
  const cleanupTimers = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      cleanupTimers();
    };
  }, []);

  // 处理卡片点击动画
  const handleCardClick = useCallback(() => {
    if (isMobile) {
      setClickAnimation(true);
      setTimeout(() => setClickAnimation(false), 200);
    }

    // 根据设置决定打开方式
    if (searchInNewTab) {
      // 在新标签页中打开
      window.open(url, '_blank');
    } else {
      // 在当前页面直接跳转
      window.location.href = url;
    }

    // 记录用户统计（总访问次数）
    userStatsManager.recordSiteVisit();

    // 更新卡片访问次数
    onSave({
      id,
      name,
      url,
      favicon,
      tags,
      note,
      visitCount: visitCount + 1,
      lastVisit: new Date().toISOString().split('T')[0],
    });
  }, [isMobile, searchInNewTab, url, id, name, favicon, tags, note, visitCount, onSave]);

  // 移动端长按菜单
  const handleLongPress = () => {
    if (isMobile) {
      setShowEditModal(true);
    }
  };

  const startLongPress = () => {
    if (isMobile) {
      longPressTimer.current = setTimeout(handleLongPress, 500);
    }
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // 右键菜单处理
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // 右键菜单项
  const contextMenuItems: ContextMenuItem[] = [
    {
      icon: 'fa-solid fa-pen-to-square',
      label: '编辑卡片',
      onClick: () => {
        setShowEditModal(true);
      },
    },
    ...(onAddCard ? [{
      icon: 'fa-solid fa-plus',
      label: '新增卡片',
      onClick: () => {
        onAddCard();
      },
    }] : []),
    ...(onDelete ? [{
      icon: 'fa-solid fa-trash',
      label: '删除卡片',
      onClick: () => {
        onDelete(id);
      },
      danger: true,
    }] : []),
  ];

  return (
    <>
      {/* 外层容器 - 包含卡片和下方名称 */}
      <motion.div
        data-website-card="true"
        className={`${getCardClasses()} relative flex flex-col items-center`}
        style={{
          aspectRatio: 'auto',
          width: `${scaledCardWidth}px`,
        }}
        animate={{
          opacity: isDragging ? 0.5 : 1,
          zIndex: isDragging ? 50 : 0,
          rotate: isDragging ? 5 : 0,
          scale: isDragging ? 1.05 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
          duration: 0.2,
        }}
        onTouchStart={startLongPress}
        onTouchEnd={clearLongPress}
        onTouchMove={clearLongPress}
        onTouchCancel={clearLongPress}
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
        whileTap={{
          scale: 0.95,
          transition: { duration: 0.1, ease: 'easeInOut' },
        }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
            ease: 'easeOut',
            delay: 0.05,
          },
        }}
        viewport={{ once: true }}
        ref={cardRef}
      >
        {/* 内层 Tilt 组件实现3D效果 - 正方形卡片 */}
        <Tilt
          tiltEnable={!isMobile && !isDragging && !autoSortEnabled}
          tiltReverse={true}
          tiltMaxAngleX={12}
          tiltMaxAngleY={12}
          perspective={800}
          transitionSpeed={400}
          scale={1.05}
          glareEnable={false}
          className="w-full"
          style={{
            borderRadius: `${cardBorderRadius / 16}rem`,
            aspectRatio: '1 / 1',
          }}
        >
          {/* 图标层 - 充满整个卡片或仅显示图标 */}
          {cardBlurEnabled ? (
            // 有背景模式：显示完整的卡片背景
            <div
              className="absolute inset-0 overflow-hidden select-none backdrop-blur-2xl border border-white/30"
              style={{
                borderRadius: `${cardBorderRadius / 16}rem`,
                background: icon
                  ? (iconColor || 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)')
                  : `rgba(${searchBarColor}, ${searchBarOpacity})`,
                boxShadow: '0 0.25rem 1rem rgba(0,0,0,0.3)',
              }}
            >
              {icon ? (
                // FontAwesome 图标 - 缩小尺寸，靠上显示
                <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: '35%' }}>
                  <i
                    className={icon}
                    style={{
                      fontSize: isMobile ? '1.5rem' : '1.875rem',
                      color: 'rgba(255, 255, 255, 0.95)',
                      filter: 'drop-shadow(0 0.125rem 0.25rem rgba(0, 0, 0, 0.3))',
                    }}
                  />
                </div>
              ) : showErrorPlaceholder ? (
                // 错误占位 - 显示地球图标，靠上显示
                <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: '35%' }}>
                  <i
                    className="fa-solid fa-globe"
                    style={{
                      fontSize: isMobile ? '1.25rem' : '1.5rem',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}
                  />
                </div>
              ) : (
                // Favicon - 缩小并靠上显示
                <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: '35%', paddingTop: '1rem' }}>
                  <img
                    src={faviconUrl}
                    alt={`${name} favicon`}
                    className="select-none"
                    loading="lazy"
                    draggable="false"
                    onError={() => setImgError(true)}
                    style={{
                      width: isMobile ? '2.5rem' : '3rem',
                      height: isMobile ? '2.5rem' : '3rem',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              )}

              {/* 加载状态指示器 */}
              {!icon && isLoading && !showErrorPlaceholder && (
                <div
                  className="absolute bg-yellow-400 rounded-full animate-pulse"
                  style={{
                    top: '0.25rem',
                    right: '0.25rem',
                    width: '0.375rem',
                    height: '0.375rem',
                  }}
                  title="加载中..."
                />
              )}
            </div>
          ) : (
            // 无背景模式：仅显示放大的图标，居中显示
            <div className="absolute inset-0 flex items-center justify-center select-none">
              {icon ? (
                // FontAwesome 图标 - 放大显示
                <i
                  className={icon}
                  style={{
                    fontSize: isMobile ? '2.5rem' : '3.5rem',
                    color: 'rgba(255, 255, 255, 0.95)',
                    filter: 'drop-shadow(0 0.25rem 0.5rem rgba(0, 0, 0, 0.5))',
                  }}
                />
              ) : showErrorPlaceholder ? (
                // 错误占位 - 显示地球图标
                <i
                  className="fa-solid fa-globe"
                  style={{
                    fontSize: isMobile ? '2rem' : '3rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    filter: 'drop-shadow(0 0.25rem 0.5rem rgba(0, 0, 0, 0.5))',
                  }}
                />
              ) : (
                // Favicon - 放大显示
                <img
                  src={faviconUrl}
                  alt={`${name} favicon`}
                  className="select-none"
                  loading="lazy"
                  draggable="false"
                  onError={() => setImgError(true)}
                  style={{
                    width: isMobile ? '3.5rem' : '4.5rem',
                    height: isMobile ? '3.5rem' : '4.5rem',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 0.25rem 0.5rem rgba(0, 0, 0, 0.5))',
                  }}
                />
              )}

              {/* 加载状态指示器 */}
              {!icon && isLoading && !showErrorPlaceholder && (
                <div
                  className="absolute bg-yellow-400 rounded-full animate-pulse"
                  style={{
                    top: '0.25rem',
                    right: '0.25rem',
                    width: '0.375rem',
                    height: '0.375rem',
                  }}
                  title="加载中..."
                />
              )}
            </div>
          )}

          {/* 底部毛玻璃层 - 只显示标签和访问次数 */}
          {(cardBlurEnabled || (cardTagsEnabled && tags.length > 0) || (cardVisitCountEnabled && visitCount > 0)) && (
            <div
              className="absolute left-0 right-0 bottom-0 pointer-events-none select-none"
              style={{
                height: '35%',
                willChange: 'transform',
                transform: 'translateZ(0)',
              }}
            >
              {/* 毛玻璃遮罩 - 根据配置显示/隐藏 */}
              {cardBlurEnabled && (
                <div
                  className="absolute inset-0 backdrop-blur-md"
                  style={{
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.3) 100%)',
                    borderRadius: `0 0 ${cardBorderRadius / 16}rem ${cardBorderRadius / 16}rem`,
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 30%)',
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%)',
                    willChange: 'transform, opacity',
                    transform: 'translateZ(0)',
                  }}
                />
              )}

              {/* 标签和访问次数 */}
              {((cardTagsEnabled && tags.length > 0) || (cardVisitCountEnabled && visitCount > 0)) && (
                <div
                  className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center justify-center select-none"
                  style={{
                    padding: isMobile ? '0.125rem' : '0.1875rem',
                    gap: '0.125rem',
                  }}
                >
                  {cardTagsEnabled && tags.slice(0, 1).map((tag) => (
                    <span
                      key={tag}
                      className="bg-black/20 text-white truncate select-none"
                      style={{
                        padding: '0.0625rem 0.25rem',
                        borderRadius: '0.1875rem',
                        fontSize: isMobile ? '0.5rem' : '0.625rem',
                        maxWidth: '3rem',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {cardVisitCountEnabled && visitCount > 0 && (
                    <span
                      className="bg-blue-500/40 text-white select-none"
                      style={{
                        padding: '0.0625rem 0.25rem',
                        borderRadius: '0.1875rem',
                        fontSize: isMobile ? '0.5rem' : '0.625rem',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      <i className="fa-solid fa-eye select-none" style={{ marginRight: '0.0625rem' }}></i>
                      <span className="select-none">{visitCount}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 拖拽时的占位提示 */}
          {isDragging && (
            <motion.div
              className="absolute inset-0 border-2 border-dashed border-white/50 bg-white/10 pointer-events-none flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ borderRadius: `${cardBorderRadius / 16}rem` }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}
              >
                <i className="fa-solid fa-arrows-up-down-left-right"></i>
              </motion.div>
            </motion.div>
          )}
        </Tilt>

        {/* 卡片名称 - 在卡片下方，根据配置显示/隐藏 */}
        {cardNameEnabled && (
          <h3
            className="text-white text-center select-none w-full"
            style={{
              fontSize: isMobile ? '0.75rem' : '0.8rem',
              lineHeight: '1.3',
              marginTop: '0.375rem',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.9), 0 0 6px rgba(0, 0, 0, 0.5)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {name}
          </h3>
        )}
      </motion.div>

      {showEditModal && (
        <DockEditModal
          item={{ id, name, url, favicon, tags, note, icon, iconColor, location: 'home' }}
          onClose={() => setShowEditModal(false)}
          onSave={(item: DockItem) => {
            onSave({
              id: item.id,
              name: item.name,
              url: item.url,
              favicon: item.favicon,
              tags: item.tags || [],
              note: item.note,
              icon: item.icon,
              iconColor: item.iconColor,
            });
            setShowEditModal(false);
            // 保存后触发同步
            onCardSave?.();
          }}
        />
      )}

      {/* 右键菜单 */}
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
