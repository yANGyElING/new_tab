interface ImportResult {
  dockAdded: number;
  cardsAdded: number;
  skipped: number;
  skippedItems: { title: string; reason: string }[];
}

interface BookmarkImportResultProps {
  result: ImportResult;
  onClose: () => void;
}

export function BookmarkImportResult({ result, onClose }: BookmarkImportResultProps) {
  return (
    <div className="flex flex-col items-center text-center py-8">
      {/* 成功图标 */}
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
        <i className="fa-solid fa-circle-check text-green-500 text-5xl" />
      </div>

      {/* 标题 */}
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
        导入完成！
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        已成功将书签添加到您的主页
      </p>

      {/* 统计信息 */}
      <div className="flex gap-6 mb-6">
        {result.dockAdded > 0 && (
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-500 mb-1">
              +{result.dockAdded}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Dock图标</div>
          </div>
        )}
        {result.cardsAdded > 0 && (
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-500 mb-1">
              +{result.cardsAdded}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">网站卡片</div>
          </div>
        )}
        {result.skipped > 0 && (
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-400 mb-1">
              {result.skipped}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">已跳过</div>
          </div>
        )}
      </div>

      {/* 跳过的项目列表 */}
      {result.skippedItems.length > 0 && (
        <div className="w-full max-w-md mb-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
              <i className="fa-solid fa-info-circle text-yellow-500" />
              以下项目已跳过（已存在）
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {result.skippedItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 text-xs bg-white dark:bg-gray-800 rounded px-3 py-2"
                >
                  <span className="text-gray-700 dark:text-gray-200 truncate flex-1">
                    {item.title}
                  </span>
                  <span className="text-gray-400 text-xs flex-shrink-0">
                    {item.reason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 完成按钮 */}
      <button
        onClick={onClose}
        className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
      >
        <i className="fa-solid fa-check" />
        完成
      </button>
    </div>
  );
}
