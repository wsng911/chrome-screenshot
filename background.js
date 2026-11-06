// background.js - Service Worker

// 点击扩展图标触发
chrome.action.onClicked.addListener((tab) => {
  startScreenshot(tab);
});

// 快捷键触发
chrome.commands.onCommand.addListener((command) => {
  if (command === 'take-screenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) startScreenshot(tabs[0]);
    });
  }
});

// 接收 content.js 发来的截图数据
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'screenshotChunk') {
    // 截取当前视口
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' }, (dataUrl) => {
      sendResponse({ dataUrl });
    });
    return true; // 异步响应
  }

  if (message.action === 'saveScreenshot') {
    const { dataUrl, filename } = message;
    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('下载失败:', chrome.runtime.lastError);
      }
    });
  }

  if (message.action === 'updateBadge') {
    chrome.action.setBadgeText({ text: message.text, tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: message.color || '#4CAF50' });
  }
});

function startScreenshot(tab) {
  // 不能截 chrome:// 页面
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    chrome.notifications && chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '无法截图',
      message: '无法截取 Chrome 内置页面'
    });
    return;
  }

  // 注入 content script 并触发截图
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('注入失败:', chrome.runtime.lastError);
      return;
    }
    chrome.tabs.sendMessage(tab.id, { action: 'startCapture' });
  });
}
