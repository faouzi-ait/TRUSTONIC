import { useCallback, useEffect, useRef, useState } from "react";
import { graphqlRequest } from "../api/graphqlRequest";

type MutationState = {
  loading: boolean;
  errors: string[];
};

type MutationOptions<TVars> = {
  variables?: TVars;
  throwError?: boolean;
};

export type UseMutationResult<TData, TVars> = MutationState & {
  mutateData: (
    variables?: TVars,
    replace?: boolean,
  ) => Promise<TData | undefined>;
};

export function useMutation<TData, TVars>(
  query: string,
  { variables, throwError = false }: MutationOptions<TVars>,
): UseMutationResult<TData, TVars> {
  const [state, setState] = useState<MutationState>({
    loading: false,
    errors: [],
  });

  const lifecycle = useRef({
    mounted: false,
    generation: 0,
    pending: 0,
    latestRequest: 0,
  });

  useEffect(() => {
    lifecycle.current.mounted = true;

    return () => {
      lifecycle.current.mounted = false;
      lifecycle.current.generation += 1;
      lifecycle.current.pending = 0;
    };
  }, []);

  const mutateData = useCallback(
    async (
      nextVariables?: TVars,
      replace = false,
    ): Promise<TData | undefined> => {
      const current = lifecycle.current;

      if (!current.mounted) return undefined;

      const generation = current.generation;
      const requestId = ++current.latestRequest;

      current.pending += 1;

      let requestVariables = variables;

      if (replace) {
        requestVariables = nextVariables;
      } else if (nextVariables !== undefined) {
        requestVariables = {
          ...variables,
          ...nextVariables,
        } as TVars;
      }

      const isActive = () =>
        current.mounted && current.generation === generation;

      const isLatest = () => isActive() && current.latestRequest === requestId;

      setState({ loading: true, errors: [] });

      try {
        const result = await graphqlRequest<TData, TVars>(query, {
          variables: requestVariables,
        });

        if (result.errors?.length) {
          const messages = result.errors.map((error) => error.message);

          if (isLatest()) {
            setState((previous) => ({
              ...previous,
              errors: messages,
            }));
          }

          if (throwError) {
            throw new Error(messages.join("\n"));
          }

          return undefined;
        }

        return result.data;
      } catch (error: unknown) {
        const mutationError =
          error instanceof Error ? error : new Error("Mutation failed.");

        if (isLatest()) {
          setState((previous) => ({
            ...previous,
            errors:
              previous.errors.length > 0
                ? previous.errors
                : [mutationError.message],
          }));
        }

        if (throwError) {
          throw mutationError;
        }

        return undefined;
      } finally {
        if (isActive()) {
          current.pending -= 1;

          setState((previous) => ({
            ...previous,
            loading: current.pending > 0,
          }));
        }
      }
    },
    [query, variables, throwError],
  );

  return {
    ...state,
    mutateData,
  };
}
