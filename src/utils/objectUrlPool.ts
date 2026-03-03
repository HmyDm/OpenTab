const keyToUrl = new Map<string, string>();
const urlToKey = new Map<string, string>();

const safeRevoke = (url: string) => {
  try {
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
};

export const objectUrlPool = {
  getOrCreate(key: string, blob: Blob): string {
    const cached = keyToUrl.get(key);
    if (cached) return cached;

    const url = URL.createObjectURL(blob);
    keyToUrl.set(key, url);
    urlToKey.set(url, key);
    return url;
  },

  getKeyByUrl(url: string): string | undefined {
    return urlToKey.get(url);
  },

  revokeKey(key: string): void {
    const url = keyToUrl.get(key);
    if (!url) return;

    keyToUrl.delete(key);
    urlToKey.delete(url);
    safeRevoke(url);
  },

  revokeUrl(url: string): void {
    const key = urlToKey.get(url);
    if (key) {
      keyToUrl.delete(key);
      urlToKey.delete(url);
      safeRevoke(url);
      return;
    }

    safeRevoke(url);
  },

  revokeAll(): void {
    for (const url of keyToUrl.values()) {
      safeRevoke(url);
    }
    keyToUrl.clear();
    urlToKey.clear();
  },
};
