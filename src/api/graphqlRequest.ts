const GRAPHQL_LOCAL_ENDPOINT = "http://localhost:3000/graphql";

export type GraphQLError = {
  message: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
};

export type GraphQLResponse<TData> = {
  data?: TData;
  errors?: GraphQLError[];
};

type GraphQLRequestOptions<TVariables> = {
  variables?: TVariables;
  operationName?: string;
  signal?: AbortSignal;
};

export async function graphqlRequest<
  TData,
  TVariables = Record<string, unknown>,
>(
  query: string,
  options: GraphQLRequestOptions<TVariables> = {},
): Promise<GraphQLResponse<TData>> {
  const response = await fetch(GRAPHQL_LOCAL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: options.variables,
      operationName: options.operationName,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(
      `GraphQL request failed: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const result: GraphQLResponse<TData> = await response.json();

  return result;
}