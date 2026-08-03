import { csvEscapeField, download, sanitizeFile, datedStamp, gToOz } from './utils.js';
import { createItem } from './model.js';

export const CSV_COLUMNS = [
  'categoryGroup',
  'category',
  'name',
  'brand',
  'price',
  'weight',
  'weightUnit',
  'quantity',
  'acquired',
  'notes',
  'link',
];

export function buildToCsv(build) {
  const rows = [CSV_COLUMNS.join(',')];
  for (const item of build.items) {
    const values = CSV_COLUMNS.map((col) => {
      if (col === 'acquired') return item.acquired ? 'true' : 'false';
      if (col === 'weight') {
        const display = build.weightUnit === 'oz' ? gToOz(item.weight) : item.weight;
        return csvEscapeField(display);
      }
      if (col === 'weightUnit') return build.weightUnit;
      return csvEscapeField(item[col] ?? '');
    });
    rows.push(values.join(','));
  }
  return rows.join('\n');
}

export function exportBuildCsv(build) {
  const filename = `bike-build-${sanitizeFile(build.name)}-${datedStamp()}.csv`;
  const blob = new Blob([buildToCsv(build)], { type: 'text/csv;charset=utf-8' });
  download(filename, blob);
}

export function exportAllJson(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  download(`bike-build-backup-${new Date().toISOString().slice(0, 10)}.json`, blob);
}

export function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) {
    rows.push(row);
  }
  return rows;
}

const HEADER_ALIASES = {
  categorygroup: 'categoryGroup',
  category: 'category',
  name: 'name',
  brand: 'brand',
  price: 'price',
  weight: 'weight',
  weightunit: 'weightUnit',
  unit: 'weightUnit',
  quantity: 'quantity',
  qty: 'quantity',
  acquired: 'acquired',
  purchased: 'acquired',
  notes: 'notes',
  note: 'notes',
  link: 'link',
  url: 'link',
};

function parseBoolean(value) {
  const v = String(value).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'y' || v === 'acquired';
}

export function parseCsvItems(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return { items: [], warnings: [] };
  }
  const header = rows[0].map((h) => HEADER_ALIASES[h.trim().toLowerCase()] || h.trim());
  const colIndex = {};
  header.forEach((name, i) => {
    if (!(name in colIndex)) colIndex[name] = i;
  });

  const items = [];
  const warnings = [];
  let invalidNumeric = 0;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (name) => {
      const idx = colIndex[name];
      return idx !== undefined ? (cells[idx] ?? '').trim() : '';
    };
    const priceRaw = get('price');
    const weightRaw = get('weight');
    const qtyRaw = get('quantity');

    let price = 0;
    let weight = 0;
    let quantity = 1;
    let rowInvalid = 0;

    if (priceRaw !== '') {
      const n = Number(priceRaw);
      if (Number.isFinite(n)) price = n;
      else { price = 0; rowInvalid++; }
    }
    if (weightRaw !== '') {
      const n = Number(weightRaw);
      if (Number.isFinite(n)) weight = n;
      else { weight = 0; rowInvalid++; }
    }
    if (qtyRaw !== '') {
      const n = Number(qtyRaw);
      if (Number.isFinite(n) && n > 0) quantity = Math.round(n);
      else { quantity = 1; rowInvalid++; }
    }
    if (rowInvalid > 0) invalidNumeric++;

    const item = createItem({
      categoryGroup: get('categoryGroup'),
      category: get('category'),
      name: get('name'),
      brand: get('brand'),
      price,
      weight,
      weightUnit: get('weightUnit'),
      quantity,
      acquired: parseBoolean(get('acquired')),
      notes: get('notes'),
      link: get('link'),
    });

    const missing = [];
    if (!item.name) missing.push('name');
    if (!item.categoryGroup && !item.category) missing.push('categoryGroup/category');
    if (missing.length) {
      warnings.push(`Row ${r + 1}: missing ${missing.join(', ')} — row skipped.`);
      continue;
    }
    items.push(item);
  }

  if (invalidNumeric > 0) {
    warnings.push(
      `${invalidNumeric} row(s) had invalid price/weight and were set to 0.`
    );
  }
  return { items, warnings };
}
