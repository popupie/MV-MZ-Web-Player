// @ts-nocheck

export function patchLocalStorage(namespace) {
  const original = {
    getItem: Storage.prototype.getItem,
    setItem: Storage.prototype.setItem,
    removeItem: Storage.prototype.removeItem,
    clear: Storage.prototype.clear,
    key: Storage.prototype.key,
    length: Object.getOwnPropertyDescriptor(Storage.prototype, "length"),
  };

  const namespaced = (key) => String(key).startsWith(namespace) ? String(key) : `${namespace}${String(key)}`;
  const isLocal = (target) => target === window.localStorage;
  const localKeys = () => {
    const keys = [];
    for (let index = 0; index < original.length.get.call(window.localStorage); index += 1) {
      const key = original.key.call(window.localStorage, index);
      if (key && key.startsWith(namespace)) keys.push(key);
    }
    return keys;
  };

  Storage.prototype.getItem = function (key) {
    return original.getItem.call(this, isLocal(this) ? namespaced(key) : key);
  };
  Storage.prototype.setItem = function (key, value) {
    return original.setItem.call(this, isLocal(this) ? namespaced(key) : key, value);
  };
  Storage.prototype.removeItem = function (key) {
    return original.removeItem.call(this, isLocal(this) ? namespaced(key) : key);
  };
  Storage.prototype.clear = function () {
    if (!isLocal(this)) return original.clear.call(this);
    for (const key of localKeys()) original.removeItem.call(this, key);
    return undefined;
  };
  Storage.prototype.key = function (index) {
    if (!isLocal(this)) return original.key.call(this, index);
    const key = localKeys()[index] || null;
    return key ? key.slice(namespace.length) : null;
  };

  try {
    Object.defineProperty(Storage.prototype, "length", {
      configurable: true,
      get() {
        if (this !== window.localStorage) return original.length.get.call(this);
        return localKeys().length;
      },
    });
  } catch {
    // Some browsers may not allow overriding the getter; RPG Maker uses methods.
  }
}
