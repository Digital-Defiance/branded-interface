/**
 * Watch module for observing branded interface creation and validation events.
 *
 * Uses a watcher registry on `globalThis` under '__brandedInterfaceWatchers__'
 * to track callbacks. The factory's create() and validate() functions call
 * notifyWatchers() to invoke registered callbacks.
 */

import {
  BrandedInterfaceDefinition,
  InterfaceWatchCallback,
  InterfaceEventType,
  InterfaceAccessEvent,
} from './types.js';

// =============================================================================
// Watcher Registry
// =============================================================================

const WATCHER_REGISTRY_KEY = '__brandedInterfaceWatchers__' as const;

interface WatcherRegistry {
  watchers: Map<string, Set<InterfaceWatchCallback>>;
  globalWatchers: Set<InterfaceWatchCallback>;
}

function getWatcherRegistry(): WatcherRegistry {
  const g = globalThis as Record<string, unknown>;
  if (!g[WATCHER_REGISTRY_KEY]) {
    g[WATCHER_REGISTRY_KEY] = {
      watchers: new Map<string, Set<InterfaceWatchCallback>>(),
      globalWatchers: new Set<InterfaceWatchCallback>(),
    };
  }
  return g[WATCHER_REGISTRY_KEY] as WatcherRegistry;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Watch a branded interface definition for create and validate events.
 * Returns an object with an `unwatch()` function to remove the callback.
 */
export function watchInterface(
  definition: BrandedInterfaceDefinition,
  callback: InterfaceWatchCallback
): { unwatch: () => void } {
  const registry = getWatcherRegistry();
  const interfaceId = definition.id;

  if (!registry.watchers.has(interfaceId)) {
    registry.watchers.set(interfaceId, new Set());
  }

  registry.watchers.get(interfaceId)!.add(callback);

  return {
    unwatch: () => {
      const callbacks = registry.watchers.get(interfaceId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          registry.watchers.delete(interfaceId);
        }
      }
    },
  };
}

// =============================================================================
// Notification Helper (called by factory.ts)
// =============================================================================

/**
 * Notify all registered watchers for a given interface ID.
 * Called by factory's create() and validate() functions.
 */
export function notifyWatchers(
  interfaceId: string,
  eventType: InterfaceEventType,
  value: unknown
): void {
  const g = globalThis as Record<string, unknown>;
  const registry = g[WATCHER_REGISTRY_KEY] as WatcherRegistry | undefined;
  if (!registry) return;

  const event: InterfaceAccessEvent = {
    interfaceId,
    eventType,
    value,
    timestamp: Date.now(),
  };

  const callbacks = registry.watchers.get(interfaceId);
  if (callbacks) {
    for (const cb of callbacks) {
      cb(event);
    }
  }

  for (const cb of registry.globalWatchers) {
    cb(event);
  }
}
