// Dock Item data structure - reuse WebsiteCardData pattern
export interface DockItem {
  id: string;
  name: string;
  url: string;
  favicon: string;
  icon?: string;        // Built-in icon name (FontAwesome class)
  iconColor?: string;   // Icon color (hex or preset color name)
  location?: 'dock' | 'home';  // Display location: dock bar or home page
  tags?: string[];      // Tags for categorization (max 2)
  note?: string;        // Note/description
}

// Built-in icon definition
export interface BuiltInIcon {
  id: string;
  icon: string;         // FontAwesome class
  name: string;         // Display name
}

// Preset colors for icon customization (7 presets + 1 custom picker)
export const ICON_COLORS = [
  { name: '白色', value: '#FFFFFF' },
  { name: '灰色', value: '#6B7280' },
  { name: '红色', value: '#EF4444' },
  { name: '橙色', value: '#F97316' },
  { name: '绿色', value: '#22C55E' },
  { name: '蓝色', value: '#3B82F6' },
  { name: '紫色', value: '#8B5CF6' },
] as const;

// Built-in icons library
export const BUILT_IN_ICONS: BuiltInIcon[] = [
  { id: 'home', icon: 'fa-solid fa-house', name: '首页' },
  { id: 'search', icon: 'fa-solid fa-magnifying-glass', name: '搜索' },
  { id: 'mail', icon: 'fa-solid fa-envelope', name: '邮件' },
  { id: 'calendar', icon: 'fa-solid fa-calendar', name: '日历' },
  { id: 'folder', icon: 'fa-solid fa-folder', name: '文件夹' },
  { id: 'settings', icon: 'fa-solid fa-gear', name: '设置' },
  { id: 'music', icon: 'fa-solid fa-music', name: '音乐' },
  { id: 'video', icon: 'fa-solid fa-video', name: '视频' },
  { id: 'photo', icon: 'fa-solid fa-image', name: '图片' },
  { id: 'chat', icon: 'fa-solid fa-comments', name: '聊天' },
  { id: 'code', icon: 'fa-solid fa-code', name: '代码' },
  { id: 'book', icon: 'fa-solid fa-book', name: '阅读' },
  { id: 'star', icon: 'fa-solid fa-star', name: '收藏' },
  { id: 'heart', icon: 'fa-solid fa-heart', name: '喜欢' },
  { id: 'globe', icon: 'fa-solid fa-globe', name: '网站' },
  { id: 'cloud', icon: 'fa-solid fa-cloud', name: '云端' },
  { id: 'bolt', icon: 'fa-solid fa-bolt', name: '闪电' },
  { id: 'fire', icon: 'fa-solid fa-fire', name: '热门' },
  { id: 'gamepad', icon: 'fa-solid fa-gamepad', name: '游戏' },
  { id: 'shopping', icon: 'fa-solid fa-cart-shopping', name: '购物' },
  { id: 'wallet', icon: 'fa-solid fa-wallet', name: '钱包' },
  { id: 'chart', icon: 'fa-solid fa-chart-line', name: '数据' },
  { id: 'github', icon: 'fa-brands fa-github', name: 'GitHub' },
  { id: 'twitter', icon: 'fa-brands fa-twitter', name: 'Twitter' },
];

// Default dock items for new users
export const DEFAULT_DOCK_ITEMS: DockItem[] = [
  {
    id: 'dock-google',
    name: 'Google',
    url: 'https://www.google.com',
    favicon: 'https://www.google.com/favicon.ico',
  },
  {
    id: 'dock-github',
    name: 'GitHub',
    url: 'https://github.com',
    favicon: '',
    icon: 'fa-brands fa-github',
    iconColor: '#FFFFFF',
  },
];
