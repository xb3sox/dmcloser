import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request trace carried across an HTTP request, the jobs it queues and the
 * provider calls those jobs make. Node's async context follows the promise
 * chain, so a queued job captures the id without threading it through every
 * function signature.
 */
const storage = new AsyncLocalStorage<string>();

export function withTraceId<T>(id: string | undefined, run: () => T): T {
  return id ? storage.run(id, run) : run();
}

export function traceId(): string | undefined {
  return storage.getStore();
}
