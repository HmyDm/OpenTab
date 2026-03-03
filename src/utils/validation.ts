import { DEFAULT_CATEGORIES, DEFAULT_RADIAL_MENU_SETTINGS, DEFAULT_SETTINGS } from '../types';
import type { Category, RadialMenuModifierKey, RadialMenuSettings, Settings, Website } from '../types';

export const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024;

const MAX_NAME_LEN = 60;
const MAX_ICON_LEN = 2 * 1024 * 1024;
const BUILT_IN_SEARCH_ENGINES = new Set(['bing', 'google', 'baidu']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const safeTrim = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const normalizeHttpUrl = (value: unknown): string | null => {
  const raw = safeTrim(value);
  if (!raw) return null;

  // Don't normalize local paths or icon names as HTTP URLs
  if (raw.startsWith('/') || (!raw.includes('.') && raw !== 'localhost')) {
    // If it's a domain name without a protocol, it should have a dot (e.g. "google.com")
    // or be "localhost". Otherwise it's likely an icon name or local path fragment.
    return null;
  }

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    
    // If we prepended https://, let's be more strict to avoid catching icon names
    if (!/^https?:\/\//i.test(raw)) {
      if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
        return null;
      }
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
};

const isSafeDataImage = (value: string) => {
  if (value.length > MAX_ICON_LEN) return false;
  return /^data:image\/[a-z0-9.+-]+(?:;[a-z0-9=:+-]+)*(?:;base64)?,/i.test(value);
};

export const normalizeImageValue = (value: unknown): string => {
  const raw = safeTrim(value);
  if (!raw) return '';
  
  // Allow local paths (starting with /)
  if (raw.startsWith('/')) return raw;

  if (/^data:image\//i.test(raw)) {
    return isSafeDataImage(raw) ? raw : '';
  }
  return normalizeHttpUrl(raw) || '';
};

const normalizeName = (value: unknown, fallback = '') => {
  const next = safeTrim(value).slice(0, MAX_NAME_LEN);
  return next || fallback;
};

const normalizeCustomEngines = (input: unknown): { name: string; url: string; placeholder?: string }[] => {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!isRecord(item)) return null;
      const name = normalizeName(item.name);
      const url = normalizeHttpUrl(item.url);
      if (!name || !url) return null;
      const placeholder = safeTrim(item.placeholder).slice(0, 80);
      return {
        name,
        url,
        ...(placeholder ? { placeholder } : {}),
      };
    })
    .filter((item): item is { name: string; url: string; placeholder?: string } => !!item)
    .slice(0, 20);
};

export const normalizeSettingsInput = (input: unknown, fallback: Settings = DEFAULT_SETTINGS): Settings => {
  const raw = isRecord(input) ? input : {};
  const customEngines = normalizeCustomEngines(raw.customEngines);
  const availableEngineNames = new Set(customEngines.map((item) => item.name));
  const nextSearchEngine = safeTrim(raw.searchEngine);

  let searchEngine = 'bing';
  if (BUILT_IN_SEARCH_ENGINES.has(nextSearchEngine) || availableEngineNames.has(nextSearchEngine)) {
    searchEngine = nextSearchEngine;
  } else if (BUILT_IN_SEARCH_ENGINES.has(fallback.searchEngine)) {
    searchEngine = fallback.searchEngine;
  }

  const iconSize = raw.iconSize === 'small' || raw.iconSize === 'medium' || raw.iconSize === 'large'
    ? raw.iconSize
    : fallback.iconSize;

  const textSize = raw.textSize === 'small' || raw.textSize === 'medium' || raw.textSize === 'large'
    ? raw.textSize
    : fallback.textSize;

  const radius = typeof raw.iconRadius === 'number' ? raw.iconRadius : fallback.iconRadius;

  return {
    searchEngine,
    customEngines,
    backgroundImage: normalizeImageValue(raw.backgroundImage) || fallback.backgroundImage,
    iconSize,
    iconRadius: Math.min(50, Math.max(0, Number.isFinite(radius) ? radius : fallback.iconRadius)),
    textSize,
    sidebarHidden: typeof raw.sidebarHidden === 'boolean' ? raw.sidebarHidden : !!fallback.sidebarHidden,
  };
};

export const normalizeCategoryInput = (input: unknown, fallbackOrder: number): Category | null => {
  if (!isRecord(input)) return null;
  const name = normalizeName(input.name);
  if (!name) return null;

  const rawIcon = safeTrim(input.icon);
  const imageIcon = normalizeImageValue(rawIcon);
  const icon = imageIcon || rawIcon || 'Folder';
  const order = typeof input.order === 'number' && Number.isFinite(input.order) ? input.order : fallbackOrder;

  return {
    id: normalizeName(input.id, `${Date.now()}-${Math.random()}`),
    name,
    icon,
    order,
  };
};

export const normalizeWebsiteInput = (input: unknown, fallbackCategoryId: string, fallbackOrder: number): Website | null => {
  if (!isRecord(input)) return null;

  const name = normalizeName(input.name);
  const url = normalizeHttpUrl(input.url);
  if (!name || !url) return null;

  const category = normalizeName(input.category, fallbackCategoryId);
  const order = typeof input.order === 'number' && Number.isFinite(input.order) ? input.order : fallbackOrder;

  return {
    id: normalizeName(input.id, `${Date.now()}-${Math.random()}`),
    name,
    url,
    icon: normalizeImageValue(input.icon),
    category,
    order,
  };
};

export const normalizeRadialMenuInput = (input: unknown): RadialMenuSettings => {
  const raw = isRecord(input) ? input : {};
  const modifierKey: RadialMenuModifierKey = raw.modifierKey === 'alt' || raw.modifierKey === 'shift' || raw.modifierKey === 'ctrl'
    ? raw.modifierKey
    : DEFAULT_RADIAL_MENU_SETTINGS.modifierKey;

  const shortcutsRaw = Array.isArray(raw.shortcuts) ? raw.shortcuts : [];
  const shortcuts = shortcutsRaw
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const name = normalizeName(item.name);
      const url = normalizeHttpUrl(item.url);
      if (!name || !url) return null;

      return {
        id: normalizeName(item.id, `radial-${index + 1}`),
        name,
        url,
        icon: normalizeImageValue(item.icon),
        order: index + 1,
      };
    })
    .filter((item): item is RadialMenuSettings['shortcuts'][number] => !!item)
    .slice(0, 8);

  const scale = typeof raw.scale === 'number' && Number.isFinite(raw.scale)
    ? Math.max(70, Math.min(140, raw.scale))
    : DEFAULT_RADIAL_MENU_SETTINGS.scale;

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
    modifierKey,
    scale,
    shortcuts,
  };
};

export const normalizeImportPayload = (input: unknown): {
  settings: Settings;
  websites: Website[];
  categories: Category[];
  radialMenu: RadialMenuSettings;
} | null => {
  if (!isRecord(input)) return null;

  const categoriesRaw = Array.isArray(input.categories) ? input.categories : [];
  const categories = categoriesRaw
    .map((item, index) => normalizeCategoryInput(item, index + 1))
    .filter((item): item is Category => !!item)
    .slice(0, 200);

  if (!categories.length) {
    categories.push(...DEFAULT_CATEGORIES);
  }

  const categorySet = new Set(categories.map((item) => item.id));
  const firstCategoryId = categories[0]?.id || DEFAULT_CATEGORIES[0].id;

  const websitesRaw = Array.isArray(input.websites) ? input.websites : [];
  const websites = websitesRaw
    .map((item, index) => normalizeWebsiteInput(item, firstCategoryId, index + 1))
    .filter((item): item is Website => !!item)
    .map((item, index) => ({
      ...item,
      category: categorySet.has(item.category) ? item.category : firstCategoryId,
      order: index + 1,
    }))
    .slice(0, 2000);

  return {
    settings: normalizeSettingsInput(input.settings),
    websites,
    categories,
    radialMenu: normalizeRadialMenuInput(input.radialMenu),
  };
};
