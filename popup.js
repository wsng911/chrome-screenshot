// popup.js
const btn = document.getElementById('btnCapture');
const status = document.getElementById('status');

btn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url) return;

  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    showStatus('无法截取 Chrome 内置页面', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = '截图中...';
  showStatus('正在截取页面，请稍候...', 'progress');

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    await chrome.tabs.sendMessage(tab.id, { action: 'startCapture' });

    showStatus('✅ 截图完成，已保存到下载文件夹', 'success');
  } catch (e) {
    showStatus('截图失败：' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.65 0-3 1.35-3 3s1.35 3 3 3 3-1.35 3-3-1.35-3-3-3z"/></svg> 截取整个页面`;
  }
});

function showStatus(text, type) {
  status.textContent = text;
  status.className = 'status ' + type;
}
