const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const chatArea = document.getElementById('chat-area');
const sendBtn = document.getElementById('send-btn');
const themeToggle = document.getElementById('theme-toggle');
const clearBtn = document.getElementById('clear-btn');
const welcomeScreen = document.getElementById('welcome-screen');

let messageHistory = [];
let isLoading = false;

function initTheme() {
  const saved = localStorage.getItem('gemini-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('gemini-theme', next);
}

themeToggle.addEventListener('click', toggleTheme);
initTheme();

clearBtn.addEventListener('click', () => {
  if (isLoading) return;
  messageHistory = [];
  chatBox.innerHTML = '';
  chatBox.innerHTML = `
    <div class="welcome" id="welcome-screen">
      <div class="welcome-card">
        <div class="welcome-emoji">🤖</div>
        <h2>Halo! Saya Gemini AI</h2>
        <p>Asisten AI yang siap membantu menjawab pertanyaan Anda. Pilih topik di bawah atau ketik langsung!</p>
      </div>
      <div class="chips">
        <button class="chip" data-message="Ceritakan tentang dirimu">💬 Ceritakan tentang dirimu</button>
        <button class="chip" data-message="Apa yang bisa kamu lakukan?">🚀 Kemampuanmu?</button>
        <button class="chip" data-message="Jelaskan tentang AI secara sederhana">🧠 Jelaskan AI</button>
      </div>
    </div>
  `;
  bindChips();
});

function bindChips() {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const message = chip.getAttribute('data-message');
      if (message && !isLoading) {
        input.value = message;
        handleSend();
      }
    });
  });
}
bindChips();

form.addEventListener('submit', (e) => {
  e.preventDefault();
  handleSend();
});

async function handleSend() {
  const text = input.value.trim();
  if (!text || isLoading) return;

  const ws = document.getElementById('welcome-screen');
  if (ws) ws.style.display = 'none';

  appendMessage('user', text);
  input.value = '';
  messageHistory.push({ role: 'user', text });

  setLoading(true);
  const typingEl = showTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messageHistory })
    });
    const data = await res.json();
    removeTyping(typingEl);

    if (data.result) {
      appendMessage('bot', data.result);
      messageHistory.push({ role: 'model', text: data.result });
    } else {
      appendMessage('bot', '⚠️ Error: ' + (data.error || 'Terjadi kesalahan.'));
    }
  } catch (err) {
    console.error(err);
    removeTyping(typingEl);
    appendMessage('bot', '⚠️ Gagal menghubungi server.');
  } finally {
    setLoading(false);
  }
}

function parseMarkdown(text) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');

  html = html.replace(/\n/g, '<br>');

  return html;
}

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('copied');
    }, 2000);
  } catch (err) {
    console.error('Gagal menyalin:', err);
  }
}

function appendMessage(sender, text) {
  const row = document.createElement('div');
  row.classList.add('msg-row', sender);

  const avatar = document.createElement('div');
  avatar.classList.add('msg-avatar');
  avatar.textContent = sender === 'user' ? '👤' : '✦';

  const body = document.createElement('div');
  body.classList.add('msg-body');

  const bubble = document.createElement('div');
  bubble.classList.add('msg-bubble');
  if (sender === 'bot') {
    bubble.innerHTML = parseMarkdown(text);
  } else {
    bubble.textContent = text;
  }

  const meta = document.createElement('div');
  meta.classList.add('msg-meta');

  const time = document.createElement('span');
  time.classList.add('msg-time');
  time.textContent = getTime();
  meta.appendChild(time);

  const tools = document.createElement('div');
  tools.classList.add('msg-tools');

  const copyBtn = document.createElement('button');
  copyBtn.classList.add('btn-tool', 'btn-copy');
  copyBtn.title = 'Salin pesan';
  copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  copyBtn.addEventListener('click', () => copyToClipboard(text, copyBtn));
  tools.appendChild(copyBtn);

  if (sender === 'user') {
    const editBtn = document.createElement('button');
    editBtn.classList.add('btn-tool', 'btn-edit');
    editBtn.title = 'Edit pesan';
    editBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    editBtn.addEventListener('click', () => handleEditLastMessage(row, text));
    tools.appendChild(editBtn);
  }

  meta.appendChild(tools);
  body.appendChild(bubble);
  body.appendChild(meta);
  row.appendChild(avatar);
  row.appendChild(body);
  chatBox.appendChild(row);

  if (sender === 'user') updateEditButtons();
  scrollDown();
}

function handleEditLastMessage(msgRow, originalText) {
  if (isLoading) return;

  const bubble = msgRow.querySelector('.msg-bubble');
  const meta = msgRow.querySelector('.msg-meta');
  const originalBubbleHTML = bubble.innerHTML;
  const originalMetaHTML = meta.innerHTML;

  const editArea = document.createElement('textarea');
  editArea.classList.add('edit-textarea');
  editArea.value = originalText;
  bubble.innerHTML = '';
  bubble.appendChild(editArea);
  editArea.focus();

  const actions = document.createElement('div');
  actions.classList.add('edit-actions');

  const cancelBtn = document.createElement('button');
  cancelBtn.classList.add('btn-edit-action', 'btn-cancel');
  cancelBtn.textContent = 'Batal';

  const updateBtn = document.createElement('button');
  updateBtn.classList.add('btn-edit-action', 'btn-update');
  updateBtn.textContent = 'Perbaharui';

  actions.appendChild(cancelBtn);
  actions.appendChild(updateBtn);
  meta.innerHTML = '';
  meta.appendChild(actions);

  cancelBtn.addEventListener('click', () => {
    bubble.innerHTML = '';
    bubble.textContent = originalText;
    meta.innerHTML = originalMetaHTML;

    const newEditBtn = meta.querySelector('.btn-edit');
    if (newEditBtn) {
      newEditBtn.addEventListener('click', () => handleEditLastMessage(msgRow, originalText));
    }

    const newCopyBtn = meta.querySelector('.btn-copy');
    if (newCopyBtn) {
      newCopyBtn.addEventListener('click', () => copyToClipboard(originalText, newCopyBtn));
    }
  });

  updateBtn.addEventListener('click', () => {
    const newText = editArea.value.trim();
    if (!newText) return;

    const allRowsArr = Array.from(chatBox.querySelectorAll('.msg-row'));
    const lastRow = allRowsArr[allRowsArr.length - 1];
    if (lastRow && lastRow.classList.contains('bot')) {
      lastRow.remove();
      messageHistory.pop();
    }

    msgRow.remove();
    messageHistory.pop();

    input.value = newText;
    handleSend();
  });
}

function updateEditButtons() {

  chatBox.querySelectorAll('.msg-row.user .btn-edit').forEach(btn => {
    btn.style.display = 'none';
  });

  const userRows = chatBox.querySelectorAll('.msg-row.user');
  if (userRows.length > 0) {
    const lastEdit = userRows[userRows.length - 1].querySelector('.btn-edit');
    if (lastEdit) lastEdit.style.display = 'inline-flex';
  }
}

function showTyping() {
  const row = document.createElement('div');
  row.classList.add('typing-row');

  const avatar = document.createElement('div');
  avatar.classList.add('msg-avatar');
  avatar.style.background = 'var(--bg-bot-msg)';
  avatar.style.color = 'var(--text-bot-msg)';
  avatar.textContent = '✦';

  const bubble = document.createElement('div');
  bubble.classList.add('typing-bubble');
  bubble.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;

  row.appendChild(avatar);
  row.appendChild(bubble);
  chatBox.appendChild(row);
  scrollDown();
  return row;
}

function removeTyping(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function setLoading(v) {
  isLoading = v;
  sendBtn.disabled = v;
  input.disabled = v;
  if (!v) input.focus();
}

function scrollDown() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

function getTime() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
