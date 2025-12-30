// Optimized Wallpaper Service - Direct Unsplash Source Integration
// Uses Unsplash Source URL (no API key required) with local caching
import { indexedDBCache } from './indexedDBCache';
import { logger } from './logger';
import { errorHandler } from './errorHandler';
import { memoryManager } from './memoryManager';
import { createWallpaperRequest } from './requestManager';
import { createTimeoutSignal } from './abortUtils';
import { customWallpaperManager } from './customWallpaperManager';

// Unsplash wallpaper topics (nature landscapes)
const WALLPAPER_TOPICS = [
  'nature',
  'landscape',
  'mountains',
  'ocean',
  'forest',
  'sky',
  'sunset',
  'sunrise',
];

// Resolution configurations
const RESOLUTION_CONFIG: Record<string, { width: number; height: number }> = {
  '4k': { width: 3840, height: 2160 },
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1366, height: 768 },
  mobile: { width: 1080, height: 1920 },
};

class OptimizedWallpaperService {
  private static instance: OptimizedWallpaperService;
  private loadingPromises = new Map<
    string,
    Promise<{
      url: string;
      isFromCache: boolean;
      isToday: boolean;
      needsUpdate: boolean;
    }>
  >();
  private fallbackImage = '/icon/favicon.png';
  private cleanupTimer: number | null = null;

  static getInstance(): OptimizedWallpaperService {
    if (!OptimizedWallpaperService.instance) {
      OptimizedWallpaperService.instance = new OptimizedWallpaperService();
      // 启动定时清理
      OptimizedWallpaperService.instance.startCleanupTimer();
    }
    return OptimizedWallpaperService.instance;
  }

  // 启动定时清理和每日检查
  private startCleanupTimer(): void {
    if (this.cleanupTimer !== null) {
      return; // 已经启动了
    }

    logger.wallpaper.info('启动定时清理任务（每6小时）和每日检查');

    // 立即执行一次清理检查
    this.performDailyCheck().catch((error) => {
      logger.wallpaper.warn('初始每日检查失败', error);
    });

    this.cleanupTimer = setInterval(
      () => {
        // 执行清理和每日检查
        Promise.all([
          this.cleanupExpiredCache(),
          this.performDailyCheck()
        ]).catch((error) => {
          logger.wallpaper.error('定期清理和检查失败', error);
        });
      },
      6 * 60 * 60 * 1000
    ) as any; // 6小时

    // 页面关闭时清理定时器
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.stopCleanupTimer();
      });
    }
  }

  // 停止定时清理
  private stopCleanupTimer(): void {
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      logger.wallpaper.info('停止定时清理任务');
    }
  }

  // 获取本地日期字符串 (YYYY-MM-DD)
  private getLocalDateString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 获取今天的缓存键 - 基于本地时间
  private getTodayCacheKey(resolution: string): string {
    const today = this.getLocalDateString();
    return `wallpaper-optimized:${resolution}-${today}`;
  }

  // 检查是否需要强制刷新（跨天检查）
  private shouldForceRefresh(lastUpdateKey: string): boolean {
    const storedDate = localStorage.getItem(lastUpdateKey);
    const today = this.getLocalDateString();

    if (!storedDate || storedDate !== today) {
      localStorage.setItem(lastUpdateKey, today);
      return true;
    }
    return false;
  }

  // 执行每日检查 - 确保壁纸是最新的
  private async performDailyCheck(): Promise<void> {
    try {
      const today = this.getLocalDateString();
      const lastCheckKey = 'wallpaper-daily-check';
      const lastCheck = localStorage.getItem(lastCheckKey);

      if (lastCheck === today) {
        return; // 今天已经检查过了
      }

      logger.wallpaper.info('执行每日壁纸检查');

      // 标记今天已检查
      localStorage.setItem(lastCheckKey, today);

      // 检查所有分辨率是否需要更新
      const resolutions = ['1080p', '720p', '4k', 'mobile'];

      for (const resolution of resolutions) {
        const todayKey = this.getTodayCacheKey(resolution);
        const todayCache = await indexedDBCache.get(todayKey);

        if (!todayCache) {
          // 没有今天的缓存，触发后台下载
          logger.wallpaper.info(`后台预加载 ${resolution} 壁纸`);
          this.updateWallpaperInBackground(resolution).catch((error) => {
            logger.wallpaper.warn(`后台预加载 ${resolution} 失败`, error);
          });
        }
      }

      // 清理过期缓存
      await this.cleanupExpiredCache();

    } catch (error) {
      logger.wallpaper.warn('每日检查失败', error);
    }
  }

  // 获取昨天的缓存键（用于降级）
  private getYesterdayCacheKey(resolution: string): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return `wallpaper-optimized:${resolution}-${this.getLocalDateString(yesterday)}`;
  }

  // Generate daily seed for consistent wallpaper per day
  private getDailySeed(): number {
    const today = this.getLocalDateString();
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      const char = today.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Get daily topic index (rotates through topics)
  private getDailyTopicIndex(): number {
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    return dayOfYear % WALLPAPER_TOPICS.length;
  }

  // Build Unsplash Source URL (no API key required)
  private getUnsplashSourceUrl(resolution: string): string {
    const config = RESOLUTION_CONFIG[resolution] || RESOLUTION_CONFIG['1080p'];
    const { width, height } = config;
    const topic = WALLPAPER_TOPICS[this.getDailyTopicIndex()];
    const seed = this.getDailySeed();

    // Unsplash Source URL format: https://source.unsplash.com/{width}x{height}/?{topic}&sig={seed}
    return `https://source.unsplash.com/${width}x${height}/?${topic}&sig=${seed}`;
  }

  // Build Picsum fallback URL
  private getPicsumUrl(resolution: string): string {
    const config = RESOLUTION_CONFIG[resolution] || RESOLUTION_CONFIG['1080p'];
    const { width, height } = config;
    const seed = this.getDailySeed();

    return `https://picsum.photos/seed/${seed}/${width}/${height}`;
  }

  // Get wallpaper URL - Picsum first (better CORS support), Unsplash as fallback
  private getWallpaperUrl(resolution: string): string {
    return this.getPicsumUrl(resolution);
  }

  // Get fallback wallpaper URL (Unsplash Source - may have CORS issues)
  private getFallbackWallpaperUrl(resolution: string): string {
    return this.getUnsplashSourceUrl(resolution);
  }

  // 智能获取缓存（今天 > 昨天 > 更早）
  private async getSmartCache(
    resolution: string
  ): Promise<{ url: string; isToday: boolean; originalUrl?: string } | null> {
    try {
      // 注意：BlobURL由memoryManager统一管理生命周期，不需要手动检测有效性

      // 1. 优先尝试今天的缓存
      const todayKey = this.getTodayCacheKey(resolution);
      const todayCache = (await indexedDBCache.get(todayKey)) as Blob;

      if (todayCache) {
        logger.wallpaper.info('使用今天的壁纸缓存');
        const originalUrl = await this.getOriginalUrl(todayKey);
        // 每次都重新创建BlobURL，确保有效性
        return {
          url: await memoryManager.createBlobUrl(todayCache, 'wallpaper'),
          isToday: true,
          originalUrl,
        };
      }

      // 2. 尝试昨天的缓存作为降级
      const yesterdayKey = this.getYesterdayCacheKey(resolution);
      const yesterdayCache = (await indexedDBCache.get(yesterdayKey)) as Blob;

      if (yesterdayCache) {
        logger.wallpaper.info('使用昨天的壁纸缓存作为降级');
        const originalUrl = await this.getOriginalUrl(yesterdayKey);
        return {
          url: await memoryManager.createBlobUrl(yesterdayCache, 'wallpaper'),
          isToday: false,
          originalUrl,
        };
      }

      // 3. 尝试任何可用的壁纸缓存
      const allKeys = await indexedDBCache.getAllKeys();
      const wallpaperKeys = allKeys.filter(
        (key) => key.startsWith('wallpaper-optimized:') && key.includes(resolution) && !key.includes('-metadata')
      );

      if (wallpaperKeys.length > 0) {
        // 按时间排序，使用最新的
        wallpaperKeys.sort().reverse();
        const latestKey = wallpaperKeys[0];
        const latestCache = (await indexedDBCache.get(latestKey)) as Blob;

        if (latestCache) {
          logger.wallpaper.info('使用最新可用的壁纸缓存', { key: latestKey });
          const originalUrl = await this.getOriginalUrl(latestKey);
          return {
            url: await memoryManager.createBlobUrl(latestCache, 'wallpaper'),
            isToday: false,
            originalUrl,
          };
        }
      }
    } catch (error) {
      logger.wallpaper.warn('获取智能缓存失败', error);
    }

    return null;
  }

  // 获取缓存的原始 URL
  private async getOriginalUrl(cacheKey: string): Promise<string | undefined> {
    try {
      const metadataKey = `${cacheKey}-metadata`;
      const metadataBlob = (await indexedDBCache.get(metadataKey)) as Blob;

      if (metadataBlob) {
        const text = await metadataBlob.text();
        const metadata = JSON.parse(text);
        return metadata.originalUrl;
      }
    } catch (error) {
      logger.wallpaper.debug('读取壁纸元数据失败', error);
    }
    return undefined;
  }

  // Download and cache wallpaper
  private async downloadAndCache(
    url: string,
    resolution: string
  ): Promise<{ blobUrl: string; originalUrl: string }> {
    try {
      logger.wallpaper.info('开始下载壁纸', { url: url.substring(0, 80) });

      // Picsum and Unsplash support CORS natively, no proxy needed
      const response = await createWallpaperRequest(url, {
        mode: 'cors',
        headers: { Accept: 'image/*' },
        signal: createTimeoutSignal(20000), // 20s timeout for large images
      });

      const blob = await response.blob();
      const blobUrl = await memoryManager.createBlobUrl(blob, 'wallpaper');

      // Cache to IndexedDB asynchronously
      const cacheKey = this.getTodayCacheKey(resolution);
      indexedDBCache
        .set(cacheKey, blob, 48 * 60 * 60 * 1000) // 48h cache
        .then(() => logger.wallpaper.info('壁纸已缓存到IndexedDB'))
        .catch((error) => logger.wallpaper.warn('缓存壁纸失败', error));

      // Save original URL metadata
      const metadataKey = `${cacheKey}-metadata`;
      indexedDBCache
        .set(
          metadataKey,
          new Blob([JSON.stringify({ originalUrl: url })], { type: 'application/json' }),
          48 * 60 * 60 * 1000
        )
        .then(() => logger.wallpaper.info('壁纸元数据已缓存'))
        .catch((error) => logger.wallpaper.warn('缓存元数据失败', error));

      logger.wallpaper.info('壁纸下载完成', {
        size: `${(blob.size / 1024 / 1024).toFixed(2)}MB`,
        originalUrl: url,
      });

      return { blobUrl, originalUrl: url };
    } catch (error) {
      logger.wallpaper.error('下载壁纸失败', error);
      throw error;
    }
  }

  // 主要方法：获取壁纸（优化的加载策略）
  async getWallpaper(resolution: string): Promise<{
    url: string;
    isFromCache: boolean;
    isToday: boolean;
    needsUpdate: boolean;
    originalUrl?: string; // 原始 URL（非 Blob URL）
  }> {
    const cacheKey = `loading-${resolution}`;

    // 防止重复加载
    if (this.loadingPromises.has(cacheKey)) {
      const result = await this.loadingPromises.get(cacheKey)!;
      logger.wallpaper.debug('返回正在加载的壁纸结果', {
        resolution,
        isFromCache: result.isFromCache,
      });
      return result;
    }

    const loadingPromise = this._getWallpaperInternal(resolution);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private async _getWallpaperInternal(resolution: string): Promise<{
    url: string;
    isFromCache: boolean;
    isToday: boolean;
    needsUpdate: boolean;
    originalUrl?: string;
  }> {
    try {
      // 0. 如果是自定义壁纸，直接返回（每次从 IndexedDB 生成新的 Blob URL）
      if (resolution === 'custom') {
        const customUrl = await customWallpaperManager.getCurrentWallpaper();
        if (customUrl) {
          logger.wallpaper.info('使用自定义壁纸（从 IndexedDB 重新生成 Blob URL）');
          return {
            url: customUrl,
            isFromCache: true,
            isToday: true,
            needsUpdate: false,
          };
        } else {
          // 没有自定义壁纸，使用备用图片
          logger.wallpaper.warn('未找到自定义壁纸，使用备用图片');
          return {
            url: this.fallbackImage,
            isFromCache: false,
            isToday: true,
            needsUpdate: false,
          };
        }
      }

      // 0.1 检查是否需要强制刷新（跨天检查）
      const forceRefreshKey = `wallpaper-last-update-${resolution}`;
      const shouldRefresh = this.shouldForceRefresh(forceRefreshKey);

      if (shouldRefresh) {
        logger.wallpaper.info('检测到跨天，强制刷新壁纸缓存');
        // 清理今天的缓存，强制重新下载
        await this.clearTodayCache(resolution);
      }

      // 1. 首先尝试智能缓存
      const cachedResult = await this.getSmartCache(resolution);

      if (cachedResult) {
        // 🔧 检查旧缓存是否缺少 originalUrl（旧版本的缓存）
        if (!cachedResult.originalUrl && cachedResult.isToday) {
          logger.wallpaper.warn('⚠️ 检测到今天的缓存缺少 originalUrl，清除并重新下载');
          await this.clearTodayCache(resolution);
          // 继续执行，触发重新下载
        } else if (cachedResult.originalUrl) {
          // 有 originalUrl 的缓存，正常返回
          const result = {
            url: cachedResult.url,
            isFromCache: true,
            isToday: cachedResult.isToday,
            needsUpdate: !cachedResult.isToday,
            originalUrl: cachedResult.originalUrl,
          };

          // 如果不是今天的缓存，后台更新
          if (!cachedResult.isToday) {
            logger.wallpaper.info('后台更新今天的壁纸');
            this.updateWallpaperInBackground(resolution).catch((error) => {
              logger.wallpaper.warn('后台更新壁纸失败', error);
            });
          }

          return result;
        } else {
          // 旧缓存但不是今天的，先用着但标记需要更新
          logger.wallpaper.warn('⚠️ 使用旧缓存壁纸（无 originalUrl），将后台更新');
          const result = {
            url: cachedResult.url,
            isFromCache: true,
            isToday: cachedResult.isToday,
            needsUpdate: true,
            originalUrl: cachedResult.originalUrl, // undefined
          };

          // 后台更新以获取新壁纸和 originalUrl
          this.updateWallpaperInBackground(resolution).catch((error) => {
            logger.wallpaper.warn('后台更新壁纸失败', error);
          });

          return result;
        }
      }

      // 2. 无缓存，需要下载
      logger.wallpaper.info('无可用缓存，开始下载新壁纸');

      // Try Unsplash first, fallback to Picsum
      try {
        const unsplashUrl = this.getWallpaperUrl(resolution);
        const downloaded = await this.downloadAndCache(unsplashUrl, resolution);
        return {
          url: downloaded.blobUrl,
          isFromCache: false,
          isToday: true,
          needsUpdate: false,
          originalUrl: downloaded.originalUrl,
        };
      } catch (unsplashError) {
        logger.wallpaper.warn('Unsplash download failed, trying Picsum fallback', unsplashError);

        // Fallback to Picsum
        try {
          const picsumUrl = this.getFallbackWallpaperUrl(resolution);
          const downloaded = await this.downloadAndCache(picsumUrl, resolution);
          return {
            url: downloaded.blobUrl,
            isFromCache: false,
            isToday: true,
            needsUpdate: false,
            originalUrl: downloaded.originalUrl,
          };
        } catch (picsumError) {
          logger.wallpaper.error('Both Unsplash and Picsum failed', picsumError);
          throw picsumError;
        }
      }
    } catch (error) {
      const errorInfo = errorHandler.handleError(error as Error, 'wallpaper-load');
      logger.wallpaper.error('获取壁纸失败，使用备用图片', errorInfo);

      return {
        url: this.fallbackImage,
        isFromCache: false,
        isToday: true,
        needsUpdate: false,
      };
    }
  }

  // Background wallpaper update with fallback
  private async updateWallpaperInBackground(resolution: string): Promise<void> {
    try {
      const unsplashUrl = this.getWallpaperUrl(resolution);
      await this.downloadAndCache(unsplashUrl, resolution);
      logger.wallpaper.info('Background wallpaper update completed (Unsplash)');
    } catch (unsplashError) {
      logger.wallpaper.warn('Unsplash background update failed, trying Picsum', unsplashError);
      try {
        const picsumUrl = this.getFallbackWallpaperUrl(resolution);
        await this.downloadAndCache(picsumUrl, resolution);
        logger.wallpaper.info('Background wallpaper update completed (Picsum fallback)');
      } catch (picsumError) {
        logger.wallpaper.warn('Background wallpaper update failed completely', picsumError);
      }
    }
  }

  // 预加载壁纸（在空闲时间）
  async preloadWallpapers(): Promise<void> {
    if (!('requestIdleCallback' in window)) {
      return; // 不支持空闲回调的浏览器跳过预加载
    }

    const resolutions = ['1080p', '720p', '4k', 'mobile'];

    for (const resolution of resolutions) {
      await new Promise<void>((resolve) => {
        requestIdleCallback(async () => {
          try {
            const cached = await this.getSmartCache(resolution);
            if (!cached || !cached.isToday) {
              logger.wallpaper.debug(`预加载 ${resolution} 壁纸`);
              await this.getWallpaper(resolution);
            }
          } catch (error) {
            logger.wallpaper.warn(`预加载 ${resolution} 壁纸失败`, error);
          }
          resolve();
        });
      });
    }
  }

  // 清理过期缓存
  async cleanupExpiredCache(): Promise<void> {
    try {
      const allKeys = await indexedDBCache.getAllKeys();
      const wallpaperKeys = allKeys.filter((key) => key.startsWith('wallpaper-optimized:'));

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const cutoffDate = this.getLocalDateString(threeDaysAgo);

      let deletedCount = 0;

      for (const key of wallpaperKeys) {
        const dateMatch = key.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch && dateMatch[1] < cutoffDate) {
          await indexedDBCache.delete(key);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.wallpaper.info(`清理了 ${deletedCount} 个过期壁纸缓存`);
      }
    } catch (error) {
      logger.wallpaper.warn('清理过期缓存失败', error);
    }
  }

  // 清理特定日期的缓存
  async clearCacheForDate(resolution: string, date?: string): Promise<void> {
    try {
      const dateStr = date || this.getLocalDateString();
      const cacheKey = `wallpaper-optimized:${resolution}-${dateStr}`;

      await indexedDBCache.delete(cacheKey);
      logger.wallpaper.info('已清理指定日期的壁纸缓存', { key: cacheKey });
    } catch (error) {
      logger.wallpaper.warn('清理指定日期缓存失败', error);
    }
  }

  // 清理今天的缓存
  async clearTodayCache(resolution: string): Promise<void> {
    await this.clearCacheForDate(resolution);
  }

  // 获取缓存统计
  async getCacheStats(): Promise<{
    totalCount: number;
    todayCount: number;
    totalSize: number;
    cacheKeys: string[];
  }> {
    try {
      const allKeys = await indexedDBCache.getAllKeys();
      const wallpaperKeys = allKeys.filter((key) => key.startsWith('wallpaper-optimized:'));

      const today = this.getLocalDateString();
      const todayKeys = wallpaperKeys.filter((key) => key.includes(today));

      let totalSize = 0;
      for (const key of wallpaperKeys) {
        try {
          const blob = (await indexedDBCache.get(key)) as Blob;
          if (blob) {
            totalSize += blob.size;
          }
        } catch (error) {
          // 忽略单个文件的错误
        }
      }

      return {
        totalCount: wallpaperKeys.length,
        todayCount: todayKeys.length,
        totalSize,
        cacheKeys: wallpaperKeys,
      };
    } catch (error) {
      logger.wallpaper.warn('获取缓存统计失败', error);
      return { totalCount: 0, todayCount: 0, totalSize: 0, cacheKeys: [] };
    }
  }
}

// 导出单例
export const optimizedWallpaperService = OptimizedWallpaperService.getInstance();

// 页面空闲时预加载壁纸
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  requestIdleCallback(() => {
    optimizedWallpaperService.preloadWallpapers().catch((error) => {
      logger.wallpaper.error('预加载壁纸失败', error);
    });
  });
}
