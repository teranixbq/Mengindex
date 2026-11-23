import { injectedListDatabases, injectedReadStore } from './injectedReaders.js';

/**
 * Mengindex — Manifest V3 Background Service Worker
 * Launches a dedicated workspace tab on icon click and relays IndexedDB reads to the target tab.
 */

function isRestrictedUrl(url) {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('devtools://') ||
    url.startsWith('view-source:') ||
    url.startsWith('https://chrome.google.com/webstore') ||
    url.startsWith('https://chromewebstore.google.com')
  );
}

function safeOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return url || 'unknown';
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  const params = new URLSearchParams({
    tabId: String(tab?.id ?? ''),
    origin: safeOrigin(tab?.url ?? ''),
    title: tab?.title ?? 'Untitled Tab',
    url: tab?.url ?? '',
  });

  const workspaceUrl = chrome.runtime.getURL(`index.html?${params.toString()}`);
  await chrome.tabs.create({ url: workspaceUrl, active: true });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'LIST_TABS') {
        const tabs = await chrome.tabs.query({});
        const inspectable = tabs
          .filter((t) => t.id && t.url && !isRestrictedUrl(t.url))
          .map((t) => ({
            tabId: t.id,
            title: t.title || 'Untitled Tab',
            url: t.url,
            origin: safeOrigin(t.url),
            favIconUrl: t.favIconUrl || '',
          }));
        sendResponse({ ok: true, tabs: inspectable });
        return;
      }

      if (message.type === 'GET_TAB_INFO') {
        const tabId = Number(message.tabId);
        if (!tabId) {
          sendResponse({ ok: false, error: 'Invalid Tab ID.' });
          return;
        }
        try {
          const tab = await chrome.tabs.get(tabId);
          sendResponse({
            ok: true,
            tab: {
              tabId: tab.id,
              title: tab.title || 'Untitled Tab',
              url: tab.url || '',
              origin: safeOrigin(tab.url || ''),
              restricted: isRestrictedUrl(tab.url || ''),
            },
          });
        } catch {
          sendResponse({ ok: false, error: 'Source tab was closed. Select another tab to continue.' });
        }
        return;
      }

      if (message.type === 'LIST_DATABASES' || message.type === 'READ_STORE') {
        const tabId = Number(message.tabId);
        const tab = await chrome.tabs.get(tabId).catch(() => null);
        if (!tab) {
          sendResponse({ ok: false, error: 'Target tab was closed or not found.' });
          return;
        }
        if (isRestrictedUrl(tab.url)) {
          sendResponse({
            ok: false,
            restricted: true,
            error: 'Chrome internal pages (chrome://, Web Store, system pages) cannot be inspected by extensions.',
          });
          return;
        }

        const results =
          message.type === 'LIST_DATABASES'
            ? await chrome.scripting.executeScript({
                target: { tabId },
                world: 'MAIN',
                func: injectedListDatabases,
              })
            : await chrome.scripting.executeScript({
                target: { tabId },
                world: 'MAIN',
                func: injectedReadStore,
                args: [message.dbName, message.storeName, message.limit || 5000],
              });

        sendResponse(results?.[0]?.result || { ok: false, error: 'No response from target tab.' });
        return;
      }

      sendResponse({ ok: false, error: `Unknown message type: ${message.type}` });
    } catch (err) {
      sendResponse({
        ok: false,
        error: err?.message || 'Error communicating with Chrome tab.',
      });
    }
  })();

  return true;
});
