const STORAGE_STEPS = 'emojiTimerSteps';
const STORAGE_ELAPSED = 'emojiTimerInitialElapsed';
const STORAGE_SIZE = 'emojiTimerSize';

let DIRTY = false;
let SUPPRESS_AUTOSAVE = false; // evita autosave de blur durante operações como reset/add

/** Defaults **/
const DEFAULT_STEPS = [
  { t: 0, emoji: '🏆' },        // 0min
  { t: 900, emoji: '🙂' },      // 15min
  { t: 1500, emoji: '😐' },     // 25min
  { t: 1800, emoji: '🤨' },     // 30min
  { t: 2400, emoji: '😠' },     // 40min
  { t: 3000, emoji: '😡' },     // 50min
  { t: 3300, emoji: '🤯' },     // 55min
  { t: 3600, emoji: '😴' },     // 60min
];
const DEFAULT_SIZE = 'lg'; // sm | lg

/** DOM helpers **/
function el(tag, props = {}, children = []) {
  const n = document.createElement(tag);
  Object.assign(n, props);
  (Array.isArray(children) ? children : [children]).forEach((c) =>
    c && n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
  );
  return n;
}

/** "Reset configs" button **/
function showResetLink(show) {
  // Always show the reset configs button
  const resetBtn = document.getElementById('resetConfigs');
  if (resetBtn) {
    resetBtn.style.display = 'block';
  }
}

/** Save button state + flash **/
function setDirty(v) {
  DIRTY = !!v;
  const btn = document.getElementById('saveBtn');
  if (btn) btn.disabled = !DIRTY;
}
let savedFlashTimer = null;
function flashSaved() {
  const btn = document.getElementById('saveBtn');
  if (!btn) return;
  if (savedFlashTimer) clearTimeout(savedFlashTimer);
  btn.textContent = 'Saved!';
  savedFlashTimer = setTimeout(() => {
    btn.textContent = 'Save';
    savedFlashTimer = null;
  }, 2000);
}

/** Chrome helpers **/
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}
async function runOnActiveTab(fn, args = {}) {
  const tab = await getActiveTab();
  if (!tab?.id) return { result: undefined };
  const [res] = await chrome.scripting
    .executeScript({ target: { tabId: tab.id }, func: fn, args: [args], world: 'MAIN' })
    .catch((err) => {
      console.error('executeScript error:', err);
      return [{}];
    });
  return res || { result: undefined };
}

/** ===== Injected into page ===== **/
function _isTimerVisible() {
  return Boolean(window.__emojiTimerState?.host?.isConnected);
}

// aplica estilos conforme tamanho
function _applySize({ sizeKey }) {
  if (!window.__emojiTimerState?.host?.isConnected) return false;
  const sz = (sizeKey && ({ sm: 1, lg: 1 }[sizeKey])) ? sizeKey : 'sm';
  const presets = {
    sm: { fontSize: 14, padding: '8px 10px', emoji: 12, timeMinWidth: 43 },
    lg: { fontSize: 25, padding: '12px 14px', emoji: 26, timeMinWidth: 78 },
  };
  const preset = presets[sz];
  const { wrapper, emojiEl, timeEl } = window.__emojiTimerState.refs || {};
  if (!wrapper || !emojiEl || !timeEl) return false;
  wrapper.style.fontSize = `${preset.fontSize}px`;
  wrapper.style.padding = preset.padding;
  emojiEl.style.fontSize = `${preset.emoji}px`;
  timeEl.style.minWidth = `${preset.timeMinWidth}px`;
  window.__emojiTimerState.sizeKey = sz;
  return true;
}

function _toggleTimer({ steps, initialElapsedSec = 0, sizeKey = 'sm' }) {
  function sanitize(list) {
    const out = (Array.isArray(list) ? list : [])
      .map((s) => ({ t: Number(s.t) || 0, emoji: String(s.emoji || '').trim() }))
      .filter((s) => s.emoji.length > 0 && s.t >= 0)
      .sort((a, b) => a.t - b.t);
    if (out.length === 0) out.push({ t: 0, emoji: '🏆' });
    return out;
  }
  if (window.__emojiTimerState?.host?.isConnected) {
    try { clearInterval(window.__emojiTimerState.timerId); } catch {}
    try { cancelAnimationFrame(window.__emojiTimerState.rafId); } catch {}
    try { window.__emojiTimerState.host.remove(); } catch {}
    window.__emojiTimerState = null;
    return false;
  }

  const parsed = sanitize(steps);
  const initElapsed = Math.max(0, Number(initialElapsedSec) || 0);

  const host = document.createElement('div');
  host.id = 'emoji-timer-host';
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.top = '10px';
  host.style.right = '10px';
  host.style.zIndex = '2147483647';
  host.style.userSelect = 'none';
  host.style.contain = 'content';

  const shadow = host.attachShadow({ mode: 'open' });
  const wrapper = document.createElement('div');
  wrapper.style.display = 'inline-flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '8px';
  wrapper.style.borderRadius = '12px';
  wrapper.style.border = '1px solid #273656';
  wrapper.style.background = 'rgba(17, 24, 39, 0.9)';
  wrapper.style.color = '#fff';
  wrapper.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';
  wrapper.style.lineHeight = '1';
  wrapper.style.fontFamily =
    'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  wrapper.style.backdropFilter = 'blur(6px)';
  wrapper.style.webkitBackdropFilter = 'blur(6px)';
  wrapper.style.cursor = 'grab';

  const emojiEl = document.createElement('span');
  const timeEl = document.createElement('span');
  timeEl.style.fontVariantNumeric = 'tabular-nums';
  timeEl.style.textAlign = 'right';

  // Aplica tamanho baseado no sizeKey passado
  const presets = {
    sm: { fontSize: 14, padding: '8px 10px', emoji: 12, timeMinWidth: 43 },
    lg: { fontSize: 25, padding: '12px 14px', emoji: 26, timeMinWidth: 78 },
  };
  const sz = (sizeKey && ({ sm: 1, lg: 1 }[sizeKey])) ? sizeKey : 'sm';
  const preset = presets[sz];
  wrapper.style.fontSize = `${preset.fontSize}px`;
  wrapper.style.padding = preset.padding;
  emojiEl.style.fontSize = `${preset.emoji}px`;
  timeEl.style.minWidth = `${preset.timeMinWidth}px`;

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.textContent = '↺';
  resetBtn.title = 'Reset';
  Object.assign(resetBtn.style, {
    all: 'unset',
    fontSize: '14px',
    opacity: '0.85',
    padding: '2px 4px',
    cursor: 'pointer',
  });
  resetBtn.addEventListener('mouseenter', () => (resetBtn.style.opacity = '1'));
  resetBtn.addEventListener('mouseleave', () => (resetBtn.style.opacity = '0.85'));

  // Close (✕)
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '✕';
  closeBtn.title = 'Close';
  Object.assign(closeBtn.style, {
    all: 'unset',
    fontSize: '14px',
    opacity: '0.85',
    padding: '2px 4px',
    cursor: 'pointer',
  });
  closeBtn.addEventListener('mouseenter', () => (closeBtn.style.opacity = '1'));
  closeBtn.addEventListener('mouseleave', () => (closeBtn.style.opacity = '0.85'));

  wrapper.append(emojiEl, timeEl, resetBtn, closeBtn);
  shadow.appendChild(wrapper);
  document.documentElement.appendChild(host);

  (function enableDrag(h) {
    let dragging = false;
    let sx = 0, sy = 0, startTop = 0, startRight = 0;
    h.addEventListener('mousedown', (e) => {
      dragging = true;
      h.style.cursor = 'grabbing';
      sx = e.clientX; sy = e.clientY;
      startTop = parseInt(h.style.top, 10) || 10;
      startRight = parseInt(h.style.right, 10) || 10;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp, { once: true });
      e.preventDefault();
    });
    function onMove(e) {
      if (!dragging) return;
      const dy = e.clientY - sy;
      const dx = e.clientX - sx;
      h.style.top = `${Math.max(0, startTop + dy)}px`;
      h.style.right = `${Math.max(0, startRight - dx)}px`;
    }
    function onUp() {
      dragging = false;
      h.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMove);
    }
  })(host);

  function pad(n) { return n < 10 ? `0${n}` : `${n}`; }
  function fmt(sec) { const m = Math.floor(sec / 60); const s = sec % 60; return `${pad(m)}:${pad(s)}`; }
  function currentEmoji(sec) {
    const list = window.__emojiTimerState.steps;
    let chosen = list[0].emoji;
    for (let i = 0; i < list.length; i++) {
      if (sec >= list[i].t) chosen = list[i].emoji; else break;
    }
    return chosen;
  }

  window.__emojiTimerState = {
    startSec: Math.floor(Date.now() / 1000) - initElapsed,
    timerId: 0,
    rafId: 0, // fallback rAF
    host,
    steps: parsed,
    sizeKey,
    refs: { wrapper, emojiEl, timeEl },
  };

  function updateTick() {
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - window.__emojiTimerState.startSec;
    timeEl.textContent = fmt(elapsed);
    emojiEl.textContent = currentEmoji(elapsed);
  }
  function reset() {
    window.__emojiTimerState.startSec = Math.floor(Date.now() / 1000);
    updateTick();
  }
  function closeTimer() {
    try { clearInterval(window.__emojiTimerState.timerId); } catch {}
    try { cancelAnimationFrame(window.__emojiTimerState.rafId); } catch {}
    try { window.__emojiTimerState.host.remove(); } catch {}
    window.__emojiTimerState = null;
  }
  resetBtn.addEventListener('click', reset);
  closeBtn.addEventListener('click', closeTimer);

  // inicia o relógio com setInterval estável
  window.__emojiTimerState.timerId = setInterval(updateTick, 1000);
  
  // atualiza o display inicial após o timer estar rodando
  updateTick();
  
  // tamanho já foi aplicado diretamente na criação dos elementos

  // watchdog: se o setInterval não avançar em ~1.5s, liga rAF fallback
  (function startWatchdog() {
    const last = timeEl.textContent;
    setTimeout(() => {
      if (!window.__emojiTimerState) return;
      const still = timeEl.textContent === last;
      if (still) {
        const rafLoop = () => {
          if (!window.__emojiTimerState) return;
          updateTick();
          window.__emojiTimerState.rafId = requestAnimationFrame(rafLoop);
        };
        window.__emojiTimerState.rafId = requestAnimationFrame(rafLoop);
      }
    }, 1500);
  })();

  return true;
}
function _resetTimer() {
  if (window.__emojiTimerState?.host?.isConnected) {
    window.__emojiTimerState.startSec = Math.floor(Date.now() / 1000);
    return true;
  }
  return false;
}
function _applySteps({ steps }) {
  if (!window.__emojiTimerState?.host?.isConnected) return false;
  function sanitize(list) {
    const out = (Array.isArray(list) ? list : [])
      .map((s) => ({ t: Number(s.t) || 0, emoji: String(s.emoji || '').trim() }))
      .filter((s) => s.emoji.length > 0 && s.t >= 0)
      .sort((a, b) => a.t - b.t);
    if (out.length === 0) out.push({ t: 0, emoji: '🏆' });
    return out;
  }
  window.__emojiTimerState.steps = sanitize(steps);
  return true;
}
function _setElapsed({ seconds }) {
  if (!window.__emojiTimerState?.host?.isConnected) return false;
  const sec = Math.max(0, Number(seconds) || 0);
  window.__emojiTimerState.startSec = Math.floor(Date.now() / 1000) - sec;
  return true;
}
// get current elapsed seconds from page
function _getElapsed() {
  if (!window.__emojiTimerState?.host?.isConnected) return null;
  const now = Math.floor(Date.now() / 1000);
  return now - window.__emojiTimerState.startSec;
}

/** Helpers **/
function mmssToSec(mmss) {
  const s = (mmss || '').trim();
  if (!s) return 0;
  const parts = s.split(':').map((p) => p.trim());
  if (parts.length === 1) return Math.max(0, parseInt(parts[0], 10) || 0);
  const m = Math.max(0, parseInt(parts[0], 10) || 0);
  const sec = Math.max(0, parseInt(parts[1], 10) || 0);
  return m * 60 + sec;
}
function secToMmss(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(m)}:${pad(s)}`;
}
function sanitizeAndSort(steps) {
  const s = (Array.isArray(steps) ? steps : [])
    .map((x) => ({ t: Number(x.t) || 0, emoji: String(x.emoji || '').trim() }))
    .filter((x) => x.emoji.length > 0 && x.t >= 0)
    .sort((a, b) => a.t - b.t);
  if (s.length === 0) s.push({ t: 0, emoji: '🏆' });
  return s;
}

/** Steps equality (normalized) para decidir mostrar "Reset configs" **/
function normSteps(arr) {
  return sanitizeAndSort(arr).map((s) => ({ t: Number(s.t) || 0, emoji: String(s.emoji || '') }));
}
function stepsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].t !== b[i].t || a[i].emoji !== b[i].emoji) return false;
  }
  return true;
}
function updateResetLink(currentSteps) {
  const isDefault = stepsEqual(normSteps(currentSteps), normSteps(DEFAULT_STEPS));
  showResetLink(!isDefault);
}

/** Storage **/
async function loadSteps() {
  const data = await chrome.storage.sync.get([STORAGE_STEPS]);
  const steps = Array.isArray(data[STORAGE_STEPS]) ? data[STORAGE_STEPS] : DEFAULT_STEPS.slice();
  return sanitizeAndSort(steps);
}
async function saveSteps(steps) {
  const payload = sanitizeAndSort(steps);
  await chrome.storage.sync.set({ [STORAGE_STEPS]: payload });
  // após salvar, decidir se mostra o link com base no que ficou salvo
  updateResetLink(payload);
  return payload;
}
async function loadElapsed() {
  const data = await chrome.storage.sync.get([STORAGE_ELAPSED]);
  return Math.max(0, Number(data[STORAGE_ELAPSED]) || 0);
}
async function saveElapsed(seconds) {
  const sec = Math.max(0, Number(seconds) || 0);
  await chrome.storage.sync.set({ [STORAGE_ELAPSED]: sec });
  return sec;
}
async function loadSize() {
  const data = await chrome.storage.sync.get([STORAGE_SIZE]);
  // Se não há valor salvo, usa o padrão atual (lg)
  if (!data[STORAGE_SIZE]) {
    return DEFAULT_SIZE;
  }
  const key = String(data[STORAGE_SIZE]);
  return ['sm', 'lg'].includes(key) ? key : DEFAULT_SIZE;
}
async function saveSize(sizeKey) {
  const key = ['sm', 'lg'].includes(sizeKey) ? sizeKey : DEFAULT_SIZE;
  await chrome.storage.sync.set({ [STORAGE_SIZE]: key });
  return key;
}
async function maybeApplyStepsToPage(steps) {
  const { result: visible } = await runOnActiveTab(_isTimerVisible);
  if (visible) await runOnActiveTab(_applySteps, { steps });
}
// sync elapsed input with live timer
async function syncElapsedInputFromPage() {
  const { result: visible } = await runOnActiveTab(_isTimerVisible);
  if (!visible) return;
  const { result: seconds } = await runOnActiveTab(_getElapsed);
  if (typeof seconds === 'number' && isFinite(seconds)) {
    document.getElementById('elapsed').value = secToMmss(Math.max(0, Math.floor(seconds)));
  }
}

/** Steps UI **/
function collectStepsFromDOM() {
  const holder = document.getElementById('steps');
  const rows = [...holder.children];
  const steps = [];
  for (let i = 0; i < rows.length; ) {
    const timeInput = rows[i++];
    const emojiInput = rows[i++];
    const maybeButton = rows[i];
    if (maybeButton && maybeButton.tagName === 'DIV') i++;
    if (!(timeInput instanceof HTMLInputElement) || !(emojiInput instanceof HTMLInputElement))
      break;
    const t = mmssToSec(timeInput.value);
    const emoji = String(emojiInput.value || '').trim();
    if (emoji.length > 0 && t >= 0) steps.push({ t, emoji });
  }
  if (steps.length === 0) steps.push({ t: 0, emoji: '🏆' });
  return sanitizeAndSort(steps);
}
function renderSteps(steps) {
  const holder = document.getElementById('steps');
  holder.innerHTML = '';
  steps.forEach((st, idx) => {
    const timeInput = el('input', {
      type: 'text',
      value: secToMmss(st.t),
      placeholder: 'mm:ss',
      disabled: idx === 0,
      className: idx === 0 ? 'disabled' : '',
    });
    const emojiInput = el('input', { type: 'text', value: st.emoji, placeholder: '' });
    const removeBtn = el(
      'div',
      {
        className: 'icon ' + (idx === 0 ? 'disabled' : 'danger'),
        title: idx === 0 ? 'Cannot remove' : 'Remove',
        'aria-disabled': idx === 0 ? 'true' : 'false',
      },
      '✕'
    );

    // marcar dirty durante digitação (sem blur)
    timeInput.addEventListener('input', () => setDirty(true));
    emojiInput.addEventListener('input', () => setDirty(true));

    // autosave em blur — aborta se SUPPRESS_AUTOSAVE estiver ativo
    if (idx !== 0) {
      timeInput.addEventListener('change', async () => {
        if (SUPPRESS_AUTOSAVE) return;
        st.t = mmssToSec(timeInput.value);
        const saved = await saveSteps(steps);
        renderSteps(saved);
        await maybeApplyStepsToPage(saved);
        setDirty(false);
        flashSaved();
      });
    }
    emojiInput.addEventListener('change', async () => {
      if (SUPPRESS_AUTOSAVE) return;
      st.emoji = emojiInput.value.trim();
      const saved = await saveSteps(steps);
      await maybeApplyStepsToPage(saved);
      setDirty(false);
      flashSaved();
    });

    if (idx !== 0) {
      removeBtn.addEventListener('click', async () => {
        SUPPRESS_AUTOSAVE = true; // evita blur concorrente do input
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        steps.splice(idx, 1);
        const saved = await saveSteps(steps);
        renderSteps(saved);
        await maybeApplyStepsToPage(saved);
        setDirty(false);
        flashSaved();
        setTimeout(() => { SUPPRESS_AUTOSAVE = false; }, 0);
      });
    }

    holder.append(timeInput, emojiInput, removeBtn);
  });
}

/** Size control UI **/
function initSizeControl(initialKey) {
  const smallBtn = document.getElementById('sizeSmall');
  const largeBtn = document.getElementById('sizeLarge');
  
  if (!smallBtn || !largeBtn) return;
  
  // Função para atualizar o estado ativo dos botões
  function updateActiveButton(activeKey) {
    smallBtn.classList.toggle('active', activeKey === 'sm');
    largeBtn.classList.toggle('active', activeKey === 'lg');
  }
  
  // Define o botão ativo inicial
  updateActiveButton(initialKey);
  
  // Event listeners para os botões
  smallBtn.addEventListener('click', async () => {
    const key = await saveSize('sm');
    updateActiveButton(key);
    // aplica no widget se estiver visível, sem mexer no Save
    const { result: visible } = await runOnActiveTab(_isTimerVisible);
    if (visible) await runOnActiveTab(_applySize, { sizeKey: key });
    flashSaved();
  });
  
  largeBtn.addEventListener('click', async () => {
    const key = await saveSize('lg');
    updateActiveButton(key);
    // aplica no widget se estiver visível, sem mexer no Save
    const { result: visible } = await runOnActiveTab(_isTimerVisible);
    if (visible) await runOnActiveTab(_applySize, { sizeKey: key });
    flashSaved();
  });
}


/** UI Actions **/
async function refreshToggleLabel() {
  const { result: visible } = await runOnActiveTab(_isTimerVisible);
  document.getElementById('toggle').textContent = visible ? '🚫 Hide timer' : '⏰ Show timer';
}

/** Times config visibility control **/
function toggleTimesConfigVisibility() {
  const stepsEl = document.getElementById('steps');
  const addStepRowEl = document.getElementById('addStepRow');
  const saveBtnRowEl = document.getElementById('saveBtnRow');
  const timesConfigBtn = document.getElementById('timesConfig');
  
  const isVisible = stepsEl.style.display !== 'none';
  
  if (isVisible) {
    // Hide elements
    stepsEl.style.display = 'none';
    addStepRowEl.style.display = 'none';
    saveBtnRowEl.style.display = 'none';
    timesConfigBtn.textContent = 'Times config';
  } else {
    // Show elements
    stepsEl.style.display = 'grid';
    addStepRowEl.style.display = 'flex';
    saveBtnRowEl.style.display = 'flex';
    timesConfigBtn.textContent = 'Hide times config';
  }
}

document.getElementById('timesConfig').addEventListener('click', toggleTimesConfigVisibility);

document.getElementById('resetConfigs').addEventListener('click', async () => {
  SUPPRESS_AUTOSAVE = true;
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }
  const saved = await saveSteps(DEFAULT_STEPS.slice());
  renderSteps(saved);
  await maybeApplyStepsToPage(saved);
  setDirty(false);
  flashSaved();
  setTimeout(() => { SUPPRESS_AUTOSAVE = false; }, 0);
});

document.getElementById('addStep').addEventListener('click', async () => {
  SUPPRESS_AUTOSAVE = true; // blindar blur concorrente
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }
  const steps = await loadSteps();
  const last = steps[steps.length - 1];
  steps.push({ t: (Number(last?.t) || 0) + 300, emoji: '⏱️' });
  const saved = await saveSteps(steps);
  renderSteps(saved);
  await maybeApplyStepsToPage(saved);
  setDirty(false);
  flashSaved(); // feedback visual p/ autosave
  setTimeout(() => { SUPPRESS_AUTOSAVE = false; }, 0);
});

document.getElementById('toggle').addEventListener('click', async () => {
  const steps = await loadSteps();
  const initialElapsedSec = await loadElapsed();
  const sizeKey = await loadSize();
  const { result } = await runOnActiveTab(_toggleTimer, { steps, initialElapsedSec, sizeKey });
  document.getElementById('toggle').textContent = result ? '🚫 Hide timer' : '⏰ Show timer';
  await syncElapsedInputFromPage();
});

document.getElementById('setElapsed').addEventListener('click', async () => {
  const sec = mmssToSec(document.getElementById('elapsed').value);
  await saveElapsed(sec);
  const { result: visible } = await runOnActiveTab(_isTimerVisible);
  if (visible) await runOnActiveTab(_setElapsed, { seconds: sec });
});

document.getElementById('reset').addEventListener('click', async () => {
  await runOnActiveTab(_resetTimer);
  document.getElementById('elapsed').value = '00:00';
  await saveElapsed(0);
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  SUPPRESS_AUTOSAVE = true; // evitar blur paralelo durante o save manual
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const steps = collectStepsFromDOM();
  const savedSteps = await saveSteps(steps);
  await maybeApplyStepsToPage(savedSteps);
  setDirty(false);
  setTimeout(() => { SUPPRESS_AUTOSAVE = false; }, 0);
});

/** Init **/
(async function init() {
  const steps = await loadSteps();
  if (steps[0]?.t !== 0) {
    steps[0] = { t: 0, emoji: steps[0]?.emoji || '🏆' };
    await saveSteps(steps);
  }
  renderSteps(steps);
  updateResetLink(steps); // decide visibilidade do reset configs com base no salvo

  // init Size control (autosalva e aplica no widget se visível)
  const sizeKey = await loadSize();
  initSizeControl(sizeKey);

  await refreshToggleLabel();

  const sec = await loadElapsed();
  document.getElementById('elapsed').value = secToMmss(sec);
  setDirty(false);
  await syncElapsedInputFromPage();
})();
