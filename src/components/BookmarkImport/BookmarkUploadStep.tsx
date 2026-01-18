import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface BookmarkUploadStepProps {
  onUpload: (file: File) => void;
}

export function BookmarkUploadStep({ onUpload }: BookmarkUploadStepProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type === 'text/html' || file.name.endsWith('.html')) {
      onUpload(file);
    } else {
      alert('请上传HTML格式的书签文件');
    }
  };

  const openBookmarkManager = async () => {
    // 检测浏览器类型
    const userAgent = navigator.userAgent.toLowerCase();
    let bookmarkUrl = 'chrome://bookmarks/';
    let shortcutKey = 'Ctrl+Shift+O';

    if (userAgent.includes('edg')) {
      bookmarkUrl = 'edge://favorites/';
      shortcutKey = 'Ctrl+Shift+O';
    } else if (userAgent.includes('firefox')) {
      bookmarkUrl = 'about:bookmarks';
      shortcutKey = 'Ctrl+Shift+B';
    }

    // 尝试复制地址到剪贴板
    try {
      await navigator.clipboard.writeText(bookmarkUrl);
      alert(`由于浏览器安全限制，无法自动打开书签管理器。\n\n已将地址复制到剪贴板：\n${bookmarkUrl}\n\n请在地址栏粘贴（Ctrl+V）并回车\n或直接按快捷键：${shortcutKey}`);
    } catch (err) {
      // 复制失败，只显示提示
      alert(`由于浏览器安全限制，无法自动打开书签管理器。\n\n请在地址栏输入：\n${bookmarkUrl}\n\n或直接按快捷键：${shortcutKey}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          导入浏览器收藏夹
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          将您的浏览器书签转换为Dock图标或网站卡片
        </p>
      </div>

      {/* 导出引导 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <i className="fa-solid fa-info-circle text-blue-500 text-xl mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
              第一步：导出浏览器书签
            </h3>
            <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-decimal list-inside">
              <li>点击下方按钮打开浏览器书签管理器</li>
              <li>点击右上角的"⋮"菜单，选择"导出书签"</li>
              <li>保存HTML文件到本地</li>
            </ol>
            <button
              onClick={openBookmarkManager}
              className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <i className="fa-solid fa-external-link-alt" />
              打开书签管理器
            </button>
          </div>
        </div>
      </div>

      {/* 上传区域 */}
      <div>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">
          第二步：上传书签文件
        </h3>
        <motion.div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
            ${isDragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
            }
          `}
          onClick={() => fileInputRef.current?.click()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <i className="fa-solid fa-cloud-arrow-up text-5xl text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
            {isDragOver ? '松开鼠标上传文件' : '拖拽文件到这里或点击选择'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            支持HTML格式的书签文件
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,text/html"
            onChange={handleFileSelect}
            className="hidden"
          />
        </motion.div>
      </div>
    </div>
  );
}
