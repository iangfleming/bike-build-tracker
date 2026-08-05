import { load, save, reset, migrate } from './storage.js';
import { createBuild, createItem } from './model.js';
import { nowIso, debounce } from './utils.js';
import { exportBuildCsv, exportAllJson, parseCsvItems } from './csv.js';
import {
  renderAll,
  showToast,
  openModal,
  closeModal,
  confirmAction,
} from './ui/render.js';
import { initTheme } from './ui/theme.js';

const state = load();
let filter = 'all';
let editingItemId = null;

const debouncedPersist = debounce(persist, 300);

function getBuild() {
  return state.builds.find((b) => b.id === state.activeBuildId) || null;
}

function ofItem(build, id) {
  return build.items.find((i) => i.id === id);
}

function persist() {
  try {
    save(state);
  } catch (err) {
    showToast('Could not save: storage quota exceeded.', 'error', 5000);
  }
}

function commit() {
  const build = getBuild();
  if (build) build.updatedAt = nowIso();
  if (editingItemId && build && !build.items.some((i) => i.id === editingItemId)) {
    editingItemId = null;
  }
  debouncedPersist();
  render();
}

function render() {
  renderAll(state, {
    filter,
    editingItemId,
    onEvent: handleCategoryEvent,
  });
}

// ---------- Category & item events ----------

function handleCategoryEvent(type, payload) {
  const build = getBuild();
  if (!build) return;

  switch (type) {
    case 'add-item': {
      const row = document.querySelector(
        `.add-row[data-category="${CSS.escape(payload.category)}"]`
      );
      if (row) {
        const section = row.closest('.category-section');
        if (section) {
          const toggle = section.querySelector('.category-toggle');
          const body = section.querySelector('.category-body');
          if (toggle && body) {
            toggle.setAttribute('aria-expanded', 'true');
            body.hidden = false;
            const caret = toggle.querySelector('.category-caret');
            if (caret) caret.textContent = '▼';
          }
        }
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const nameField = row.querySelector('.add-name');
        if (nameField) nameField.focus();
      }
      break;
    }
    case 'add-item-submit': {
      build.items.push(
        createItem({
          category: payload.category,
          name: payload.name,
          brand: payload.brand,
          price: payload.price,
          weight: Number(payload.weight) || 0,
          quantity: payload.quantity,
          notes: payload.notes,
          link: payload.link,
        })
      );
      commit();
      break;
    }
    case 'toggle-acquired': {
      const item = ofItem(build, payload.itemId);
      if (item) item.acquired = payload.acquired;
      commit();
      break;
    }
    case 'edit-item': {
      if (payload.itemId) {
        editingItemId = payload.itemId;
        render();
      }
      break;
    }
    case 'save-edit': {
      const item = ofItem(build, payload.itemId);
      if (item) {
        item.name = payload.name;
        item.brand = payload.brand;
        item.price = payload.price;
        item.weight = Number(payload.weight) || 0;
        item.quantity = payload.quantity;
        item.notes = payload.notes;
        item.link = payload.link;
        item.default = false;
      }
      editingItemId = null;
      commit();
      break;
    }
    case 'cancel-edit': {
      editingItemId = null;
      render();
      break;
    }
    case 'delete-item': {
      confirmDelete(payload.itemId);
      break;
    }
    case 'rename-category': {
      openRenameCategoryModal(payload.category);
      break;
    }
    case 'delete-category': {
      confirmDeleteCategory(payload.category);
      break;
    }
  }
}

function confirmDelete(id) {
  confirmAction('Delete this item?', 'Delete').then((ok) => {
    if (!ok) return;
    const build = getBuild();
    if (!build) return;
    const idx = build.items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const removed = build.items.splice(idx, 1)[0];
    commit();
    showUndoToast('Item deleted.', () => {
      build.items.push(removed);
      commit();
    });
  });
}

let undoTimer;

function showUndoToast(message, undo) {
  const toast = document.getElementById('toast');
  toast.hidden = false;
  toast.className = 'toast toast-undo';
  toast.innerHTML = message;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-small btn-undo';
  btn.textContent = 'Undo';
  btn.addEventListener('click', () => {
    clearTimeout(undoTimer);
    toast.hidden = true;
    undo();
  });
  toast.appendChild(btn);
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => {
    toast.hidden = true;
  }, 5000);
}

// ---------- Modals ----------

function appendActions(modal, actions) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-actions';
  for (const a of actions) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn ${a.className || 'btn'}`;
    btn.textContent = a.label;
    btn.addEventListener('click', a.onClick);
    wrap.appendChild(btn);
  }
  modal.appendChild(wrap);
}

function openNewCategoryModal() {
  const modal = openModal(
    'New category',
    `<p>Create a new category for items that don't fit the defaults. No items are added by default.</p>
     <label class="form-field">
       <span>Category name</span>
       <input type="text" id="new-category-name" placeholder="e.g. Lights, Fenders, Accessories">
     </label>`
  );
  appendActions(modal, [
    { label: 'Cancel', className: 'btn-ghost', onClick: closeModal },
    {
      label: 'Add Category',
      className: 'btn-primary',
      onClick: () => {
        const build = getBuild();
        if (!build) return;
        const name = document.getElementById('new-category-name').value.trim();
        if (!name) {
          showToast('Enter a category name.', 'error');
          return;
        }
        if (categoryNameExists(name)) {
          showToast(`"${name}" already exists.`, 'error');
          return;
        }
        build.categories.push(name);
        closeModal();
        commit();
        showToast(`Added category "${name}".`);
      },
    },
  ]);
  document.getElementById('new-category-name').focus();
}

function categoryNameExists(name) {
  const build = getBuild();
  if (!build) return false;
  return build.categories.some(
    (c) => c.toLowerCase() === name.toLowerCase()
  );
}

function openRenameCategoryModal(categoryName) {
  const modal = openModal(
    'Rename category',
    `<p>Rename the category <strong>${categoryName}</strong>.</p>
     <label class="form-field">
       <span>New name</span>
       <input type="text" id="rename-category-name" value="${escAttr(categoryName)}">
     </label>`
  );
  appendActions(modal, [
    { label: 'Cancel', className: 'btn-ghost', onClick: closeModal },
    {
      label: 'Rename',
      className: 'btn-primary',
      onClick: () => {
        const build = getBuild();
        if (!build) return;
        const name = document.getElementById('rename-category-name').value.trim();
        if (!name) {
          showToast('Enter a category name.', 'error');
          return;
        }
        if (name !== categoryName) {
          const idx = build.categories.indexOf(categoryName);
          if (idx === -1) {
            showToast('Category not found.', 'error');
            return;
          }
          if (categoryNameExists(name)) {
            showToast(`"${name}" already exists.`, 'error');
            return;
          }
          build.categories[idx] = name;
          for (const item of build.items) {
            if (item.category === categoryName) item.category = name;
          }
        }
        closeModal();
        commit();
        showToast('Category renamed.');
      },
    },
  ]);
  document.getElementById('rename-category-name').focus();
}

function confirmDeleteCategory(categoryName) {
  confirmAction(
    `Delete the category "${categoryName}" and all ${countItemsInCategory(categoryName)} item(s) in it?`,
    'Delete'
  ).then((ok) => {
    if (!ok) return;
    const build = getBuild();
    if (!build) return;
    build.categories = build.categories.filter((c) => c !== categoryName);
    build.items = build.items.filter((i) => i.category !== categoryName);
    commit();
    showToast(`Deleted category "${categoryName}".`);
  });
}

function clearDefaultItems() {
  const build = getBuild();
  if (!build) return;
  const count = build.items.filter((i) => i.default).length;
  if (count === 0) {
    showToast('No default items to clear.');
    return;
  }
  confirmAction(
    `Clear all ${count} default item(s)? Real items you've added are kept.`,
    'Clear Defaults'
  ).then((ok) => {
    if (!ok) return;
    build.items = build.items.filter((i) => !i.default);
    commit();
    showToast('Default items cleared.');
  });
}

function countItemsInCategory(categoryName) {
  const build = getBuild();
  return build
    ? build.items.filter((i) => i.category === categoryName).length
    : 0;
}

function escAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function openNewBuildModal() {
  const modal = openModal(
    'Create a new build',
    `<label class="form-field">
       <span>Build name</span>
       <input type="text" id="new-build-name" placeholder="e.g. Gravel bike">
     </label>`
  );
  appendActions(modal, [
    { label: 'Cancel', className: 'btn-ghost', onClick: closeModal },
    {
      label: 'Create & Switch',
      className: 'btn-primary',
      onClick: () => {
        const name = document.getElementById('new-build-name').value.trim();
        const build = createBuild({ name: name || 'My Build' });
        state.builds.push(build);
        state.activeBuildId = build.id;
        editingItemId = null;
        closeModal();
        persist();
        render();
        showToast('Build created.');
      },
    },
  ]);
  document.getElementById('new-build-name').focus();
}

function openImportChoiceModal(items, warnings, filename) {
  const modal = openModal(
    'Import CSV',
    `<p>Parsed <strong>${items.length}</strong> item(s) from <strong>${filename}</strong>.</p>
     <p>How would you like to import them?</p>`
  );
  if (warnings.length) {
    const hint = document.createElement('p');
    hint.className = 'modal-hint';
    hint.textContent = warnings.join(' ');
    modal.querySelector('.modal-body').appendChild(hint);
  }
  appendActions(modal, [
    {
      label: 'New build',
      className: 'btn-primary',
      onClick: () => {
        closeModal();
        const build = createBuild({ name: `Imported ${new Date().toLocaleDateString()}` });
        build.items = items.map((i) => ({
          ...i,
          category: i.category || 'Other',
        }));
        ensureCategories(build, build.items);
        state.builds.push(build);
        state.activeBuildId = build.id;
        editingItemId = null;
        persist();
        render();
        notifyWarnings(warnings);
      },
    },
    {
      label: 'Replace current',
      className: 'btn',
      onClick: () => {
        closeModal();
        const build = getBuild();
        if (build) {
          build.items = items.map((i) => ({
            ...i,
            category: i.category || 'Other',
          }));
          ensureCategories(build, build.items);
          commit();
        }
        notifyWarnings(warnings);
      },
    },
    {
      label: 'Append to current',
      className: 'btn',
      onClick: () => {
        closeModal();
        const build = getBuild();
        if (build) {
          const mapped = items.map((i) => ({
            ...i,
            category: i.category || 'Other',
          }));
          build.items.push(...mapped);
          ensureCategories(build, mapped);
          commit();
        }
        notifyWarnings(warnings);
      },
    },
  ]);
}

function ensureCategories(build, items) {
  for (const item of items) {
    if (item.category && !build.categories.includes(item.category)) {
      build.categories.push(item.category);
    }
  }
}

function notifyWarnings(warnings) {
  if (warnings.length) {
    showToast(warnings.join(' '), 'error', 6000);
  } else {
    showToast('CSV imported successfully.');
  }
}

// ---------- DOM wiring ----------

function wireHeader() {
  document.getElementById('build-name').addEventListener('change', (e) => {
    const build = getBuild();
    if (!build) return;
    const val = e.target.value.trim();
    if (!val) {
      e.target.value = build.name;
      return;
    }
    build.name = val;
    commit();
  });

  document.getElementById('currency-symbol').addEventListener('input', (e) => {
    const build = getBuild();
    if (!build) return;
    build.currencySymbol = e.target.value.slice(0, 10);
    commit();
  });

  document.getElementById('acquired-filter').addEventListener('change', (e) => {
    filter = e.target.value;
    render();
  });

  document.getElementById('build-switcher').addEventListener('change', (e) => {
    state.activeBuildId = e.target.value;
    editingItemId = null;
    persist();
    render();
  });

  document.getElementById('new-build-btn').addEventListener('click', openNewBuildModal);
  document.getElementById('new-group-btn').addEventListener('click', openNewCategoryModal);
}

function wireFooter() {
  document.getElementById('export-csv-btn').addEventListener('click', () => {
    const build = getBuild();
    if (!build) return;
    exportBuildCsv(build);
    showToast('CSV exported.');
  });

  document.getElementById('import-csv-btn').addEventListener('click', () => {
    document.getElementById('import-csv-input').click();
  });

  document.getElementById('import-csv-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) readCsvFile(file);
  });

  document.getElementById('export-json-btn').addEventListener('click', () => {
    exportAllJson(state);
    showToast('Backup exported.');
  });

  document.getElementById('import-json-btn').addEventListener('click', () => {
    document.getElementById('import-json-input').click();
  });

  document.getElementById('import-json-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) importJsonFile(file);
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    confirmAction(
      'Reset all data? This permanently deletes every build. You can export a backup first.',
      'Reset All'
    ).then((ok) => {
      if (!ok) return;
      reset();
      location.reload();
    });
  });

  const clearDefaultsBtn = document.getElementById('clear-defaults-btn');
  if (clearDefaultsBtn) {
    clearDefaultsBtn.addEventListener('click', clearDefaultItems);
  }
}

function readCsvFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const { items, warnings } = parseCsvItems(reader.result);
    openImportChoiceModal(items, warnings, file.name);
  };
  reader.readAsText(file);
}

function importJsonFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch {
      showToast('Invalid backup file.', 'error');
      return;
    }
    const migrated = migrate(data);
    confirmAction(
      'Importing this backup will overwrite all current data. Continue?',
      'Import'
    ).then((ok) => {
      if (!ok) return;
      Object.assign(state, migrated);
      editingItemId = null;
      persist();
      render();
      showToast('Backup restored.');
    });
  };
  reader.readAsText(file);
}

function wireDragAndDrop() {
  let depth = 0;
  window.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    depth++;
    document.body.classList.add('dragging');
  });
  window.addEventListener('dragover', (e) => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
  });
  window.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) document.body.classList.remove('dragging');
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    depth = 0;
    document.body.classList.remove('dragging');
    const file = e.dataTransfer && e.dataTransfer.files[0];
    if (!file) return;
    if (/\.csv$/i.test(file.name) || file.type.includes('csv')) {
      readCsvFile(file);
    } else if (/\.json$/i.test(file.name) || file.type.includes('json')) {
      importJsonFile(file);
    }
  });
}

function wireModal() {
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
  document.addEventListener('app:select-build', (e) => {
    state.activeBuildId = e.detail.id;
    editingItemId = null;
    persist();
    render();
  });
}

// ---------- Init ----------

initTheme();
wireHeader();
wireFooter();
wireDragAndDrop();
wireModal();

if (!state.builds.some((b) => b.id === state.activeBuildId)) {
  state.activeBuildId = state.builds[0] ? state.builds[0].id : '';
}

render();
