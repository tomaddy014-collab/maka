// Thin persistence layer. Every read/write goes through get/set so the
// backing store can be swapped (e.g. for a real backend/database) without
// touching any calling code.

const PREFIX = "meal-planner:";

function get(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[storage] failed to read "${key}"`, err);
    return fallback;
  }
}

function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[storage] failed to write "${key}"`, err);
    return false;
  }
}

function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
    return true;
  } catch (err) {
    console.error(`[storage] failed to remove "${key}"`, err);
    return false;
  }
}

export const store = { get, set, remove };

export function getPlan(weekKey) {
  return get(`plan:${weekKey}`, {});
}

export function setPlan(weekKey, plan) {
  return set(`plan:${weekKey}`, plan);
}

export function getFavorites() {
  return get("favorites", []);
}

export function setFavorites(favorites) {
  return set("favorites", favorites);
}

export function getShoppingList(weekKey) {
  return get(`shoppinglist:${weekKey}`, null);
}

export function setShoppingList(weekKey, list) {
  return set(`shoppinglist:${weekKey}`, list);
}

export function getWeeksIndex() {
  return get("weeks-index", {});
}

export function setWeeksIndex(index) {
  return set("weeks-index", index);
}
