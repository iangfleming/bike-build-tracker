import { uuid, nowIso, toNumber } from './utils.js';
import { DEFAULT_CATEGORY_NAMES, defaultItemsFor } from './categories.js';

export function createItem(partial = {}) {
  return {
    id: partial.id || uuid(),
    category: partial.category || '',
    name: partial.name || '',
    brand: partial.brand || '',
    price: toNumber(partial.price),
    weight: toNumber(partial.weight),
    quantity: Math.max(1, toNumber(partial.quantity) || 1),
    notes: partial.notes || '',
    link: partial.link || '',
    acquired: parseBooleanValue(partial.acquired),
    default: Boolean(partial.default),
  };
}

function parseBooleanValue(value) {
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'y'].includes(value.trim().toLowerCase());
  }
  return Boolean(value);
}

export function normalizeItem(item) {
  return createItem(item);
}

function seedDefaultItems(categories) {
  const items = [];
  for (const category of DEFAULT_CATEGORY_NAMES) {
    if (!categories.includes(category)) continue;
    for (const name of defaultItemsFor(category)) {
      items.push(createItem({ category, name, default: true }));
    }
  }
  return items;
}

export function createBuild(partial = {}) {
  const categories = Array.isArray(partial.categories)
    ? partial.categories.filter((c) => typeof c === 'string' && c.trim())
    : [...DEFAULT_CATEGORY_NAMES];
  const items = Array.isArray(partial.items)
    ? partial.items.map(normalizeItem)
    : seedDefaultItems(categories);
  return {
    id: partial.id || uuid(),
    name: partial.name || 'My Build',
    currencySymbol: partial.currencySymbol || '$',
    createdAt: partial.createdAt || nowIso(),
    updatedAt: partial.updatedAt || nowIso(),
    categories,
    items,
  };
}

export function normalizeBuild(build) {
  return createBuild(build);
}

export function realItems(items) {
  return items.filter((i) => !i.default);
}

export function categoryList(build) {
  return build.categories;
}

export function itemsInCategory(build, category) {
  return build.items.filter((item) => item.category === category);
}

export function sumItems(items, acquiredOnly) {
  let price = 0;
  let weight = 0;
  let count = 0;
  for (const item of items) {
    if (acquiredOnly !== undefined && item.acquired !== acquiredOnly) continue;
    price += item.price * item.quantity;
    weight += item.weight * item.quantity;
    count += item.quantity;
  }
  return { price, weight, count };
}

export function categorySubtotal(build, category) {
  return sumItems(
    build.items.filter(
      (i) => i.category === category && !i.default
    )
  );
}

export function buildTotals(build) {
  const real = realItems(build.items);
  const all = sumItems(real);
  const acquired = sumItems(real, true);
  return {
    price: all.price,
    weight: all.weight,
    itemCount: all.count,
    priceAcquired: acquired.price,
    weightAcquired: acquired.weight,
    countAcquired: acquired.count,
    countRemaining: all.count - acquired.count,
    priceRemaining: all.price - acquired.price,
  };
}