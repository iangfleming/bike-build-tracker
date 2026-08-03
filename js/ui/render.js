import { esc, formatNumber, formatWeightDual } from '../utils.js';
import { buildTotals } from '../model.js';
import { populateSwitcher } from './buildSwitcher.js';
import { renderCategory } from './categorySection.js';

export function renderAll(state, opts = {}) {
  const build = state.builds.find((b) => b.id === state.activeBuildId);
  renderHeaderFields(build);
  populateSwitcher(document.getElementById('build-switcher'), state.builds);
  document.getElementById('build-switcher').value = state.activeBuildId || '';
  renderSummaryBar(build);
  renderBuildsList(state);
  if (!build) {
    document.getElementById('build-view').hidden = true;
    document.getElementById('builds-list').hidden = false;
    return;
  }
  document.getElementById('build-view').hidden = false;
  document.getElementById('builds-list').hidden = true;
  renderCategories(build, opts);
}

export function renderHeaderFields(build) {
  const nameInput = document.getElementById('build-name');
  const currencyInput = document.getElementById('currency-symbol');
  if (!build) {
    nameInput.value = '';
    currencyInput.value = '$';
    nameInput.disabled = true;
    currencyInput.disabled = true;
    return;
  }
  nameInput.value = build.name;
  currencyInput.value = build.currencySymbol;
  nameInput.disabled = false;
  currencyInput.disabled = false;
}

export function renderSummaryBar(build) {
  const bar = document.getElementById('summary-bar');
  if (!build) {
    bar.innerHTML = '';
    return;
  }
  const t = buildTotals(build);
  const cur = build.currencySymbol || '';
  const pct = t.itemCount > 0 ? Math.round((t.countAcquired / t.itemCount) * 100) : 0;
  bar.innerHTML = `
    <div class="summary-item summary-total">
      <span class="summary-label">Total</span>
      <span class="summary-value">${cur}${formatNumber(t.price)}</span>
      <span class="summary-sub">${formatWeightDual(t.weight)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Items</span>
      <span class="summary-value">${t.itemCount}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Acquired</span>
      <span class="summary-value">${t.countAcquired} / ${t.itemCount}</span>
      <span class="summary-sub">${pct}%</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Spent</span>
      <span class="summary-value">${cur}${formatNumber(t.priceAcquired)}</span>
      <span class="summary-sub">${formatWeightDual(t.weightAcquired)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Remaining</span>
      <span class="summary-value">${cur}${formatNumber(t.priceRemaining)}</span>
      <span class="summary-sub">${formatWeightDual(t.weight - t.weightAcquired)}</span>
    </div>
  `;
}

function renderBuildsList(state) {
  const list = document.getElementById('builds-list-items');
  list.innerHTML = '';
  if (state.builds.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No builds yet.';
    list.appendChild(li);
    return;
  }
  for (const build of state.builds) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'build-list-btn';
    btn.textContent = build.name;
    btn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('app:select-build', { detail: { id: build.id } }));
    });
    li.appendChild(btn);
    list.appendChild(li);
  }
}

export function renderCategories(build, { filter, onEvent, editingItemId }) {
  const container = document.getElementById('category-groups');
  container.innerHTML = '';
  for (const category of build.categories) {
    renderCategory(container, { category, build, filter, onEvent, editingItemId });
  }
}

export function showToast(message, type = 'info', duration = 3500) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.hidden = true;
  }, duration);
}

export function openModal(title, bodyHtml, actionsHtml) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>${esc(title)}</h2>
      <button type="button" class="btn btn-icon modal-close" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">${bodyHtml}</div>
    ${actionsHtml ? `<div class="modal-actions">${actionsHtml}</div>` : ''}
  `;
  document.getElementById('modal-backdrop').hidden = false;
  modal.querySelector('.modal-close').addEventListener('click', closeModal);
  return modal;
}

export function closeModal() {
  document.getElementById('modal-backdrop').hidden = true;
  document.getElementById('modal').innerHTML = '';
}

export function confirmAction(message, confirmLabel = 'Confirm') {
  return new Promise((resolve) => {
    const modal = openModal(
      'Confirm',
      `<p>${esc(message)}</p>`,
      ''
    );
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn-ghost';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => {
      closeModal();
      resolve(false);
    });
    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'btn btn-danger';
    confirm.textContent = confirmLabel;
    confirm.addEventListener('click', () => {
      closeModal();
      resolve(true);
    });
    actions.appendChild(cancel);
    actions.appendChild(confirm);
    modal.appendChild(actions);
  });
}
