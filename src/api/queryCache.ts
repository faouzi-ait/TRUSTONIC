import {
  graphqlRequest,
  type GraphQLResponse,
} from "./graphqlRequest";

export const QUERY_CACHE_TTL_MS = 30_000;

type CacheConsumer = {
  onInvalidate: () => void;
  onUpdate: (response: GraphQLResponse<unknown>) => void;
};

type CacheEntry = {
  response?: GraphQLResponse<unknown>;
  completedAt: number;
  pending?: Promise<GraphQLResponse<unknown>>;
  controller?: AbortController;
  queryKeys: Set<string>;
  consumers: Set<CacheConsumer>;
};

type CacheRequest<TData, TVars> = {
  query: string;
  variables?: TVars;
  queryKey?: string;
  force?: boolean;
  onInvalidate: () => void;
  onUpdate: (response: GraphQLResponse<TData>) => void;
};

type RequestHandle<TData> = {
  promise: Promise<GraphQLResponse<TData>>;
  release: () => void;
};

const cache = new Map<string, CacheEntry>();

// Sort object keys so variable property order does not affect identity.
export function serializeVariables(value: unknown): string {
  return (
    JSON.stringify(value, (_key, item) =>
      item !== null && typeof item === "object" && !Array.isArray(item)
        ? Object.fromEntries(
            Object.keys(item)
              .sort()
              .map((key) => [key, item[key]]),
          )
        : item,
    ) ?? "undefined"
  );
}

export function createCacheKey(
  query: string,
  variables: unknown,
): string {
  return JSON.stringify([query, serializeVariables(variables)]);
}

export function acquireQuery<TData, TVars>({
  query,
  variables,
  queryKey,
  force = false,
  onInvalidate,
  onUpdate,
}: CacheRequest<TData, TVars>): RequestHandle<TData> {
  const cacheKey = createCacheKey(query, variables);

  let entry = cache.get(cacheKey);

  if (!entry) {
    entry = {
      completedAt: 0,
      queryKeys: new Set(),
      consumers: new Set(),
    };

    cache.set(cacheKey, entry);
  }

  const currentEntry = entry;

  if (queryKey !== undefined) {
    currentEntry.queryKeys.add(queryKey);
  }

  const consumer: CacheConsumer = {
    onInvalidate,
    onUpdate: (response) => {
      onUpdate(response as GraphQLResponse<TData>);
    },
  };

  currentEntry.consumers.add(consumer);

  const fresh =
    currentEntry.response !== undefined &&
    Date.now() - currentEntry.completedAt < QUERY_CACHE_TTL_MS;

  let promise = currentEntry.pending;

  if (!promise && !force && fresh) {
    promise = Promise.resolve(currentEntry.response!);
  }

  if (!promise) {
    const controller = new AbortController();
    currentEntry.controller = controller;

    const request = graphqlRequest<unknown, TVars>(query, {
      variables,
      signal: controller.signal,
    })
      .then((response) => {
        if (
          !controller.signal.aborted &&
          cache.get(cacheKey) === currentEntry
        ) {
          currentEntry.response = response;
          currentEntry.completedAt = Date.now();

          for (const consumer of [...currentEntry.consumers]) {
            consumer.onUpdate(response);
          }
        }

        return response;
      })
      .finally(() => {
        if (currentEntry.controller === controller) {
          currentEntry.controller = undefined;
          currentEntry.pending = undefined;
        }
      });

    currentEntry.pending = request;
    promise = request;
  }

  return {
    promise: promise as Promise<GraphQLResponse<TData>>,

    release() {
      currentEntry.consumers.delete(consumer);

      // Allow another consumer to attach before aborting.
      queueMicrotask(() => {
        if (
          currentEntry.consumers.size === 0 &&
          currentEntry.pending &&
          cache.get(cacheKey) === currentEntry
        ) {
          cache.delete(cacheKey);
          currentEntry.controller?.abort();
        }
      });
    },
  };
}

function removeEntry(cacheKey: string, entry: CacheEntry): void {
  cache.delete(cacheKey);
  entry.controller?.abort();

  for (const consumer of [...entry.consumers]) {
    consumer.onInvalidate();
  }

  entry.consumers.clear();
}

export function invalidateQueryKey(queryKey: string): void {
  for (const [cacheKey, entry] of cache) {
    if (entry.queryKeys.has(queryKey)) {
      removeEntry(cacheKey, entry);
    }
  }
}

export function invalidateQuery(
  query: string,
  variables: unknown,
): void {
  const cacheKey = createCacheKey(query, variables);
  const entry = cache.get(cacheKey);

  if (entry) {
    removeEntry(cacheKey, entry);
  }
}

export function updateQueryKey<TData>(
  queryKey: string,
  update: (data: TData) => TData,
): void {
  for (const entry of cache.values()) {
    if (
      !entry.queryKeys.has(queryKey) ||
      entry.response?.data === undefined
    ) {
      continue;
    }

    const previousData = entry.response.data as TData;
    const nextData = update(previousData);

    if (Object.is(previousData, nextData)) continue;

    // Stop a pending response from overwriting this update.
    entry.controller?.abort();
    entry.controller = undefined;
    entry.pending = undefined;

    const response: GraphQLResponse<unknown> = {
      ...entry.response,
      data: nextData,
    };

    entry.response = response;

    for (const consumer of [...entry.consumers]) {
      consumer.onUpdate(response);
    }
  }
}