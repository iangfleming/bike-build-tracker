import { uuid, nowIso, toNumber } from './utils.js';

export const GRAM_MULTIPLIERS = { g: 1, oz: 28.349523125 };

export function createItem(partial = {}) {
  return {
    id: partial.id || uuid(),
    categoryGroup: partial.categoryGroup || '',
    category: partial.category || '',
    name: partial.name || '',
    brand: partial.brand || '',
    price: toNumber(partial.price),
    weight: toNumber(partial.weight),
    quantity: Math.max(1, toNumber(partial.quantity) || 1),
    notes: partial.notes || '',
    link: partial.link || '',
    acquired: parseBooleanValue(partial.acquired),
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

export function createBuild(partial = {}, categoryGroups) {
  return {
    id: partial.id || uuid(),
    name: partial.name || 'My Build',
    weightUnit: partial.weightUnit === 'oz' ? 'oz' : 'g',
    currencySymbol: partial.currencySymbol || '$',
    createdAt: partial.createdAt || nowIso(),
    updatedAt: partial.updatedAt || nowIso(),
    items: Array.isArray(partial.items)
      ? partial.items.map(normalizeItem)
      : [],
  };
}

export function normalizeBuild(build, categoryGroups) {
  return createBuild(build, categoryGroups);
}

export function categoryGroupList(categoryGroups) {
  return categoryGroups.map((g) => g.name);
}

export function categoryList(categoryGroups) {
  return categoryGroups.flatMap((g) => g.categories);
}

export function itemsInCategory(build, categoryGroup, category) {
  return build.items.filter(
    (item) => item.categoryGroup === categoryGroup && item.category === category
  );
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

export function groupSubtotal(build, groupName) {
  return sumItems(build.items.filter((i) => i.categoryGroup === groupName));
}

export function categorySubtotal(build, categoryGroup, category) {
  return sumItems(
    build.items.filter(
      (i) => i.categoryGroup === categoryGroup && i.category === category
    )
  );
}

export function buildTotals(build) {
  const all = sumItems(build.items);
  const acquired = sumItems(build.items, true);
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
