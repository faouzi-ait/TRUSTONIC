import { useCallback } from "react";
import { useTenant } from "../context/TenantContext";
import { useMutation } from "./useMutation";

type TenantVariables = {
  tenantId: string;
};

type CallerVariables<TVars extends TenantVariables> = Omit<TVars, "tenantId">;

type TenantMutationOptions<TVars extends TenantVariables> = {
  variables?: CallerVariables<TVars>;
  throwError?: boolean;
};

export function useTenantMutation<TData, TVars extends TenantVariables>(
  query: string,
  options: TenantMutationOptions<TVars>,
) {
  const { tenantId } = useTenant();

  const { mutateData, ...result } = useMutation<TData, TVars>(query, {
    ...options,
    variables: {
      ...options.variables,
      tenantId,
    } as TVars,
  });

  const tenantMutateData = useCallback(
    (
      variables?: CallerVariables<TVars>,
      replace = false,
    ): Promise<TData | undefined> =>
      mutateData(
        {
          ...variables,
          tenantId,
        } as TVars,
        replace,
      ),
    [mutateData, tenantId],
  );

  return {
    ...result,
    mutateData: tenantMutateData,
  };
}
