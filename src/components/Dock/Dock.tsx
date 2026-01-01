import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DockItem as DockItemType } from './types';
import { DockItemComponent } from './DockItem';
import { DockEditModal } from './DockEditModal';
import { useDockData } from '@/hooks/useDockData';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useTransparency } from '@/contexts/TransparencyContext';

interface DockProps {
  isVisible: boolean;
}

export const Dock = memo(function Dock({ isVisible }: DockProps) {
  const { isMobile } = useResponsiveLayout();
  const { darkMode } = useTransparency();

  // Dock data with local storage and cloud sync
  const { dockItems, setDockItems, showLabels } = useDockData();

  // Edit modal state
  const [editingItem, setEditingItem] = useState<DockItemType | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleEdit = useCallback((item: DockItemType) => {
    setEditingItem(item);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setDockItems(dockItems.filter((item) => item.id !== id));
    },
    [dockItems, setDockItems]
  );

  const handleSave = useCallback(
    (item: DockItemType) => {
      if (editingItem) {
        // Update existing item
        setDockItems(
          dockItems.map((i) => (i.id === item.id ? item : i))
        );
      } else {
        // Add new item
        setDockItems([...dockItems, item]);
      }
      setEditingItem(null);
      setShowAddModal(false);
    },
    [dockItems, setDockItems, editingItem]
  );

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="fixed bottom-5 left-0 right-0 z-40 flex justify-center pointer-events-none"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
            }}
          >
            {/* Dock Container - iOS style glassmorphism with theme support */}
            <motion.div
              className={`
                flex items-center
                ${isMobile ? 'gap-1 px-2 py-1.5' : 'gap-1.5 px-3 py-2'}
                backdrop-blur-2xl
                ${darkMode ? 'border-white/15' : 'border-white/25'}
                border
                pointer-events-auto
                max-w-[calc(100vw-32px)]
                overflow-x-auto
                scrollbar-hide
              `}
              style={{
                borderRadius: isMobile ? '20px' : '24px',
                background: darkMode
                  ? 'rgba(30, 30, 30, 0.75)'
                  : 'rgba(255, 255, 255, 0.18)',
                boxShadow: darkMode
                  ? `
                    0 8px 32px rgba(0, 0, 0, 0.5),
                    inset 0 0.5px 0 rgba(255, 255, 255, 0.1)
                  `
                  : `
                    0 8px 32px rgba(0, 0, 0, 0.25),
                    inset 0 0.5px 0 rgba(255, 255, 255, 0.3)
                  `,
              }}
            >
              {/* Dock Items */}
              <AnimatePresence>
                {dockItems.map((item, index) => (
                  <DockItemComponent
                    key={item.id}
                    item={item}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isMobile={isMobile}
                    showLabel={showLabels}
                    isDark={darkMode}
                  />
                ))}
              </AnimatePresence>

              {/* Separator */}
              {dockItems.length > 0 && (
                <div
                  className={`${isMobile ? 'w-px h-7' : 'w-px h-8'} ${darkMode ? 'bg-white/10' : 'bg-white/20'} mx-0.5`}
                />
              )}

              {/* Add Button */}
              <motion.button
                className={`
                  ${isMobile ? 'w-9 h-9' : 'w-10 h-10'}
                  rounded-xl
                  flex items-center justify-center
                  transition-colors
                  cursor-pointer
                `}
                style={{
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.1)',
                }}
                whileHover={{
                  scale: 1.1,
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.2)',
                }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowAddModal(true)}
              >
                <i
                  className={`fa-solid fa-plus ${isMobile ? 'text-base' : 'text-lg'} ${darkMode ? 'text-white/60' : 'text-white/70'}`}
                />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      {(editingItem || showAddModal) && (
        <DockEditModal
          item={editingItem}
          onClose={() => {
            setEditingItem(null);
            setShowAddModal(false);
          }}
          onSave={handleSave}
        />
      )}
    </>
  );
});

export default Dock;
