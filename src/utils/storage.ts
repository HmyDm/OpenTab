import { DEFAULT_SETTINGS, DEFAULT_CATEGORIES, DEFAULT_RADIAL_MENU_SETTINGS } from '../types';
import type { Settings, Website, Category, RadialMenuSettings } from '../types';
import { db } from './db';
import { objectUrlPool } from './objectUrlPool';

const STORAGE_KEYS = {
  SETTINGS: 'newtab-settings',
  WEBSITES: 'newtab-websites',
  CATEGORIES: 'newtab-categories',
  RADIAL_MENU: 'newtab-radial-menu',
};

const IDB_PREFIX = 'indexeddb:';

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

const normalizeCustomEngines = (
  input: unknown
): { name: string; url: string; placeholder?: string }[] => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.filter(
      (item): item is { name: string; url: string; placeholder?: string } =>
        !!item && typeof item.name === 'string' && typeof item.url === 'string'
    );
  }
  if (typeof input === 'object') {
    return Object.values(input as Record<string, unknown>).filter(
      (item): item is { name: string; url: string; placeholder?: string } =>
        !!item && typeof (item as any).name === 'string' && typeof (item as any).url === 'string'
    );
  }
  return [];
};

const dataURItoBlob = (dataURI: string): Blob => {
  const arr = dataURI.split(',');
  const header = arr[0] || '';
  const dataPart = arr[1] || '';
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const isBase64 = header.includes(';base64');
  if (isBase64) {
    const bstr = atob(dataPart);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  }

  let text = dataPart;
  try {
    text = decodeURIComponent(dataPart);
  } catch {
    text = dataPart;
  }
  return new Blob([text], { type: mime });
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const extractIdbKey = (value: string): string | null => {
  if (!value.startsWith(IDB_PREFIX)) return null;
  const key = value.slice(IDB_PREFIX.length);
  return key || null;
};

const collectIdbKeys = (values: string[]): Set<string> => {
  const keys = new Set<string>();
  for (const value of values) {
    const key = extractIdbKey(value);
    if (key) keys.add(key);
  }
  return keys;
};

const cleanupRemovedKeys = async (prevKeys: Set<string>, nextKeys: Set<string>) => {
  const tasks: Promise<unknown>[] = [];
  for (const key of prevKeys) {
    if (nextKeys.has(key)) continue;
    objectUrlPool.revokeKey(key);
    tasks.push(db.removeItem(key));
  }
  await Promise.all(tasks);
};

const resolveImageForExport = async (value: string): Promise<string> => {
  const image = value || '';
  if (!image) return '';

  const idbKey = extractIdbKey(image);
  if (idbKey) {
    const blob = await db.getItem(idbKey);
    if (!blob) return '';
    try {
      return await blobToDataUrl(blob);
    } catch {
      return '';
    }
  }

  return image;
};

const processImageForSave = async (imageStr: string, key: string): Promise<string> => {
  const image = imageStr || '';

  if (image.startsWith('data:image')) {
    const blob = dataURItoBlob(image);
    await db.setItem(key, blob);
    objectUrlPool.revokeKey(key);
    return `${IDB_PREFIX}${key}`;
  }

  const existingIdbKey = extractIdbKey(image);
  if (existingIdbKey) return image;

  const mappedKey = objectUrlPool.getKeyByUrl(image);
  if (mappedKey) return `${IDB_PREFIX}${mappedKey}`;

  return image;
};

const processImageForLoad = async (imageStr: string): Promise<string> => {
  const key = extractIdbKey(imageStr);
  if (!key) return imageStr;

  const blob = await db.getItem(key);
  if (!blob) return '';
  return objectUrlPool.getOrCreate(key, blob);
};

const readStorage = async <T>(storageKey: string, fallback: T): Promise<T> => {
  if (isExtension) {
    const result = await chrome.storage.local.get(storageKey);
    return (result[storageKey] as T) || fallback;
  }

  const data = localStorage.getItem(storageKey);
  return data ? (JSON.parse(data) as T) : fallback;
};

const writeStorage = async <T>(storageKey: string, value: T): Promise<void> => {
  if (isExtension) {
    await chrome.storage.local.set({ [storageKey]: value });
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(value));
};

export const storage = {
  async getSettings(): Promise<Settings> {
    const settings = await readStorage<Settings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);

    settings.customEngines = normalizeCustomEngines((settings as any).customEngines);
    if (settings.backgroundImage) {
      settings.backgroundImage = await processImageForLoad(settings.backgroundImage);
    }
    return settings;
  },

  async getSettingsRaw(): Promise<Settings> {
    const raw = await readStorage<Settings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return {
      ...raw,
      customEngines: normalizeCustomEngines((raw as any).customEngines),
    };
  },

  async getSettingsForExport(): Promise<Settings> {
    const raw = await storage.getSettingsRaw();
    return {
      ...raw,
      backgroundImage: (await resolveImageForExport(raw.backgroundImage)) || raw.backgroundImage || DEFAULT_SETTINGS.backgroundImage,
    };
  },

  async saveSettings(settings: Settings): Promise<void> {
    const previousRaw = await storage.getSettingsRaw();

    const settingsToSave = { ...settings };
    settingsToSave.customEngines = normalizeCustomEngines((settingsToSave as any).customEngines);

    if (settingsToSave.backgroundImage) {
      settingsToSave.backgroundImage = await processImageForSave(settingsToSave.backgroundImage, 'wallpaper');
    }

    await writeStorage(STORAGE_KEYS.SETTINGS, settingsToSave);

    const prevKey = extractIdbKey(previousRaw.backgroundImage || '');
    const nextKey = extractIdbKey(settingsToSave.backgroundImage || '');
    if (prevKey && prevKey !== nextKey) {
      objectUrlPool.revokeKey(prevKey);
      await db.removeItem(prevKey);
    }
  },

  async getWebsites(): Promise<Website[]> {
    let websites = await readStorage<Website[]>(STORAGE_KEYS.WEBSITES, []);

    websites = await Promise.all(websites.map(async (w) => ({
      ...w,
      icon: await processImageForLoad(w.icon)
    })));

    return websites;
  },

  async getWebsitesRaw(): Promise<Website[]> {
    return readStorage<Website[]>(STORAGE_KEYS.WEBSITES, []);
  },

  async getWebsitesForExport(): Promise<Website[]> {
    const raw = await storage.getWebsitesRaw();
    return Promise.all(
      raw.map(async (w) => ({
        ...w,
        icon: (await resolveImageForExport(w.icon)) || w.icon,
      }))
    );
  },

  async saveWebsites(websites: Website[]): Promise<void> {
    const previousRaw = await storage.getWebsitesRaw();

    const websitesToSave = await Promise.all(websites.map(async (w) => ({
      ...w,
      icon: await processImageForSave(w.icon, `site_icon_${w.id}`)
    })));

    await writeStorage(STORAGE_KEYS.WEBSITES, websitesToSave);

    await cleanupRemovedKeys(
      collectIdbKeys(previousRaw.map((item) => item.icon)),
      collectIdbKeys(websitesToSave.map((item) => item.icon))
    );
  },

  async getCategories(): Promise<Category[]> {
    let categories = await readStorage<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);

    categories = await Promise.all(categories.map(async (c) => ({
      ...c,
      icon: await processImageForLoad(c.icon)
    })));

    return categories;
  },

  async getCategoriesRaw(): Promise<Category[]> {
    return readStorage<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  },

  async getCategoriesForExport(): Promise<Category[]> {
    const raw = await storage.getCategoriesRaw();
    return Promise.all(
      raw.map(async (c) => ({
        ...c,
        icon: (await resolveImageForExport(c.icon)) || c.icon,
      }))
    );
  },

  async saveCategories(categories: Category[]): Promise<void> {
    const previousRaw = await storage.getCategoriesRaw();

    const categoriesToSave = await Promise.all(categories.map(async (c) => ({
      ...c,
      icon: await processImageForSave(c.icon, `cat_icon_${c.id}`)
    })));

    await writeStorage(STORAGE_KEYS.CATEGORIES, categoriesToSave);

    await cleanupRemovedKeys(
      collectIdbKeys(previousRaw.map((item) => item.icon)),
      collectIdbKeys(categoriesToSave.map((item) => item.icon))
    );
  },

  async getRadialMenu(): Promise<RadialMenuSettings> {
    const radialMenu = await readStorage<RadialMenuSettings>(
      STORAGE_KEYS.RADIAL_MENU,
      { ...DEFAULT_RADIAL_MENU_SETTINGS, shortcuts: [...DEFAULT_RADIAL_MENU_SETTINGS.shortcuts] }
    );

    radialMenu.scale = typeof radialMenu.scale === 'number' ? Math.min(140, Math.max(70, radialMenu.scale)) : DEFAULT_RADIAL_MENU_SETTINGS.scale;

    radialMenu.shortcuts = (radialMenu.shortcuts || [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .slice(0, 8);

    radialMenu.shortcuts = await Promise.all(radialMenu.shortcuts.map(async (s) => ({
      ...s,
      icon: await processImageForLoad(s.icon)
    })));

    return radialMenu;
  },

  async getRadialMenuRaw(): Promise<RadialMenuSettings> {
    const menu = await readStorage<RadialMenuSettings>(
      STORAGE_KEYS.RADIAL_MENU,
      { ...DEFAULT_RADIAL_MENU_SETTINGS, shortcuts: [...DEFAULT_RADIAL_MENU_SETTINGS.shortcuts] }
    );

    return {
      ...menu,
      scale: typeof menu.scale === 'number' ? Math.min(140, Math.max(70, menu.scale)) : DEFAULT_RADIAL_MENU_SETTINGS.scale
    };
  },

  async getRadialMenuForExport(): Promise<RadialMenuSettings> {
    const raw = await storage.getRadialMenuRaw();
    const shortcuts = await Promise.all(
      (raw.shortcuts || []).map(async (s) => ({
        ...s,
        icon: (await resolveImageForExport(s.icon)) || s.icon,
      }))
    );

    return {
      ...raw,
      shortcuts,
    };
  },

  async saveRadialMenu(radialMenu: RadialMenuSettings): Promise<void> {
    const previousRaw = await storage.getRadialMenuRaw();

    const menuToSave: RadialMenuSettings = {
      ...radialMenu,
      scale: typeof radialMenu.scale === 'number' ? Math.min(140, Math.max(70, radialMenu.scale)) : DEFAULT_RADIAL_MENU_SETTINGS.scale,
      shortcuts: (radialMenu.shortcuts || [])
        .slice(0, 8)
        .map((item, index) => ({ ...item, order: index + 1 })),
    };

    menuToSave.shortcuts = await Promise.all(menuToSave.shortcuts.map(async (s) => ({
      ...s,
      icon: await processImageForSave(s.icon, `radial_icon_${s.id}`)
    })));

    await writeStorage(STORAGE_KEYS.RADIAL_MENU, menuToSave);

    await cleanupRemovedKeys(
      collectIdbKeys((previousRaw.shortcuts || []).map((item) => item.icon)),
      collectIdbKeys((menuToSave.shortcuts || []).map((item) => item.icon))
    );
  },

  releaseTransientResources(): void {
    objectUrlPool.revokeAll();
  },
};
