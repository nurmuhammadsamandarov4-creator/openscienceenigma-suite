const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'server', 'public', 'script.js');
let text = fs.readFileSync(p, 'utf8');
const index = text.indexOf('// AI Chat Widget Logic');
if (index !== -1) {
    text = text.substring(0, index);
}

const aiChatCode = `
// ==========================================
// AI Chat Widget Logic (Global & Dynamic)
// ==========================================
(function initAIChat() {
  // Prevent duplicate injection
  if (document.getElementById('aiChatWidget')) return;

  const widgetHtml = \`
<div id="aiChatWidget" class="fixed bottom-6 right-6 z-50 flex flex-col items-end" style="font-family: 'Plus Jakarta Sans', sans-serif;">
  <div id="aiChatWindow" class="hidden w-[340px] max-w-[calc(100vw-2rem)] h-[450px] max-h-[calc(100vh-6rem)] bg-white/95 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-2xl flex-col overflow-hidden transition-all duration-300 mb-4 transform scale-95 opacity-0">
    <div class="flex items-center justify-between px-4 py-3 bg-orange-50 border-b border-orange-100">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
        <h3 class="font-semibold text-gray-800 text-sm tracking-tight">AI Support Assistant</h3>
      </div>
      <button id="aiChatClose" class="text-gray-400 hover:text-gray-700 transition-colors" aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div id="aiChatMessages" class="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50 text-sm">
      <div class="flex gap-2">
        <div class="w-7 h-7 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg class="w-3.5 h-3.5 text-orange-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        </div>
        <div class="bg-white border border-gray-100 text-gray-700 px-3.5 py-2.5 rounded-2xl rounded-tl-sm shadow-sm leading-relaxed">
          Hello! How can I assist you today?
        </div>
      </div>
    </div>
    <form id="aiChatForm" class="p-3 bg-white border-t border-gray-100 flex gap-2">
      <input type="text" id="aiChatInput" placeholder="Type your message..." class="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all" autocomplete="off" />
      <button type="submit" id="aiChatSubmitBtn" class="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition-colors flex-shrink-0 disabled:opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
      </button>
    </form>
  </div>
  
  <button id="aiChatToggle" class="w-14 h-14 bg-gradient-to-tr from-orange-600 to-orange-400 text-white rounded-full shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all flex items-center justify-center relative group" aria-label="Open AI Assistant">
    <div class="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-20"></div>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="relative z-10"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
  </button>
</div>
  \`;

  document.body.insertAdjacentHTML('beforeend', widgetHtml);

  const toggleBtn = document.getElementById('aiChatToggle');
  const chatWindow = document.getElementById('aiChatWindow');
  const closeBtn = document.getElementById('aiChatClose');
  const chatForm = document.getElementById('aiChatForm');
  const chatInput = document.getElementById('aiChatInput');
  const messagesContainer = document.getElementById('aiChatMessages');
  const submitBtn = document.getElementById('aiChatSubmitBtn');

  function toggleChat() {
    const isHidden = chatWindow.classList.contains('hidden');
    if (isHidden) {
      chatWindow.classList.remove('hidden');
      setTimeout(() => {
        chatWindow.classList.remove('scale-95', 'opacity-0');
        chatWindow.classList.add('scale-100', 'opacity-100');
        chatInput.focus();
      }, 10);
    } else {
      chatWindow.classList.remove('scale-100', 'opacity-100');
      chatWindow.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        chatWindow.classList.add('hidden');
      }, 300);
    }
  }

  toggleBtn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  function appendMessage(text, isUser = false) {
    const wrapper = document.createElement('div');
    wrapper.className = isUser ? 'flex gap-2 justify-end' : 'flex gap-2';

    let iconHtml = '';
    if (!isUser) {
      iconHtml = \`
        <div class="w-7 h-7 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <svg class="w-3.5 h-3.5 text-orange-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        </div>
      \`;
    }

    const bubbleClasses = isUser 
      ? 'bg-gradient-to-tr from-orange-600 to-orange-500 text-white px-3.5 py-2.5 rounded-2xl rounded-tr-sm shadow-sm leading-relaxed max-w-[85%]'
      : 'bg-white border border-gray-100 text-gray-700 px-3.5 py-2.5 rounded-2xl rounded-tl-sm shadow-md leading-relaxed max-w-[85%]';

    wrapper.innerHTML = \`
      \${!isUser ? iconHtml : ''}
      <div class="\${bubbleClasses}">
        \${escapeHtml(text)}
      </div>
    \`;

    messagesContainer.appendChild(wrapper);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function appendTypingIndicator() {
    const id = 'typing-' + Date.now();
    const wrapper = document.createElement('div');
    wrapper.id = id;
    wrapper.className = 'flex gap-2';
    wrapper.innerHTML = \`
      <div class="w-7 h-7 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
        <svg class="w-3.5 h-3.5 text-orange-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
      </div>
      <div class="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-md flex items-center gap-1">
        <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
        <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
        <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
      </div>
    \`;
    messagesContainer.appendChild(wrapper);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return id;
  }

  function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage(text, true);
    chatInput.value = '';
    submitBtn.disabled = true;

    const typingId = appendTypingIndicator();

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text })
      });
      const data = await res.json();
      removeTypingIndicator(typingId);
      if (data.error) {
        appendMessage('Sorry, an error occurred: ' + data.error);
      } else {
        appendMessage(data.answer || 'I could not generate a response.');
      }
    } catch (err) {
      removeTypingIndicator(typingId);
      appendMessage('Sorry, I am unable to connect to the server right now.');
    } finally {
      submitBtn.disabled = false;
      chatInput.focus();
    }
  });
})();
`;

fs.writeFileSync(p, text + '\n' + aiChatCode, 'utf8');
