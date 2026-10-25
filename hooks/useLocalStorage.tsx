import React, { useCallback, useRef, useSyncExternalStore } from 'react';

const listeners = new Map<string, Set<() => void>>();
const notify = (key: string) => listeners.get(key)?.forEach((listener) => listener());
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.storageArea && event.storageArea !== window.localStorage) return;
    if (event.key === null) listeners.forEach((_, key) => notify(key));
    else notify(event.key);
  });
}

/**
 * `isValid` guards against values another version of the app (or a hand edit)
 * left in storage: anything it rejects reads as the initial value instead of
 * crashing the render.
 */
export function useLocalStorage<T,>(key: string, initialValue: T | (() => T), isValid?: (value: unknown) => value is T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const fallback = useRef<{ key: string; value: T } | null>(null);
  const validator = useRef(isValid);
  validator.current = isValid;
  if (!fallback.current || fallback.current.key !== key) {
    fallback.current = { key, value: typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue };
  }
  const cache = useRef<{ key: string; raw: string | null; value: T } | null>(null);
  const getSnapshot = useCallback(() => {
    let raw: string | null = null;
    try { raw = window.localStorage.getItem(key); } catch {
      return cache.current?.key === key ? cache.current.value : fallback.current!.value;
    }
    if (cache.current?.key === key && cache.current.raw === raw) return cache.current.value;
    let value = fallback.current!.value;
    try {
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (!validator.current || validator.current(parsed)) value = parsed as T;
      }
    } catch { /* Never overwrite invalid storage on mount. */ }
    cache.current = { key, raw, value };
    return value;
  }, [key]);
  const subscribe = useCallback((listener: () => void) => {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(listener);
    return () => {
      listeners.get(key)?.delete(listener);
      if (!listeners.get(key)?.size) listeners.delete(key);
    };
  }, [key]);
  const storedValue = useSyncExternalStore(subscribe, getSnapshot, () => fallback.current!.value);
  const setValue = useCallback<React.Dispatch<React.SetStateAction<T>>>((update) => {
    const value = typeof update === 'function' ? (update as (previous: T) => T)(getSnapshot()) : update;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      notify(key);
    } catch (error) {
      console.error('Browser settings could not be saved.');
      // App.tsx turns this into a toast so a full browser store is not silent.
      window.dispatchEvent(new CustomEvent('local-storage-error', { detail: { key, error } }));
    }
  }, [getSnapshot, key]);
  return [storedValue, setValue];
}
