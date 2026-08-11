import type { HostAdapter } from "./types";

// The open host-adapter registry — the runtime side of the symmetric plugin model (ARCHITECTURE
// §12). Built-ins register through the SAME door a third party uses; nothing is privileged. Lookup
// is by id (for multi-host analysis / capability discovery); the default path imports the reference
// adapter directly, so it never depends on registration order.
const registry = new Map<string, HostAdapter>();

/** Register a host adapter (idempotent by id). A third-party adapter is a first-class citizen here. */
export function registerHostAdapter(adapter: HostAdapter): void {
  registry.set(adapter.id, adapter);
}

/** Look up a registered adapter by id, else undefined. */
export function getHostAdapter(id: string): HostAdapter | undefined {
  return registry.get(id);
}

/** All registered adapters — for discovery (e.g. an agent asking "which hosts are supported?"). */
export function listHostAdapters(): HostAdapter[] {
  return [...registry.values()];
}
