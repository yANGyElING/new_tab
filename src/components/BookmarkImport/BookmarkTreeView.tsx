import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookmarkNode, countBookmarks, countSelected } from '@/lib/bookmarkParser';

interface BookmarkTreeViewProps {
  bookmarks: BookmarkNode[];
  onNext: () => void;
  onBack: () => void;
}

export function BookmarkTreeView({ bookmarks, onNext, onBack }: BookmarkTreeViewProps) {
  const totalBookmarks = countBookmarks(bookmarks);
  const selectedDocks = countSelected(bookmarks, 'dock');
  const selectedCards = countSelected(bookmarks, 'card');

  return (
    <div className="flex flex-col h-full">
      {/* 标题和统计 */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          选择要导入的书签
        </h2>
        <div className="flex gap-4 text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            共 <span className="font-semibold text-gray-800 dark:text-gray-200">{totalBookmarks}</span> 个书签
          </span>
          <span className="text-blue-600 dark:text-blue-400">
            已选 <span className="font-semibold">{selectedDocks}</span> 个Dock
          </span>
          <span className="text-purple-600 dark:text-purple-400">
            已选 <span className="font-semibold">{selectedCards}</span> 个卡片
          </span>
        </div>
      </div>

      {/* 树形列表 */}
      <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50">
        {bookmarks.map((node) => (
          node.type === 'folder' ? (
            <BookmarkFolderItem key={node.id} node={node} />
          ) : (
            <BookmarkItem key={node.id} node={node} />
          )
        ))}
      </div>

      {/* 底部操作栏 */}
      <div className="flex justify-between mt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <i className="fa-solid fa-arrow-left mr-2" />
          返回
        </button>
        <button
          onClick={onNext}
          disabled={selectedDocks === 0 && selectedCards === 0}
          className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一步
          <i className="fa-solid fa-arrow-right ml-2" />
        </button>
      </div>
    </div>
  );
}

function BookmarkFolderItem({ node }: { node: BookmarkNode }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-2">
      {/* 文件夹头部 */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
      >
        <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-gray-400 text-xs`} />
        <i className="fa-solid fa-folder text-yellow-500" />
        <span className="font-medium text-gray-700 dark:text-gray-200">{node.title}</span>
        <span className="text-xs text-gray-400">({node.children?.length || 0})</span>
      </div>

      {/* 子项 */}
      <AnimatePresence>
        {isExpanded && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-6 overflow-hidden"
          >
            {node.children.map((child) => (
              child.type === 'folder' ? (
                <BookmarkFolderItem key={child.id} node={child} />
              ) : (
                <BookmarkItem key={child.id} node={child} />
              )
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BookmarkItem({ node }: { node: BookmarkNode }) {
  const [selected, setSelected] = useState<'dock' | 'card' | null>(node.selected || null);

  const handleSelect = (type: 'dock' | 'card') => {
    const newValue = selected === type ? null : type;
    setSelected(newValue);
    node.selected = newValue;
  };

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mb-1">
      {/* 书签信息 */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <i className="fa-solid fa-bookmark text-blue-500 text-sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
            {node.title}
          </p>
          <p className="text-xs text-gray-400 truncate">{node.url}</p>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => handleSelect('dock')}
          className={`
            px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5
            ${selected === 'dock'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
            }
          `}
        >
          <i className="fa-solid fa-grip-horizontal" />
          Dock
        </button>
        <button
          onClick={() => handleSelect('card')}
          className={`
            px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5
            ${selected === 'card'
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
            }
          `}
        >
          <i className="fa-solid fa-square" />
          卡片
        </button>
      </div>
    </div>
  );
}
