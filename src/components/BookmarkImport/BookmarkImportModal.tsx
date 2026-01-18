import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookmarkNode, BookmarkHTMLParser, extractSelected } from '@/lib/bookmarkParser';
import { BookmarkUploadStep } from './BookmarkUploadStep';
import { BookmarkTreeView } from './BookmarkTreeView';
import { BookmarkPreview } from './BookmarkPreview';
import { BookmarkImportResult } from './BookmarkImportResult';
import { DockItem } from '@/components/Dock';
import { WebsiteData } from '@/lib/supabaseSync';

interface BookmarkImportModalProps {
  onClose: () => void;
  dockItems: DockItem[];
  setDockItems: (items: DockItem[]) => void;
  websites: WebsiteData[];
  setWebsites: (websites: WebsiteData[]) => void;
}

interface ImportResult {
  dockAdded: number;
  cardsAdded: number;
  skipped: number;
  dockItems: DockItem[];
  cardItems: WebsiteData[];
  skippedItems: { title: string; reason: string }[];
}

type Step = 'upload' | 'select' | 'preview' | 'result';

export function BookmarkImportModal({
  onClose,
  dockItems,
  setDockItems,
  websites,
  setWebsites,
}: BookmarkImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [bookmarks, setBookmarks] = useState<BookmarkNode[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileUpload = async (file: File) => {
    try {
      const content = await file.text();
      const parser = new BookmarkHTMLParser();
      const parsed = parser.parse(content);
      setBookmarks(parsed);
      setStep('select');
    } catch (error) {
      alert('解析书签文件失败，请确保文件格式正确');
      console.error(error);
    }
  };

  const handleConfirmSelection = () => {
    setStep('preview');
  };

  const handleRemove = (id: string, type: 'dock' | 'card') => {
    const removeSelection = (nodes: BookmarkNode[]) => {
      for (const node of nodes) {
        if (node.id === id) {
          node.selected = null;
        }
        if (node.children) {
          removeSelection(node.children);
        }
      }
    };
    removeSelection(bookmarks);
    setBookmarks([...bookmarks]);
  };

  const handleConfirmImport = () => {
    const selectedDocks = extractSelected(bookmarks, 'dock');
    const selectedCards = extractSelected(bookmarks, 'card');

    const dockToAdd: DockItem[] = [];
    const cardsToAdd: WebsiteData[] = [];
    const skipped: { title: string; reason: string }[] = [];

    // 转换Dock书签
    for (const bookmark of selectedDocks) {
      const exists = dockItems.some((item) => item.url === bookmark.url);
      if (exists) {
        skipped.push({ title: bookmark.title, reason: 'Dock中已存在' });
        continue;
      }

      dockToAdd.push({
        id: `dock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: bookmark.title,
        url: bookmark.url!,
        icon: '',
        type: 'link',
      });
    }

    // 转换卡片书签
    for (const bookmark of selectedCards) {
      const exists = websites.some((card) => card.url === bookmark.url);
      if (exists) {
        skipped.push({ title: bookmark.title, reason: '卡片中已存在' });
        continue;
      }

      cardsToAdd.push({
        id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: bookmark.title,
        url: bookmark.url!,
        favicon: '',
        tags: [],
        visitCount: 0,
      });
    }

    // 添加到系统
    setDockItems([...dockItems, ...dockToAdd]);
    setWebsites([...websites, ...cardsToAdd]);

    // 设置结果
    const result: ImportResult = {
      dockAdded: dockToAdd.length,
      cardsAdded: cardsToAdd.length,
      skipped: skipped.length,
      dockItems: dockToAdd,
      cardItems: cardsToAdd,
      skippedItems: skipped,
    };

    setImportResult(result);
    setStep('result');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors z-10"
        >
          <i className="fa-solid fa-times" />
        </button>

        {/* 内容区域 */}
        <div className="p-8 overflow-y-auto max-h-[90vh]">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <BookmarkUploadStep onUpload={handleFileUpload} />
              </motion.div>
            )}

            {step === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-[70vh]"
              >
                <BookmarkTreeView
                  bookmarks={bookmarks}
                  onNext={handleConfirmSelection}
                  onBack={() => setStep('upload')}
                />
              </motion.div>
            )}

            {step === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-[70vh]"
              >
                <BookmarkPreview
                  bookmarks={bookmarks}
                  onConfirm={handleConfirmImport}
                  onBack={() => setStep('select')}
                  onRemove={handleRemove}
                />
              </motion.div>
            )}

            {step === 'result' && importResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <BookmarkImportResult result={importResult} onClose={onClose} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
