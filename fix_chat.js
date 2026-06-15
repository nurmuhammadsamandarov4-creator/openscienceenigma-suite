const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'server', 'public', 'script.js');
let text = fs.readFileSync(p, 'utf8');

const index = text.indexOf('// ==========================================');
if (index !== -1) {
    text = text.substring(0, index);
}

const aiChatCode = `
// ==========================================
// AI Chat Widget Logic (Pure CSS Global)
// ==========================================
(function initAIChat() {
  if (document.getElementById('ose-ai-widget')) return;

  const styleHtml = \`
    <style>
      #ose-ai-widget {
        position: fixed;
        bottom: 30px;
        right: 30px;
        z-index: 999999;
        font-family: 'Plus Jakarta Sans', sans-serif;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        pointer-events: none;
      }

      /* Chat Toggle Button */
      .ose-ai-btn {
        background: linear-gradient(135deg, #f97316, #ea580c);
        color: white;
        border: none;
        border-radius: 999px;
        padding: 14px 24px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 10px 25px rgba(234, 88, 12, 0.4);
        transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        position: relative;
        overflow: hidden;
        pointer-events: auto;
      }
      .ose-ai-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 35px rgba(234, 88, 12, 0.5);
      }
      .ose-ai-btn::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transition: left 0.7s ease;
      }
      .ose-ai-btn:hover::before {
        left: 100%;
      }

      /* Chat Window */
      .ose-ai-window {
        width: 360px;
        max-width: calc(100vw - 40px);
        height: 500px;
        max-height: calc(100vh - 100px);
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: 0 20px 50px rgba(0,0,0,0.15);
        border-radius: 24px;
        margin-bottom: 20px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        
        /* Animation */
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        transform-origin: bottom right;
      }
      .ose-ai-window.is-open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      /* Header */
      .ose-ai-header {
        background: #fff;
        border-bottom: 1px solid rgba(0,0,0,0.05);
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .ose-ai-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .ose-ai-avatar {
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #fff8f1, #ffeade);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(249, 115, 22, 0.2);
      }
      .ose-ai-avatar svg {
        width: 18px; height: 18px;
        color: #ea580c;
      }
      .ose-ai-title {
        font-weight: 700;
        font-size: 15px;
        color: #0f172a;
        margin: 0;
        line-height: 1.2;
      }
      .ose-ai-status {
        font-size: 12px;
        color: #10b981;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .ose-ai-dot {
        width: 6px; height: 6px;
        background: #10b981;
        border-radius: 50%;
        animation: ose-pulse 2s infinite;
      }
      .ose-ai-close {
        background: none; border: none;
        color: #94a3b8; cursor: pointer;
        transition: color 0.2s;
        padding: 4px;
      }
      .ose-ai-close:hover { color: #0f172a; }

      /* Messages Area */
      .ose-ai-messages {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        background: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* Bubbles */
      .ose-msg-row {
        display: flex;
        flex-direction: column;
      }
      .ose-msg-row.ai { align-items: flex-start; }
      .ose-msg-row.user { align-items: flex-end; }

      .ose-msg-bubble {
        max-width: 85%;
        padding: 12px 16px;
        font-size: 14px;
        line-height: 1.5;
        box-shadow: 0 2px 5px rgba(0,0,0,0.02);
      }
      .ose-msg-row.ai .ose-msg-bubble {
        background: #ffffff;
        color: #334155;
        border: 1px solid rgba(0,0,0,0.04);
        border-radius: 20px 20px 20px 4px;
      }
      .ose-msg-row.user .ose-msg-bubble {
        background: linear-gradient(135deg, #f97316, #ea580c);
        color: #ffffff;
        border-radius: 20px 20px 4px 20px;
      }

      /* Input Area */
      .ose-ai-input-area {
        background: #fff;
        padding: 16px;
        border-top: 1px solid rgba(0,0,0,0.05);
      }
      .ose-ai-form {
        display: flex;
        gap: 8px;
        align-items: center;
        background: #f1f5f9;
        padding: 6px;
        border-radius: 999px;
        border: 1px solid transparent;
        transition: border-color 0.2s;
      }
      .ose-ai-form:focus-within {
        border-color: rgba(249, 115, 22, 0.4);
        background: #fff;
      }
      .ose-ai-input {
        flex: 1;
        border: none;
        background: transparent;
        padding: 8px 12px;
        font-size: 14px;
        outline: none;
        color: #0f172a;
      }
      .ose-ai-input::placeholder { color: #94a3b8; }
      .ose-ai-submit {
        background: #ea580c;
        color: #fff;
        border: none;
        border-radius: 50%;
        width: 36px; height: 36px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: background 0.2s;
      }
      .ose-ai-submit:hover { background: #c2410c; }
      .ose-ai-submit:disabled { opacity: 0.5; cursor: not-allowed; }

      /* Typing indicator */
      .ose-typing {
        display: flex; gap: 4px;
        padding: 6px 4px;
      }
      .ose-typing-dot {
        width: 6px; height: 6px;
        background: #cbd5e1;
        border-radius: 50%;
        animation: ose-bounce 1.4s infinite ease-in-out both;
      }
      .ose-typing-dot:nth-child(1) { animation-delay: -0.32s; }
      .ose-typing-dot:nth-child(2) { animation-delay: -0.16s; }

      @keyframes ose-pulse {
        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
        70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }
      @keyframes ose-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      @media (max-width: 600px) {
        #ose-ai-widget { bottom: 20px; right: 20px; }
        .ose-ai-window { width: calc(100vw - 40px); height: 60vh; }
        .ose-ai-btn span { display: none; }
        .ose-ai-btn { padding: 14px; }
      }
    </style>
  \`;

  const widgetHtml = \`
    <div id="ose-ai-widget">
      <div id="ose-ai-window" class="ose-ai-window">
        <div class="ose-ai-header">
          <div class="ose-ai-header-left">
            <div class="ose-ai-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            </div>
            <div>
              <h3 class="ose-ai-title">AI Support Assistant</h3>
              <div class="ose-ai-status">
                <div class="ose-ai-dot"></div> Online
              </div>
            </div>
          </div>
          <button id="ose-ai-close" class="ose-ai-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div id="ose-ai-messages" class="ose-ai-messages">
          <div class="ose-msg-row ai">
            <div class="ose-msg-bubble">Hello! Welcome to OpenScienceEnigma. How can I help you today?</div>
          </div>
        </div>
        <div class="ose-ai-input-area">
          <form id="ose-ai-form" class="ose-ai-form">
            <input type="text" id="ose-ai-input" class="ose-ai-input" placeholder="Type your message..." autocomplete="off">
            <button type="submit" id="ose-ai-submit" class="ose-ai-submit">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
        </div>
      </div>
      <button id="ose-ai-toggle" class="ose-ai-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <span>AI Support</span>
      </button>
    </div>
  \`;

  document.body.insertAdjacentHTML('beforeend', styleHtml + widgetHtml);

  const toggleBtn = document.getElementById('ose-ai-toggle');
  const chatWindow = document.getElementById('ose-ai-window');
  const closeBtn = document.getElementById('ose-ai-close');
  const form = document.getElementById('ose-ai-form');
  const input = document.getElementById('ose-ai-input');
  const messages = document.getElementById('ose-ai-messages');
  const submitBtn = document.getElementById('ose-ai-submit');

  function toggle() {
    chatWindow.classList.toggle('is-open');
    if (chatWindow.classList.contains('is-open')) input.focus();
  }

  toggleBtn.addEventListener('click', toggle);
  closeBtn.addEventListener('click', toggle);

  function addMessage(text, isUser = false) {
    const row = document.createElement('div');
    row.className = 'ose-msg-row ' + (isUser ? 'user' : 'ai');
    row.innerHTML = \`<div class="ose-msg-bubble">\${escapeHtml(text)}</div>\`;
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function addTyping() {
    const id = 'typ-' + Date.now();
    const row = document.createElement('div');
    row.id = id;
    row.className = 'ose-msg-row ai';
    row.innerHTML = \`
      <div class="ose-msg-bubble">
        <div class="ose-typing">
          <div class="ose-typing-dot"></div>
          <div class="ose-typing-dot"></div>
          <div class="ose-typing-dot"></div>
        </div>
      </div>
    \`;
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return id;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, true);
    input.value = '';
    submitBtn.disabled = true;

    const typId = addTyping();

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text })
      });
      const data = await res.json();
      document.getElementById(typId)?.remove();
      if (data.error) addMessage(data.error);
      else addMessage(data.answer || 'Something went wrong.');
    } catch (err) {
      document.getElementById(typId)?.remove();
      addMessage('Network error. Try again.');
    } finally {
      submitBtn.disabled = false;
      input.focus();
    }
  });

  // Escape HTML helper if not exists
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }
})();
`;

fs.writeFileSync(p, text + '\n' + aiChatCode, 'utf8');
