import { BookmarkNode, extractSelected } from '@/lib/bookmarkParser';

interface BookmarkPreviewProps {
  bookmarks: BookmarkNode[];
  onConfirm: () => void;
  onBack: () => void;
  onRemove: (id: string, type: 'dock' | 'card') => void;
}

export function BookmarkPreview({ bookmarks, onConfirm, onBack, onRemove }: BookmarkPreviewProps) {
  const selectedDocks = extractSelected(bookmarks, 'dock');
  const selectedCards = extractSelected(bookmarks, 'card');

  return (
    <div className="flex flex-col h-full">
      {/* 标题和统计 */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          预览即将添加的内容
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          将添加 <span className="font-semibold text-blue-600">{selectedDocks.length}</span> 个Dock图标 和 <span className="font-semibold text-purple-600">{selectedCards.length}</span> 个卡片
        </p>
      </div>

      {/* 预览内容 */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Dock预览区 */}
        {selectedDocks.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
              <i className="fa-solid fa-grip-horizontal text-blue-500" />
              Dock图标 ({selectedDocks.length})
            </h3>
            <div className="space-y-2">
              {selectedDocks.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <i className="fa-solid fa-link text-blue-500 text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{item.url}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(item.id, 'dock')}
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <i className="fa-solid fa-times text-sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 卡片预览区 */}
        {selectedCards.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
              <i className="fa-solid fa-square text-purple-500" />
              网站卡片 ({selectedCards.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {selectedCards.map((item) => (
                <div
                  key={item.id}
                  className="relative bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 group"
                >
                  <button
                    onClick={() => onRemove(item.id, 'card')}
                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 bg-white dark:bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <i className="fa-solid fa-times text-xs" />
                  </button>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-2">
                      <i className="fa-solid fa-globe text-purple-500" />
                    </div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate w-full">
                      {item.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {selectedDocks.length === 0 && selectedCards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <i className="fa-solid fa-inbox text-5xl mb-4" />
            <p className="text-lg">还没有选择任何书签</p>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="flex justify-between mt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <i className="fa-solid fa-arrow-left mr-2" />
          返回修改
        </button>
        <button
          onClick={onConfirm}
          disabled={selectedDocks.length === 0 && selectedCards.length === 0}
          className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <i className="fa-solid fa-check" />
          确认添加
        </button>
      </div>
    </div>
  );
}
