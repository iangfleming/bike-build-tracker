import { esc, formatNumber, formatWeightDual } from '../utils.js';
import { categorySubtotal, realItems } from '../model.js';

function currency(build) {
  return build.currencySymbol || '';
}

export function renderCategory(
  container,
  { category, build, filter, onEvent, editingItemId }
) {
  const catItems = build.items.filter((i) => i.category === category);
  const defaults = catItems.filter((i) => i.default);
  const real = realItems(catItems);
  const filtered = filterItems(real, filter);
  const catTotal = categorySubtotal(build, category);
  const hasItems = real.length > 0;
  const expanded = hasItems;

  const section = document.createElement('section');
  section.className = 'category-section';
  section.dataset.category = category;

  const header = document.createElement('div');
  header.className = 'category-header';
  header.innerHTML = `
    <button type="button" class="category-toggle" aria-expanded="${expanded}">
      <span class="category-caret">${expanded ? '▾' : '▸'}</span>
      <h2 class="category-title">${esc(category)}</h2>
    </button>
    <div class="category-subtotal">
      <span class="cat-total-price">${currency(build)}${formatNumber(catTotal.price)}</span>
      <span class="cat-total-weight">${formatWeightDual(catTotal.weight)}</span>
      <span class="cat-total-count">${catTotal.count} item${catTotal.count === 1 ? '' : 's'}</span>
      <span class="cat-acquired">${countAcquired(real)}</span>
    </div>
    <button type="button" class="btn btn-small add-category-item-btn">+ Add item</button>
    <button type="button" class="btn btn-small btn-ghost rename-category-btn" title="Rename category">✎ Rename</button>
    <button type="button" class="btn btn-small btn-danger delete-category-btn" title="Delete category">Delete</button>
  `;
  section.appendChild(header);

  const body = document.createElement('div');
  body.className = 'category-body';
  body.hidden = !expanded;

  const table = document.createElement('div');
  table.className = 'items-table';

  if (filtered.length > 0) {
    for (const item of filtered) {
      if (editingItemId === item.id) {
        renderEditFormRow(table, build, item, onEvent);
      } else {
        table.appendChild(renderItemRow(item, build, onEvent));
      }
    }
  } else if (real.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'items-empty';
    empty.textContent = 'No items yet.';
    table.appendChild(empty);
  } else {
    const empty = document.createElement('div');
    empty.className = 'items-empty';
    empty.textContent = 'No items match the current filter.';
    table.appendChild(empty);
  }

  for (const item of defaults) {
    if (editingItemId === item.id) {
      renderEditFormRow(table, build, item, onEvent);
    } else {
      table.appendChild(renderPlaceholderRow(item, build, onEvent));
    }
  }

  table.appendChild(renderAddRow(build, category, onEvent));
  body.appendChild(table);
  section.appendChild(body);
  container.appendChild(section);

  header.querySelector('.category-toggle').addEventListener('click', () => {
    const toggle = header.querySelector('.category-toggle');
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    body.hidden = expanded;
    header.querySelector('.category-caret').textContent = expanded ? '▸' : '▾';
  });

  header.querySelector('.add-category-item-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    onEvent('add-item', { category, scrollTo: true });
  });

  header.querySelector('.rename-category-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    onEvent('rename-category', { category });
  });

  header.querySelector('.delete-category-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    onEvent('delete-category', { category });
  });

  return section;
}

function countAcquired(items) {
  const n = items.filter((i) => i.acquired).length;
  return n > 0 ? `<span class="badge acquired-badge">${n} acquired</span>` : '';
}

export function filterItems(items, filter) {
  if (filter === 'acquired') return items.filter((i) => i.acquired);
  if (filter === 'remaining') return items.filter((i) => !i.acquired);
  return items;
}

function renderPlaceholderRow(item, build, onEvent) {
  const row = document.createElement('div');
  row.className = 'item-row item-row-default';
  row.dataset.itemId = item.id;

  row.innerHTML = `
    <div class="item-default-icon" aria-hidden="true">◇</div>
    <div class="item-main">
      <div class="item-name">${esc(item.name)}</div>
      <div class="item-sub">
        <span class="item-hint">Default item — fill in details to add to the build, or delete.</span>
      </div>
    </div>
    <div class="item-actions">
      <button type="button" class="btn btn-icon item-edit" title="Edit item" aria-label="Edit item">✎</button>
      <button type="button" class="btn btn-icon item-delete" title="Delete item" aria-label="Delete item">✕</button>
    </div>
  `;

  row.querySelector('.item-edit').addEventListener('click', () => {
    onEvent('edit-item', { itemId: item.id });
  });

  row.querySelector('.item-delete').addEventListener('click', () => {
    onEvent('delete-item', { itemId: item.id });
  });

  return row;
}

function renderItemRow(item, build, onEvent) {
  const row = document.createElement('div');
  row.className = 'item-row';
  if (item.acquired) row.classList.add('acquired');
  row.dataset.itemId = item.id;

  const notesText = item.notes
    ? `<div class="item-notes">${esc(item.notes)}</div>`
    : '';
  const linkHtml = item.link
    ? `<a class="item-link" href="${esc(item.link)}" target="_blank" rel="noopener noreferrer">link</a>`
    : '';
  const qty = item.quantity > 1 ? `<span class="item-qty">×${item.quantity}</span>` : '';

  row.innerHTML = `
    <label class="acquired-check" title="Mark acquired">
      <input type="checkbox" class="item-acquired" ${item.acquired ? 'checked' : ''} aria-label="Mark ${esc(item.name)} acquired">
      <span class="checkmark" aria-hidden="true"></span>
    </label>
    <div class="item-main">
      <div class="item-name">${esc(item.name) || '<em>Untitled</em>'} ${qty}</div>
      <div class="item-sub">
        ${item.brand ? `<span class="item-brand">${esc(item.brand)}</span>` : ''}
        ${notesText}
        ${linkHtml}
      </div>
    </div>
    <div class="item-figures">
      <span class="item-price" title="Total price">${currency(build)}${formatNumber(item.price * item.quantity)}</span>
      <span class="item-weight" title="Total weight">${formatNumber(item.weight * item.quantity)} g</span>
    </div>
    <div class="item-actions">
      <button type="button" class="btn btn-icon item-edit" title="Edit item" aria-label="Edit item">✎</button>
      <button type="button" class="btn btn-icon item-delete" title="Delete item" aria-label="Delete item">✕</button>
    </div>
  `;

  const acquiredInput = row.querySelector('.item-acquired');
  acquiredInput.addEventListener('change', () => {
    onEvent('toggle-acquired', { itemId: item.id, acquired: acquiredInput.checked });
  });

  row.querySelector('.item-edit').addEventListener('click', () => {
    onEvent('edit-item', { itemId: item.id });
  });

  row.querySelector('.item-delete').addEventListener('click', () => {
    onEvent('delete-item', { itemId: item.id });
  });

  return row;
}

function renderAddRow(build, category, onEvent) {
  const form = document.createElement('form');
  form.className = 'add-row';
  form.dataset.category = category;

  const addBtn = document.createElement('button');
  addBtn.type = 'submit';
  addBtn.className = 'btn btn-primary btn-small add-submit';
  addBtn.textContent = '+ Add';
  addBtn.disabled = true;

  const fields = [
    { cls: 'name', ph: 'Name', type: 'text', required: true },
    { cls: 'brand', ph: 'Brand', type: 'text' },
    { cls: 'price', ph: 'Price', type: 'number', step: '0.01', min: '0' },
    { cls: 'weight', ph: 'Weight (g)', type: 'number', step: '0.01', min: '0' },
    { cls: 'qty', ph: 'Qty', type: 'number', step: '1', min: '1', value: '1' },
  ];

  const inputs = {};
  for (const f of fields) {
    const input = document.createElement('input');
    input.type = f.type;
    input.placeholder = f.ph;
    input.className = `add-field add-${f.cls}`;
    if (f.step) input.step = f.step;
    if (f.min !== undefined) input.min = f.min;
    if (f.value) input.value = f.value;
    if (f.required) input.required = true;
    inputs[f.cls] = input;
    form.appendChild(input);
  }

  const notesInput = document.createElement('input');
  notesInput.type = 'text';
  notesInput.placeholder = 'Notes (size, color, part #)';
  notesInput.className = 'add-field add-notes';
  inputs.notes = notesInput;
  form.appendChild(notesInput);

  const linkInput = document.createElement('input');
  linkInput.type = 'url';
  linkInput.placeholder = 'Link (optional)';
  linkInput.className = 'add-field add-link';
  inputs.link = linkInput;
  form.appendChild(linkInput);

  form.appendChild(addBtn);

  const updateAddState = () => {
    addBtn.disabled = !inputs.name.value.trim();
  };
  inputs.name.addEventListener('input', updateAddState);
  updateAddState();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!inputs.name.value.trim()) return;
    onEvent('add-item-submit', {
      category,
      name: inputs.name.value.trim(),
      brand: inputs.brand.value.trim(),
      price: Number(inputs.price.value) || 0,
      weight: Number(inputs.weight.value) || 0,
      quantity: Math.max(1, Math.round(Number(inputs.qty.value) || 1)),
      notes: inputs.notes.value.trim(),
      link: inputs.link.value.trim(),
    });
    inputs.name.value = '';
    inputs.brand.value = '';
    inputs.price.value = '';
    inputs.weight.value = '';
    inputs.notes.value = '';
    inputs.link.value = '';
    inputs.qty.value = '1';
    updateAddState();
    inputs.name.focus();
  });

  return form;
}

function displayWeight(item) {
  return item.weight;
}

export function renderEditFormRow(container, build, item, onEvent) {
  const form = document.createElement('form');
  form.className = 'edit-row';
  form.dataset.itemId = item.id;

  const groups = [
    ['name', 'Name', item.name],
    ['brand', 'Brand', item.brand],
    ['price', 'Price', item.price],
    ['weight', 'Weight (g)', displayWeight(item)],
    ['qty', 'Qty', item.quantity],
  ];

  const inputs = {};
  for (const [key, label, value] of groups) {
    const labelEl = document.createElement('label');
    labelEl.className = 'edit-field';
    const span = document.createElement('span');
    span.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    if (key === 'name') input.type = 'text';
    if (key === 'brand') input.type = 'text';
    if (key === 'price') { input.type = 'number'; input.step = '0.01'; }
    if (key === 'weight') { input.type = 'number'; input.step = '0.01'; }
    if (key === 'qty') { input.type = 'number'; input.step = '1'; input.min = '1'; }
    input.value = value ?? '';
    inputs[key] = input;
    labelEl.appendChild(span);
    labelEl.appendChild(input);
    form.appendChild(labelEl);
  }

  const notesLabel = document.createElement('label');
  notesLabel.className = 'edit-field edit-field-wide';
  notesLabel.appendChild(Object.assign(document.createElement('span'), { textContent: 'Notes' }));
  inputs.notes = document.createElement('input');
  inputs.notes.type = 'text';
  inputs.notes.value = item.notes || '';
  notesLabel.appendChild(inputs.notes);
  form.appendChild(notesLabel);

  const linkLabel = document.createElement('label');
  linkLabel.className = 'edit-field edit-field-wide';
  linkLabel.appendChild(Object.assign(document.createElement('span'), { textContent: 'Link' }));
  inputs.link = document.createElement('input');
  inputs.link.type = 'url';
  inputs.link.value = item.link || '';
  linkLabel.appendChild(inputs.link);
  form.appendChild(linkLabel);

  const actions = document.createElement('div');
  actions.className = 'edit-actions';

  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'btn btn-primary btn-small';
  save.textContent = 'Save';
  actions.appendChild(save);

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn-ghost btn-small';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => onEvent('cancel-edit', { itemId: item.id }));
  actions.appendChild(cancel);

  form.appendChild(actions);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    onEvent('save-edit', {
      itemId: item.id,
      name: inputs.name.value.trim() || item.name,
      brand: inputs.brand.value.trim(),
      price: Number(inputs.price.value) || 0,
      weight: Number(inputs.weight.value) || 0,
      quantity: Math.max(1, Math.round(Number(inputs.qty.value) || 1)),
      notes: inputs.notes.value.trim(),
      link: inputs.link.value.trim(),
    });
  });

  container.appendChild(form);
  inputs.name.focus();
}