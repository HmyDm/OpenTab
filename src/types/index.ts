export interface Website {
  id: string;
  name: string;
  url: string;
  icon: string; // Base64 encoded image or URL
  category: string;
  order: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export type RadialMenuModifierKey = 'ctrl' | 'alt' | 'shift';

export interface ShortcutItem {
  id: string;
  name: string;
  url: string;
  icon: string;
  order: number;
}

export interface RadialMenuSettings {
  enabled: boolean;
  modifierKey: RadialMenuModifierKey;
  scale: number;
  shortcuts: ShortcutItem[];
}

export interface Settings {
  searchEngine: 'bing' | 'google' | 'baidu' | string;
  customEngines?: { name: string; url: string; placeholder?: string }[];
  backgroundImage: string; // Base64 or URL
  iconSize: 'small' | 'medium' | 'large';
  iconRadius: number; // 0-50 (percentage)
  textSize: 'small' | 'medium' | 'large';
  sidebarHidden?: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  searchEngine: 'bing',
  customEngines: [],
  backgroundImage: '/backgroud.jpg',
  iconSize: 'medium',
  iconRadius: 20,
  textSize: 'medium',
  sidebarHidden: false,
};

export const DEFAULT_RADIAL_MENU_SETTINGS: RadialMenuSettings = {
  enabled: true,
  modifierKey: 'ctrl',
  scale: 70,
  shortcuts: [
    { id: 'radial-1', name: '豆包', url: 'https://www.doubao.com', icon: 'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/samantha/logo-icon-white-bg.png', order: 1 },
    { id: 'radial-2', name: '哔哩哔哩', url: 'https://www.bilibili.com', icon: 'https://logo800.cn/uploads/logoxinshang/56/logo800_16491624018615580.png', order: 2 },
    { id: 'radial-3', name: 'deepseek', url: 'https://chat.deepseek.com', icon: 'https://cdn.deepseek.com/logo.png?x-image-process=image%2Fresize%2Cw_1920', order: 3 },
    { id: 'radial-4', name: '知乎', url: 'https://www.zhihu.com/', icon: 'https://img.mad-men.com/article/2020/09/2020/09/1600233943566.png', order: 4 },
  ],
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'daily', name: '日常', icon: 'Home', order: 1 },
  { id: 'entertainment', name: '娱乐', icon: 'Gamepad2', order: 2 },
  { id: 'design', name: '设计', icon: 'Palette', order: 3 },
  { id: 'creative', name: '创意', icon: 'Lightbulb', order: 4 },
  { id: 'program', name: '程序', icon: 'Terminal', order: 5 },
  { id: 'shopping', name: '购物', icon: 'ShoppingBag', order: 6 },
];
