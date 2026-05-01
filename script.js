/* =============================================
   ЦИФРОВИЙ ЩОДЕННИК НАСТРОЮ — script.js
   ============================================= */

/* ── CONSTANTS ── */
const STORAGE_KEY = 'mood_diary_entries';

const MOOD_COLORS = {
  5: 'var(--mood-5)',
  4: 'var(--mood-4)',
  3: 'var(--mood-3)',
  2: 'var(--mood-2)',
  1: 'var(--mood-1)',
};

const MOOD_EMOJIS_MAP = {
  5: '🌟',
  4: '😊',
  3: '😐',
  2: '😔',
  1: '😞',
};

/* ── STATE ── */
let selectedMood = null;
let entries = loadEntries();

/* ── DOM REFS ── */
const moodBtns      = document.querySelectorAll('.mood-btn');
const noteSection   = document.getElementById('noteSection');
const noteInput     = document.getElementById('noteInput');
const charCount     = document.getElementById('charCount');
const saveBtn       = document.getElementById('saveBtn');
const entriesList   = document.getElementById('entriesList');
const emptyState    = document.getElementById('emptyState');
const clearBtn      = document.getElementById('clearBtn');
const currentDate   = document.getElementById('currentDate');
const selectedMoodDisplay = document.getElementById('selectedMoodDisplay');
const statTotal     = document.getElementById('statTotal');
const statAvg       = document.getElementById('statAvg');
const statStreak    = document.getElementById('statStreak');
const toast         = document.getElementById('toast');

/* ── INIT ── */
setCurrentDate();
renderEntries();
updateStats();

/* ── DATE HEADER ── */
function setCurrentDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  currentDate.textContent = now.toLocaleDateString('uk-UA', options);
}

/* ── MOOD SELECTION ── */
moodBtns.forEach(btn => {
  const mood = Number(btn.dataset.mood);
  btn.style.setProperty('--mood-color', MOOD_COLORS[mood]);

  btn.addEventListener('click', () => {
    // deselect previous
    moodBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    selectedMood = mood;
    selectedMoodDisplay.textContent = btn.dataset.emoji;

    // show note section
    noteSection.classList.add('visible');
    noteSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
});

/* ── TEXTAREA COUNTER ── */
noteInput.addEventListener('input', () => {
  charCount.textContent = noteInput.value.length;
});

/* ── SAVE ENTRY ── */
saveBtn.addEventListener('click', () => {
  if (!selectedMood) {
    showToast('Спочатку оберіть свій настрій 😊');
    return;
  }

  const note = noteInput.value.trim();
  const now  = new Date();

  const entry = {
    id:        Date.now(),
    mood:      selectedMood,
    emoji:     MOOD_EMOJIS_MAP[selectedMood],
    label:     document.querySelector(`.mood-btn[data-mood="${selectedMood}"]`).dataset.label,
    note:      note,
    date:      now.toISOString(),
    dateStr:   formatDate(now),
    timeStr:   formatTime(now),
  };

  entries.unshift(entry);
  saveEntries();
  renderEntries();
  updateStats();
  resetForm();
  showToast('✓ Запис збережено!');
});

/* ── RESET FORM ── */
function resetForm() {
  selectedMood = null;
  noteInput.value = '';
  charCount.textContent = '0';
  moodBtns.forEach(b => b.classList.remove('active'));
  noteSection.classList.remove('visible');
}

/* ── RENDER ENTRIES ── */
function renderEntries() {
  // Clear non-empty-state content
  const existingCards = entriesList.querySelectorAll('.entry-card');
  existingCards.forEach(c => c.remove());

  if (entries.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';

  entries.forEach(entry => {
    const card = createEntryCard(entry);
    entriesList.appendChild(card);
  });
}

function createEntryCard(entry) {
  const card = document.createElement('div');
  card.className = 'entry-card';
  card.dataset.id = entry.id;
  card.style.setProperty('--mood-color', MOOD_COLORS[entry.mood]);

  card.innerHTML = `
    <div class="entry-top">
      <div class="entry-mood-info">
        <span class="entry-emoji">${entry.emoji}</span>
        <span class="entry-mood-label">${entry.label}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="entry-meta">${entry.dateStr} · ${entry.timeStr}</span>
        <button class="entry-action-btn entry-tts-btn" title="Озвучити запис">🔊</button>
        <button class="entry-delete" data-id="${entry.id}" title="Видалити">✕</button>
      </div>
    </div>
    ${entry.note ? `<p class="entry-note">${escapeHtml(entry.note)}</p>` : ''}
    <div class="tts-wave entry-tts-wave">
      <span></span><span></span><span></span><span></span><span></span>
    </div>
  `;

  card.querySelector('.entry-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteEntry(entry.id, card);
  });

  card.querySelector('.entry-tts-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    speakEntry(entry, card);
  });

  return card;
}

/* ── DELETE ENTRY ── */
function deleteEntry(id, cardEl) {
  cardEl.style.transition = 'opacity 0.3s, transform 0.3s';
  cardEl.style.opacity = '0';
  cardEl.style.transform = 'translateX(-20px)';

  setTimeout(() => {
    entries = entries.filter(e => e.id !== id);
    saveEntries();
    renderEntries();
    updateStats();
    showToast('Запис видалено');
  }, 300);
}

/* ── CLEAR ALL ── */
clearBtn.addEventListener('click', () => {
  if (entries.length === 0) return;
  if (confirm('Видалити всі записи? Це незворотня дія.')) {
    entries = [];
    saveEntries();
    renderEntries();
    updateStats();
    showToast('Всі записи видалено');
  }
});

/* ── STATS ── */
function updateStats() {
  statTotal.textContent = entries.length;

  if (entries.length === 0) {
    statAvg.textContent = '—';
    statStreak.textContent = '0';
    return;
  }

  // Average mood
  const avg = entries.reduce((sum, e) => sum + e.mood, 0) / entries.length;
  statAvg.textContent = avg.toFixed(1);

  // Streak (consecutive distinct days)
  const days = [...new Set(entries.map(e => e.date.slice(0, 10)))].sort().reverse();
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  let expected = today;

  for (const day of days) {
    if (day === expected) {
      streak++;
      const d = new Date(expected);
      d.setDate(d.getDate() - 1);
      expected = d.toISOString().slice(0, 10);
    } else {
      break;
    }
  }

  statStreak.textContent = streak;
}

/* ── STORAGE ── */
function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/* ── TOAST ── */
let toastTimer = null;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ── HELPERS ── */
function formatDate(d) {
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(d) {
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* =============================================
   TTS МІКРОСЕРВІС — озвучення картки запису
   ============================================= */
let ttsVoices = [];
let currentSpeakingCard = null;

function ttsLoadVoices() {
  ttsVoices = speechSynthesis.getVoices();
  const voiceSelect = document.getElementById('tts-voiceSelect');
  if (!voiceSelect) return;
  voiceSelect.innerHTML = '';
  ttsVoices.forEach((voice, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });
}

speechSynthesis.onvoiceschanged = ttsLoadVoices;
ttsLoadVoices();

function pickBestVoice() {
  const priority = ['uk', 'pl', 'cs'];
  for (const lang of priority) {
    const found = ttsVoices.find(v => v.lang.toLowerCase().startsWith(lang));
    if (found) return found;
  }
  return ttsVoices[0] || null;
}

function speakEntry(entry, card) {
  const wave = card.querySelector('.entry-tts-wave');
  const btn = card.querySelector('.entry-tts-btn');

  // If already speaking this card — stop
  if (currentSpeakingCard === card) {
    speechSynthesis.cancel();
    wave.classList.remove('active');
    btn.textContent = '🔊';
    currentSpeakingCard = null;
    return;
  }

  // Stop any other speaking
  speechSynthesis.cancel();
  if (currentSpeakingCard) {
    currentSpeakingCard.querySelector('.entry-tts-wave')?.classList.remove('active');
    currentSpeakingCard.querySelector('.entry-tts-btn').textContent = '🔊';
  }

  const text = `Настрій: ${entry.label}. ${entry.note ? entry.note : ''}`;
  const utterance = new SpeechSynthesisUtterance(text);

  const voice = pickBestVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  utterance.rate = 1;

  utterance.onstart = () => {
    wave.classList.add('active');
    btn.textContent = '⏹';
    currentSpeakingCard = card;
  };

  utterance.onend = () => {
    wave.classList.remove('active');
    btn.textContent = '🔊';
    currentSpeakingCard = null;
  };

  speechSynthesis.speak(utterance);
}

/* =============================================
   QR МІКРОСЕРВІС
   ============================================= */
function generateQR() {
  const text = document.getElementById('qrText').value.trim();
  const color = document.getElementById('qrColor').value.replace('#', '');
  const qrBox = document.getElementById('qrBox');
  const qrImage = document.getElementById('qrImage');

  if (text === '') {
    alert('Будь ласка, введіть текст або посилання');
    return;
  }

  const apiURL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}&color=${color}`;
  qrImage.src = apiURL;
  qrBox.classList.add('visible');
}

function downloadQR() {
  const qrImage = document.getElementById('qrImage');
  if (!qrImage.src) {
    alert('Спочатку згенеруйте QR-код!');
    return;
  }
  const link = document.createElement('a');
  link.href = qrImage.src;
  link.download = 'qr-code.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}