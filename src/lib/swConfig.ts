// Service Worker configuration
// Update version here - sw.js and usePWA.ts will sync automatically

export const SW_VERSION = 'v15';
export const CACHE_PREFIX = 'jiang-ai-web';

// 缓存名称
export const CACHE_NAMES = {
  MAIN: `${CACHE_PREFIX}-${SW_VERSION}-offline`,
  STATIC: `static-${SW_VERSION}`,
  DYNAMIC: `dynamic-${SW_VERSION}`,
  WALLPAPER: `wallpaper-${SW_VERSION}`,
} as const;
