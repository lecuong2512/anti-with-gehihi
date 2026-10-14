// ==UserScript==
// @name         Antigravity <-> Gemini Web Bridge (Anti with Gehihi)
// @namespace    https://github.com/lecuong2512/anti-with-gehihi
// @version      1.4.1
// @description  Cầu nối hai chiều tự động hoá giữa Antigravity và Google Gemini Web qua A2G Bridge
// @author       Anti with Gehihi Team
// @match        https://gemini.google.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gemini.google.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Chỉ chạy trên cửa sổ chính, bỏ qua iframes phụ
  if (window.self !== window.top) return;

  // Cấu hình URL linh hoạt: ưu tiên cấu hình người dùng lưu trong localStorage/GM, fallback về localhost hoặc tunnel
  const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:48765';
  function getBridgeUrl() {
    try {
      return localStorage.getItem('a2g_bridge_url') || DEFAULT_BRIDGE_URL;
    } catch (_) {
      return DEFAULT_BRIDGE_URL;
    }
  }

  function setBridgeUrl(url) {
    try {
      localStorage.setItem('a2g_bridge_url', url);
    } catch (_) {}
  }

  let bridgeUrl = getBridgeUrl();
  const POLL_INTERVAL_MS = 1500;
  let isProcessing = false;

  console.log(`[Anti with Gehihi] Userscript v1.4.0 loaded. Bridge URL: ${bridgeUrl}`);

  // --- UI Widget (Status Pill) ---
  const pill = document.createElement('div');
  pill.id = 'a2g-bridge-indicator';
  Object.assign(pill.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '2147483647',
    backgroundColor: '#18181b',
    color: '#00e676',
    padding: '10px 16px',
    borderRadius: '24px',
    fontSize: '13px',
    fontWeight: '700',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    border: '2px solid #00e676',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.25s ease',
  });
  pill.title = 'Click để cấu hình Bridge URL';
  pill.textContent = '🟢 Gehihi: Sẵn sàng (Idle)';

  pill.addEventListener('click', () => {
    const entered = window.prompt(
      'Cấu hình URL Bridge API:\n(Ví dụ: https://<your-tunnel-domain> hoặc http://127.0.0.1:48765)',
      bridgeUrl
    );
    if (entered && entered.trim() && entered.trim() !== bridgeUrl) {
      bridgeUrl = entered.trim().replace(/\/+$/, '');
      setBridgeUrl(bridgeUrl);
      setStatus(`🟢 Đã đổi sang: ${bridgeUrl}`, '#00e676', '#00e676');
      setTimeout(() => {
        setStatus('🟢 Gehihi: Sẵn sàng (Idle)', '#00e676', '#00e676');
      }, 2500);
    }
  });

  function mountPill() {
    if (!document.getElementById('a2g-bridge-indicator')) {
      (document.body || document.documentElement).appendChild(pill);
    }
  }
  mountPill();
  setTimeout(mountPill, 1000);
  setTimeout(mountPill, 3000);

  function setStatus(text, color = '#00e676', borderColor = '#00e676') {
    pill.textContent = text;
    pill.style.color = color;
    pill.style.borderColor = borderColor;
  }

  // --- Network Requests (GM_xmlhttpRequest bypasses CSP completely) ---
  function apiGet(endpoint) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: `${bridgeUrl}${endpoint}`,
        timeout: 8000,
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) {
            try {
              resolve(JSON.parse(res.responseText));
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(`HTTP ${res.status}`));
          }
        },
        onerror: (err) => reject(err),
        ontimeout: () => reject(new Error('Timeout')),
      });
    });
  }

  function apiPost(endpoint, data) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: `${bridgeUrl}${endpoint}`,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(data),
        timeout: 15000,
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) {
            try {
              resolve(JSON.parse(res.responseText));
            } catch (err) {
              resolve({ ok: true });
            }
          } else {
            reject(new Error(`HTTP ${res.status}`));
          }
        },
        onerror: (err) => reject(err),
        ontimeout: () => reject(new Error('Timeout')),
      });
    });
  }

  // --- Gemini DOM Interactions ---
  function getEditor() {
    let el =
      document.querySelector('rich-textarea div[contenteditable="true"]') ||
      document.querySelector('div.ql-editor') ||
      document.querySelector('div[contenteditable="true"]') ||
      document.querySelector('textarea') ||
      document.querySelector('input[type="text"]');
    if (el) return el;

    const placeholder =
      document.querySelector('.input-area') ||
      document.querySelector('[data-placeholder]') ||
      document.querySelector('rich-textarea') ||
      document.querySelector('div.text-input-field');
    if (placeholder) {
      placeholder.click();
      el =
        document.querySelector('rich-textarea div[contenteditable="true"]') ||
        document.querySelector('div.ql-editor') ||
        document.querySelector('div[contenteditable="true"]') ||
        document.querySelector('textarea');
      if (el) return el;
    }
    return null;
  }

  function getSendButton() {
    return (
      document.querySelector('button[aria-label*="Send"]') ||
      document.querySelector('button[aria-label*="Gửi"]') ||
      document.querySelector('button[data-test-id="send-button"]') ||
      document.querySelector('.send-button') ||
      document.querySelector('button.send-button-container') ||
      document.querySelector('button:has(mat-icon[fonticon="send"])')
    );
  }

  function getLatestCompletedResponse(initialModelCount) {
    const responses = Array.from(document.querySelectorAll('model-response'));
    // Nếu chưa sinh turn mới so với lúc gửi (phải lớn hơn số lượng cũ)
    if (responses.length <= initialModelCount) return null;

    const last = responses[responses.length - 1];
    if (!last) return null;

    const fullText = (last.innerText || last.textContent || '').trim();

    // 1. Tuyệt đối không nhận khi vẫn còn chữ suy nghĩ
    if (
      fullText.includes('Đang suy nghĩ') ||
      fullText.includes('Thinking…') ||
      fullText.includes('Thinking...')
    ) {
      return null;
    }

    // 2. Dấu hiệu chắc chắn 100% đã xong: nút Sao chép (Copy) xuất hiện ở cuối câu trả lời
    const copyBtn = last.querySelector(
      'button[aria-label*="Sao chép"], button[aria-label*="Copy"], button[data-test-id*="copy"]'
    );
    if (!copyBtn) {
      // Nếu chưa có nút Copy, kiểm tra xem có thanh công cụ action-bar không
      const actionBar = last.querySelector('.response-actions, [data-test-id="action-bar"]');
      if (!actionBar) return null;
    }

    // 3. Trích xuất nội dung câu trả lời sạch (bỏ qua phần tư duy / nút bấm)
    const contentEl = last.querySelector('message-content') || last.querySelector('.model-response-text');
    if (contentEl) {
      const text = (contentEl.innerText || contentEl.textContent || '').trim();
      if (text.length > 5) return text;
    }

    return fullText;
  }

  function setEditorText(editor, text) {
    editor.focus();
    editor.click();
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('delete', false, null);
      document.execCommand('insertText', false, text);
    } catch (e) {
      editor.innerText = text;
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    editor.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));
  }

  async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function processPromptTask(task) {
    isProcessing = true;
    const { id, prompt } = task;
    console.log(`[Anti with Gehihi] Handling task ${id}:`, prompt);
    setStatus('🟡 Gehihi: Đang nạp câu hỏi...', '#ffd600', '#ffd600');

    try {
      await apiPost('/api/agent/consume', { id });
    } catch (e) {
      console.warn('[Anti with Gehihi] Consume failed:', e);
    }

    const editor = getEditor();
    if (!editor) {
      setStatus('🔴 Gehihi: Không tìm thấy ô chat', '#ff5252', '#ff5252');
      isProcessing = false;
      return;
    }

    // Ghi nhận số lượng model-response trước khi gửi
    const initialModelCount = document.querySelectorAll('model-response').length;

    setEditorText(editor, prompt);
    await sleep(600);

    let sendBtn = getSendButton();
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      editor.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
        })
      );
    }

    // Unfocus ô nhập sau khi gửi
    try { editor.blur(); } catch (_) {}

    setStatus('🟡 Gehihi: Gemini đang nhận lệnh...', '#00b0ff', '#00b0ff');
    await sleep(2500);

    // Chờ cho đến khi Gemini suy nghĩ xong và xuất hiện nút Copy (tối đa 10 phút)
    let maxWaitSeconds = 600;
    let elapsed = 0;
    let finalAnswer = null;

    while (elapsed < maxWaitSeconds) {
      await sleep(1500);
      elapsed += 1.5;

      finalAnswer = getLatestCompletedResponse(initialModelCount);
      if (finalAnswer) {
        console.log('[Anti with Gehihi] Final answer detected! Length:', finalAnswer.length);
        break;
      }

      const lastEl = document.querySelector('model-response:last-of-type');
      const text = lastEl ? (lastEl.innerText || '').trim() : '';

      if (text.includes('Đang suy nghĩ') || text.includes('Thinking')) {
        setStatus(`🟡 Gehihi: Đang suy nghĩ (${Math.round(elapsed)}s)...`, '#e040fb', '#e040fb');
      } else {
        setStatus(`🟡 Gehihi: Đang sinh câu trả lời (${Math.round(elapsed)}s)...`, '#00b0ff', '#00b0ff');
      }
    }

    if (!finalAnswer) {
      const lastEl = document.querySelector('model-response:last-of-type');
      finalAnswer = lastEl ? (lastEl.innerText || '').trim() : 'Không lấy được câu trả lời từ Gemini.';
    }

    setStatus('🟡 Gehihi: Đang gửi kết quả về...', '#b388ff', '#b388ff');
    console.log(`[Anti with Gehihi] Captured response (${finalAnswer.length} chars)`);

    try {
      await apiPost('/api/agent/response', { id, response: finalAnswer });
      setStatus('🟢 Gehihi: Đã gửi về Antigravity!', '#00e676', '#00e676');
    } catch (e) {
      console.error('[Anti with Gehihi] Failed to send response back:', e);
      setStatus('🔴 Gehihi: Lỗi gửi phản hồi', '#ff5252', '#ff5252');
    }

    await sleep(3500);
    setStatus('🟢 Gehihi: Sẵn sàng (Idle)', '#00e676', '#00e676');
    isProcessing = false;
  }

  // --- Main Polling Loop ---
  async function poll() {
    if (!isProcessing) {
      try {
        const res = await apiGet('/api/agent/pending');
        if (res && res.pending) {
          await processPromptTask(res.pending);
        }
      } catch (err) {}
    }
    setTimeout(poll, POLL_INTERVAL_MS);
  }

  setTimeout(poll, 1500);
})();
