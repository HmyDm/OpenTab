const OPEN_TAB_MESSAGE = 'OPEN_TAB_IN_CURRENT_WINDOW';

const isValidHttpUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== OPEN_TAB_MESSAGE) {
    return;
  }

  const url = message.payload?.url;
  if (!isValidHttpUrl(url)) {
    sendResponse({ ok: false, error: 'INVALID_URL' });
    return;
  }

  const createOptions: chrome.tabs.CreateProperties = {
    url,
    active: true
  };

  if (sender.tab?.windowId !== undefined) {
    createOptions.windowId = sender.tab.windowId;
  }

  chrome.tabs.create(createOptions, (tab) => {
    if (chrome.runtime.lastError || !tab?.id) {
      sendResponse({ ok: false, error: chrome.runtime.lastError?.message || 'CREATE_TAB_FAILED' });
      return;
    }
    sendResponse({ ok: true, tabId: tab.id });
  });

  return true;
});
