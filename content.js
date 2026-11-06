// content.js - 注入页面，负责滚动 + 拼接截图

(function () {
  // 防止重复注入
  if (window.__screenshotRunning) return;
  window.__screenshotRunning = true;

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'startCapture') {
      captureFullPage();
    }
  });

  // 隐藏所有扩展注入的悬浮元素（fixed/sticky 且 z-index 极高）
  function hideInjectedOverlays() {
    const hidden = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      // 跳过自己的 Toast
      if (el.id === '__screenshot_toast__') continue;
      const style = window.getComputedStyle(el);
      const position = style.position;
      const zIndex = parseInt(style.zIndex, 10);
      // fixed/sticky 且 z-index > 1000，判定为悬浮注入元素
      if ((position === 'fixed' || position === 'sticky') && zIndex > 1000) {
        hidden.push({ el, originalVisibility: el.style.visibility });
        el.style.visibility = 'hidden';
      }
    }
    return hidden;
  }

  function restoreInjectedOverlays(hidden) {
    for (const { el, originalVisibility } of hidden) {
      el.style.visibility = originalVisibility;
    }
  }

  async function captureFullPage() {
    const body = document.body;
    const html = document.documentElement;

    // 记录原始状态
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;
    const originalOverflow = body.style.overflow;

    // 获取页面真实尺寸
    const totalHeight = Math.max(
      body.scrollHeight, body.offsetHeight,
      html.clientHeight, html.scrollHeight, html.offsetHeight
    );
    const totalWidth = Math.max(
      body.scrollWidth, body.offsetWidth,
      html.clientWidth, html.scrollWidth, html.offsetWidth
    );
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // 如果页面高度接近视口（无需滚动），直接截一张
    if (totalHeight <= viewportHeight * 1.2) {
      window.scrollTo(0, 0);
      await sleep(300);
      const hiddenOverlays = hideInjectedOverlays();
      await sleep(80);
      const dataUrl = await captureVisible();
      restoreInjectedOverlays(hiddenOverlays);
      saveImage(dataUrl);
      window.__screenshotRunning = false;
      return;
    }

    // 显示进度提示
    showToast('截图中...');
    setBadge('...', '#2196F3');

    // 禁止滚动条影响布局
    body.style.overflow = 'hidden';

    // 隐藏所有扩展注入的悬浮元素
    const hiddenOverlays = hideInjectedOverlays();

    const canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');

    let scrollY = 0;
    let chunkIndex = 0;

    // 逐段滚动截图
    while (scrollY < totalHeight) {
      window.scrollTo(0, scrollY);
      await sleep(250); // 等待页面渲染（懒加载内容）

      // 截图前隐藏 Toast，避免截入画面
      if (toastEl) toastEl.style.visibility = 'hidden';
      await sleep(50);
      const dataUrl = await captureVisible();
      if (toastEl) toastEl.style.visibility = 'visible';
      const img = await loadImage(dataUrl);

      // 计算当前段实际高度（最后一段可能不足一屏）
      const remaining = totalHeight - scrollY;
      const drawHeight = Math.min(viewportHeight, remaining);

      // 最后一段需要从底部对齐裁剪
      const sourceY = viewportHeight - drawHeight;

      ctx.drawImage(
        img,
        0, sourceY,            // 源图裁剪起点
        viewportWidth, drawHeight,  // 源图裁剪尺寸
        0, scrollY,            // 目标画布起点
        viewportWidth, drawHeight   // 目标绘制尺寸
      );

      chunkIndex++;
      const progress = Math.round((scrollY / totalHeight) * 100);
      updateToast(`截图中... ${progress}%`);

      scrollY += viewportHeight;
    }

    // 恢复页面原始状态
    body.style.overflow = originalOverflow;
    window.scrollTo(originalScrollX, originalScrollY);
    restoreInjectedOverlays(hiddenOverlays);

    // 导出最终图片
    const finalDataUrl = canvas.toDataURL('image/png');
    hideToast();
    setBadge('✓', '#4CAF50');

    // 3 秒后清除徽章
    setTimeout(() => setBadge('', '#4CAF50'), 3000);

    saveImage(finalDataUrl);
    window.__screenshotRunning = false;
  }

  // 请求 background 截取当前视口
  function captureVisible() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'screenshotChunk' }, (response) => {
        resolve(response.dataUrl);
      });
    });
  }

  // 加载图片为 HTMLImageElement
  function loadImage(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = dataUrl;
    });
  }

  // 发送给 background 保存文件
  function saveImage(dataUrl) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const filename = `screenshot_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;
    chrome.runtime.sendMessage({ action: 'saveScreenshot', dataUrl, filename });
  }

  function setBadge(text, color) {
    chrome.runtime.sendMessage({ action: 'updateBadge', text, color });
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ---- Toast 提示 UI ----
  let toastEl = null;

  function showToast(text) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div');
    toastEl.id = '__screenshot_toast__';
    Object.assign(toastEl.style, {
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      zIndex: '2147483647',
      background: 'rgba(0,0,0,0.75)',
      color: '#fff',
      padding: '10px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'sans-serif',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      transition: 'opacity 0.3s',
      pointerEvents: 'none'
    });
    toastEl.textContent = text;
    document.body.appendChild(toastEl);
  }

  function updateToast(text) {
    if (toastEl) toastEl.textContent = text;
  }

  function hideToast() {
    if (toastEl) {
      toastEl.style.opacity = '0';
      setTimeout(() => toastEl && toastEl.remove(), 300);
      toastEl = null;
    }
  }
})();
