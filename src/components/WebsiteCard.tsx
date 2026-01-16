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
  const { autoSortEnabled, searchInNewTab } = useTransparency();
  const { faviconUrl, isLoading, error } = useLazyFavicon(url, favicon, cardRef);
  const { isMobile, getCardClasses } = useResponsiveLayout();
  const cardBorderRadius = isMobile ? 12 : 16;

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
      {/* 外层 motion.div 处理拖拽动画 */}
      <motion.div
        data-website-card="true"
        className={`${getCardClasses()} relative`}
        style={{
          aspectRatio: '1 / 1',
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
          filter: 'brightness(0.85)',
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
        {/* 内层 Tilt 组件实现3D效果 */}
        <Tilt
          tiltEnable={!isMobile && !isDragging && !autoSortEnabled}
          tiltReverse={true}
          tiltMaxAngleX={12}
          tiltMaxAngleY={12}
          perspective={800}
          transitionSpeed={400}
          scale={1.02}
          glareEnable={false}
          className="w-full h-full"
          style={{ borderRadius: `${cardBorderRadius / 16}rem` }}
        >
          {/* 图标层 - 充满整个卡片 */}
          <div
            className="absolute inset-0 overflow-hidden select-none"
            style={{
              borderRadius: `${cardBorderRadius / 16}rem`,
              background: icon
                ? (iconColor || 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)')
                : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              boxShadow: '0 0.25rem 1rem rgba(0,0,0,0.3)',
            }}
          >
            {icon ? (
              // FontAwesome 图标 - 充满卡片
              <div className="absolute inset-0 flex items-center justify-center">
                <i
                  className={icon}
                  style={{
                    fontSize: isMobile ? '1.5rem' : '2rem',
                    color: 'rgba(255, 255, 255, 0.95)',
                    filter: 'drop-shadow(0 0.125rem 0.25rem rgba(0, 0, 0, 0.3))',
                  }}
                />
              </div>
            ) : showErrorPlaceholder ? (
              // 错误占位 - 显示地球图标
              <div className="absolute inset-0 flex items-center justify-center">
                <i
                  className="fa-solid fa-globe"
                  style={{
                    fontSize: isMobile ? '1.25rem' : '1.5rem',
                    color: 'rgba(255, 255, 255, 0.5)',
                  }}
                />
              </div>
            ) : (
              // Favicon - 充满整个卡片
              <img
                src={faviconUrl}
                alt={`${name} favicon`}
                className="absolute inset-0 w-full h-full select-none"
                loading="lazy"
                draggable="false"
                onError={() => setImgError(true)}
                style={{
                  objectFit: 'cover',
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

          {/* 底部信息叠加层 - 占卡片下半部分 */}
          <div
            className="absolute left-0 right-0 bottom-0 pointer-events-none select-none"
            style={{ height: '60%' }}
          >
            {/* 渐变遮罩 - 更深的黑色底部 */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.6) 40%, rgba(0, 0, 0, 0.95) 100%)',
                borderRadius: `0 0 ${cardBorderRadius / 16}rem ${cardBorderRadius / 16}rem`,
              }}
            />

            {/* 信息内容 - 定位在底部 */}
            <div
              className="absolute bottom-0 left-0 right-0 flex flex-col items-center"
              style={{
                padding: isMobile ? '0.125rem' : '0.25rem',
              }}
            >
              {/* 网站名称 */}
              <h3
                className="font-medium text-white text-center select-none w-full"
                style={{
                  fontSize: isMobile ? '0.625rem' : '0.75rem',
                  lineHeight: '1.2',
                  marginBottom: '0.125rem',
                  textShadow: '0 0.0625rem 0.125rem rgba(0, 0, 0, 0.8)',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {name}
              </h3>

              {/* 标签和访问次数 - 桌面端 */}
              {!isMobile && (tags.length > 0 || visitCount > 0) && (
                <div
                  className="flex flex-wrap items-center justify-center select-none"
                  style={{ gap: '0.125rem' }}
                >
                  {tags.slice(0, 1).map((tag) => (
                    <span
                      key={tag}
                      className="bg-white/20 text-white/90 truncate select-none"
                      style={{
                        padding: '0 0.1875rem',
                        borderRadius: '0.125rem',
                        fontSize: '0.5rem',
                        maxWidth: '2.5rem',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {visitCount > 0 && (
                    <span
                      className="bg-blue-500/30 text-blue-100 select-none"
                      style={{
                        padding: '0 0.1875rem',
                        borderRadius: '0.125rem',
                        fontSize: '0.5rem',
                      }}
                    >
                      <i className="fa-solid fa-eye select-none" style={{ marginRight: '0.0625rem' }}></i>
                      <span className="select-none">{visitCount}</span>
                    </span>
                  )}
                </div>
              )}

              {/* 移动端简化显示 */}
              {isMobile && visitCount > 0 && (
                <div
                  className="flex items-center justify-center text-white/90 select-none"
                  style={{ gap: '0.0625rem', fontSize: '0.3125rem' }}
                >
                  <i className="fa-solid fa-eye select-none"></i>
                  <span className="select-none">{visitCount}</span>
                </div>
              )}
            </div>
          </div>

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
