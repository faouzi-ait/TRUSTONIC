import { useCallback } from "react";
import { useTenant } from "../context/TenantContext";
import { useQuery } from "./useQuery";

type TenantVariables = {
  tenantId: string;
};

type CallerVariables<TVars extends TenantVariables> = Omit<
  TVars,
  "tenantId"
>;

type TenantQueryOptions<TVars extends TenantVariables> = {
  variables?: CallerVariables<TVars>;
  fetchFirst?: boolean;
  queryKey?: string;
};

function scopeQueryKey(tenantId: string, queryKey: string): string {
  return JSON.stringify([tenantId, queryKey]);
}

export function useTenantQuery<
  TData,
  TVars extends TenantVariables,
>(
  query: string,
  options: TenantQueryOptions<TVars>,
) {
  const { tenantId } = useTenant();

  const scopedKey =
    options.queryKey === undefined
      ? undefined
      : scopeQueryKey(tenantId, options.queryKey);

  const { refetch, reset, ...result } = useQuery<TData, TVars>(
    query,
    {
      ...options,
      queryKey: scopedKey,
      variables: {
        ...options.variables,
        tenantId,
      } as TVars,
    },
  );

  const tenantRefetch = useCallback(
    (
      variables?: CallerVariables<TVars>,
      replace = false,
    ): Promise<void> =>
      refetch(
        {
          ...variables,
          tenantId,
        } as TVars,
        replace,
      ),
    [refetch, tenantId],
  );

  const tenantReset = useCallback(
    (queryKey?: string): void =>
      reset(
        queryKey === undefined
          ? undefined
          : scopeQueryKey(tenantId, queryKey),
      ),
    [reset, tenantId],
  );

  return {
    ...result,
    refetch: tenantRefetch,
    reset: tenantReset,
  };
}