const KEY = 'bike-build-tracker-theme';
const STATES = ['auto', 'light', 'dark'];
const GLYPHS = { auto: '◐', light: '☀', dark: '☾' };
const LABELS = { auto: 'Auto', light: 'Light', dark: 'Dark' };

let state = STATES.includes(localStorage.getItem(KEY)) ? localStorage.getItem(KEY) : 'auto';

function apply() {
  const root = document.documentElement;
  if (state === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', state);
}

export function initTheme() {
  apply();

  const btn = document.getElementById('theme-toggle');
  const glyph = document.getElementById('theme-glyph');
  const label = document.getElementById('theme-label');
  if (!btn) return;

  const render = () => {
    glyph.textContent = GLYPHS[state];
    label.textContent = LABELS[state];
    btn.title = `Theme: ${LABELS[state]}`;
    btn.setAttribute('aria-label', `Theme: ${LABELS[state]}`);
  };

  btn.addEventListener('click', () => {
    state = STATES[(STATES.indexOf(state) + 1) % STATES.length];
    localStorage.setItem(KEY, state);
    apply();
    render();
  });

  render();
}