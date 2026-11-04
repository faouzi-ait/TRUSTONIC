import { useCallback, useEffect, useRef, useState } from "react";

import {
  acquireQuery,
  invalidateQuery,
  invalidateQueryKey,
  serializeVariables,
} from "../api/queryCache";

type QueryState<TData> = {
  loading: boolean;
  errors: string[];
  data: TData | undefined;
};

type QueryOptions<TVars> = {
  variables?: TVars;
  fetchFirst?: boolean;
  queryKey?: string;
};

export type UseQueryResult<TData, TVars> = QueryState<TData> & {
  refetch: (variables?: TVars, replace?: boolean) => Promise<void>;
  reset: (queryKey?: string) => void;
};

export function useQuery<TData, TVars>(
  query: string,
  { variables, fetchFirst = false, queryKey }: QueryOptions<TVars>,
): UseQueryResult<TData, TVars> {
  const [state, setState] = useState<QueryState<TData>>({
    loading: false,
    errors: [],
    data: undefined,
  });

  const releaseRef = useRef<(() => void) | null>(null);
  const requestIdRef = useRef(0);
  const activeVariablesRef = useRef<TVars | undefined>(undefined);

  const variablesKey = serializeVariables(variables);

  const cancel = useCallback(() => {
    requestIdRef.current += 1;
    releaseRef.current?.();
    releaseRef.current = null;
  }, []);

  const clearLocalState = useCallback(() => {
    cancel();

    setState({
      loading: false,
      errors: [],
      data: undefined,
    });
  }, [cancel]);

  const execute = useCallback(
    async (
      nextVariables?: TVars,
      replace = false,
      force = false,
    ): Promise<void> => {
      cancel();

      const requestId = requestIdRef.current;

      const configuredVariables: TVars | undefined =
        variablesKey === "undefined"
          ? undefined
          : JSON.parse(variablesKey);

      let requestVariables = configuredVariables;

      if (replace) {
        requestVariables = nextVariables;
      } else if (nextVariables !== undefined) {
        requestVariables = {
          ...configuredVariables,
          ...nextVariables,
        } as TVars;
      }

      activeVariablesRef.current = requestVariables;

      setState((previous) => ({
        ...previous,
        loading: true,
        errors: [],
      }));

      // A cache notification supersedes this promise's result or error.
      let receivedCacheUpdate = false;

      const handle = acquireQuery<TData, TVars>({
        query,
        variables: requestVariables,
        queryKey,
        force,
        onInvalidate: clearLocalState,

        onUpdate: (response) => {
          if (requestId !== requestIdRef.current) return;

          receivedCacheUpdate = true;

          setState({
            loading: false,
            data: response.data,
            errors: response.errors?.map((error) => error.message) ?? [],
          });
        },
      });

      releaseRef.current = handle.release;

      try {
        const result = await handle.promise;

        if (
          requestId !== requestIdRef.current ||
          receivedCacheUpdate
        ) {
          return;
        }

        // Fresh cached responses arrive through the promise.
        setState({
          loading: false,
          data: result.data,
          errors: result.errors?.map((error) => error.message) ?? [],
        });
      } catch (error: unknown) {
        if (
          requestId !== requestIdRef.current ||
          receivedCacheUpdate
        ) {
          return;
        }

        setState((previous) => ({
          ...previous,
          loading: false,
          errors: [
            error instanceof Error ? error.message : "Request failed.",
          ],
        }));
      }
    },
    [query, variablesKey, queryKey, cancel, clearLocalState],
  );

  const refetch = useCallback(
    (nextVariables?: TVars, replace = false): Promise<void> =>
      execute(nextVariables, replace, true),
    [execute],
  );

  const reset = useCallback(
    (key?: string): void => {
      const targetKey = key ?? queryKey;

      if (targetKey !== undefined) {
        invalidateQueryKey(targetKey);
      } else {
        invalidateQuery(query, activeVariablesRef.current);
      }

      clearLocalState();
    },
    [query, queryKey, clearLocalState],
  );

  useEffect(() => {
    cancel();

    setState((previous) => ({
      ...previous,
      loading: false,
    }));

    if (fetchFirst) {
      void execute();
    }

    return cancel;
  }, [execute, fetchFirst, cancel]);

  return {
    ...state,
    refetch,
    reset,
  };
}