const timerEl = document.getElementById('timer');
const timerRing = document.getElementById('timerRing');
const timerLabel = document.getElementById('timerLabel');
const timerStatus = document.getElementById('timerStatus');
const startBtn = document.getElementById('startBtn');
const startText = document.getElementById('startText');
const resetBtn = document.getElementById('resetBtn');
const taskInput = document.getElementById('taskInput');
const modeButtons = [...document.querySelectorAll('.mode-button')];
const themeBtn = document.getElementById('themeBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const focusMinutes = document.getElementById('focusMinutes');
const shortMinutes = document.getElementById('shortMinutes');
const longMinutes = document.getElementById('longMinutes');
const autoStartToggle = document.getElementById('autoStartToggle');
const sessionCountEl = document.getElementById('sessionCount');
const toast = document.getElementById('toast');

const defaults = { focus: 25, short: 5, long: 15, autoStart: false };
const labels = {
  focus: ['Focus session', 'Start focus'],
  short: ['Short break', 'Start break'],
  long: ['Long break', 'Start break']
};

let settings = loadSettings();
let currentMode = 'focus';
let totalSeconds = settings.focus * 60;
let remainingSeconds = totalSeconds;
let isRunning = false;
let timerId = null;
let endAt = null;
let toastId = null;

function loadSettings() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem('focus-room-settings') || '{}') };
  } catch {
    return { ...defaults };
  }
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodaySessions() {
  const saved = JSON.parse(localStorage.getItem('focus-room-sessions') || '{}');
  return saved[todayKey()] || 0;
}

function addSession() {
  const saved = JSON.parse(localStorage.getItem('focus-room-sessions') || '{}');
  const key = todayKey();
  saved[key] = (saved[key] || 0) + 1;
  localStorage.setItem('focus-room-sessions', JSON.stringify(saved));
  sessionCountEl.textContent = saved[key];
}

function renderTimer() {
  timerEl.textContent = formatTime(remainingSeconds);
  const elapsed = totalSeconds - remainingSeconds;
  const progress = totalSeconds ? Math.min(360, Math.max(0, (elapsed / totalSeconds) * 360)) : 0;
  timerRing.style.setProperty('--progress', `${progress}deg`);
  document.title = isRunning ? `${formatTime(remainingSeconds)} — Focus Room` : 'Focus Room — Your space to focus';
}

function setRunningUI(running) {
  document.body.classList.toggle('is-focusing', running && currentMode === 'focus');
  startBtn.classList.toggle('is-running', running);
  startText.textContent = running ? 'Pause' : labels[currentMode][1];
  timerStatus.textContent = running
    ? (currentMode === 'focus' ? 'Stay with one thing' : 'Take a real pause')
    : 'Ready when you are';
}

function tick() {
  if (!isRunning || !endAt) return;
  remainingSeconds = Math.max(0, (endAt - Date.now()) / 1000);
  renderTimer();

  if (remainingSeconds <= 0) completeSession();
}

function startTimer() {
  if (isRunning) {
    pauseTimer();
    return;
  }

  if (remainingSeconds <= 0) resetTimer();
  isRunning = true;
  endAt = Date.now() + remainingSeconds * 1000;
  setRunningUI(true);
  tick();
  timerId = setInterval(tick, 250);
}

function pauseTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
  if (isRunning && endAt) remainingSeconds = Math.max(0, (endAt - Date.now()) / 1000);
  endAt = null;
  isRunning = false;
  setRunningUI(false);
  renderTimer();
}

function resetTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
  endAt = null;
  isRunning = false;
  totalSeconds = settings[currentMode] * 60;
  remainingSeconds = totalSeconds;
  setRunningUI(false);
  renderTimer();
}

function completeSession() {
  if (timerId) clearInterval(timerId);
  timerId = null;
  endAt = null;
  isRunning = false;
  remainingSeconds = 0;
  setRunningUI(false);
  renderTimer();

  document.body.classList.add('session-complete');
  setTimeout(() => document.body.classList.remove('session-complete'), 900);

  if (currentMode === 'focus') {
    addSession();
    showToast(`${settings.focus} minutes focused. Nice work.`);
    if (settings.autoStart) {
      setMode('short');
      setTimeout(startTimer, 700);
    }
  } else {
    showToast('Break complete. Ready for another round?');
  }
}

function setMode(mode) {
  currentMode = mode;
  modeButtons.forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  timerLabel.textContent = labels[mode][0];
  resetTimer();
}

function showToast(message) {
  clearTimeout(toastId);
  toast.textContent = message;
  toast.classList.add('show');
  toastId = setTimeout(() => toast.classList.remove('show'), 3000);
}

function toggleTheme() {
  const next = document.body.dataset.theme === 'night' ? 'day' : 'night';
  document.body.dataset.theme = next;
  localStorage.setItem('focus-room-theme', next);
  themeBtn.setAttribute('aria-label', `Switch to ${next === 'night' ? 'day' : 'night'} ambience`);
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    showToast('Fullscreen is not available in this browser.');
  }
}

function openSettings() {
  focusMinutes.value = settings.focus;
  shortMinutes.value = settings.short;
  longMinutes.value = settings.long;
  autoStartToggle.checked = settings.autoStart;
  settingsPanel.classList.add('open');
  settingsPanel.setAttribute('aria-hidden', 'false');
  closeSettingsBtn.focus();
}

function closeSettings() {
  settingsPanel.classList.remove('open');
  settingsPanel.setAttribute('aria-hidden', 'true');
  settingsBtn.focus();
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || min, min), max);
}

function saveSettings() {
  settings = {
    focus: clamp(focusMinutes.value, 1, 120),
    short: clamp(shortMinutes.value, 1, 60),
    long: clamp(longMinutes.value, 1, 90),
    autoStart: autoStartToggle.checked
  };
  localStorage.setItem('focus-room-settings', JSON.stringify(settings));
  closeSettings();
  resetTimer();
  showToast('Timer settings saved');
}

modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimer);
themeBtn.addEventListener('click', toggleTheme);
fullscreenBtn.addEventListener('click', toggleFullscreen);
settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
saveSettingsBtn.addEventListener('click', saveSettings);
settingsPanel.addEventListener('click', event => {
  if (event.target === settingsPanel) closeSettings();
});

taskInput.addEventListener('input', () => {
  localStorage.setItem('focus-room-task', taskInput.value);
});

window.addEventListener('keydown', event => {
  const typing = document.activeElement === taskInput || document.activeElement?.tagName === 'INPUT';
  const settingsOpen = settingsPanel.classList.contains('open');

  if (event.code === 'Space' && !typing && !settingsOpen) {
    event.preventDefault();
    startTimer();
  }
  if ((event.key === 'r' || event.key === 'R') && !typing && !settingsOpen) resetTimer();
  if ((event.key === 'f' || event.key === 'F') && !typing && !settingsOpen) toggleFullscreen();
  if (event.key === 'Escape' && settingsOpen) closeSettings();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && isRunning) tick();
});

(function init() {
  const savedTheme = localStorage.getItem('focus-room-theme');
  if (savedTheme === 'day' || savedTheme === 'night') document.body.dataset.theme = savedTheme;
  taskInput.value = localStorage.getItem('focus-room-task') || '';
  sessionCountEl.textContent = getTodaySessions();
  timerLabel.textContent = labels[currentMode][0];
  renderTimer();
})();
