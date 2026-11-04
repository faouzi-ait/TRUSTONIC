// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { graphql, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import { ListDevices } from "../api/devices.queries";
import type {
  ListDevicesData,
  ListDevicesVariables,
} from "../api/devices.types";
import { invalidateQueryKey } from "../api/queryCache";
import { useQuery } from "./useQuery";

const server = setupServer();
const endpoint = graphql.link("http://localhost:3000/graphql");
const QUERY_KEY = "search-test";

function deferred() {
  let resolve!: () => void;

  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });

  return { promise, resolve };
}

function deviceResponse(
  id: string,
  serialNumber: string,
): ListDevicesData {
  return {
    listDevices: {
      pageInfo: { total_count: 1 },
      deviceList: [
        {
          id,
          serialNumber,
          modelMarketingName: "Galaxy S23",
          brandName: "Samsung",
          IMEIs: [
            {
              imei: "356000000007919",
              isPrimary: true,
            },
          ],
          state: {
            id: 2,
            name: "ACTIVE",
          },
          policy: {
            id: "pol-1",
            name: "Financing Baseline",
            color: "#2f8f4e",
          },
          lastCheckin: "2026-11-01T12:00:00.000Z",
        },
      ],
    },
  };
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  invalidateQueryKey(QUERY_KEY);
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("useQuery", () => {
  it("does not let an older response overwrite a newer search result", async () => {
    const olderResponse = deferred();
    const newerResponse = deferred();

    const oldSerial = "SN-0001-A";
    const newSerial = "SN-0005-A";
    const startedRequests: string[] = [];

    server.use(
      endpoint.query("ListDevices", async ({ variables }) => {
        const serialNumber = String(variables.serialNumber);
        startedRequests.push(serialNumber);

        if (serialNumber === oldSerial) {
          await olderResponse.promise;

          return HttpResponse.json({
            data: deviceResponse("dev-0001", oldSerial),
          });
        }

        if (serialNumber === newSerial) {
          await newerResponse.promise;

          return HttpResponse.json({
            data: deviceResponse("dev-0005", newSerial),
          });
        }

        return HttpResponse.json({
          errors: [{ message: "Unexpected search variables" }],
        });
      }),
    );

    const { result, rerender, unmount } = renderHook(
      ({ serialNumber }: { serialNumber: string }) => {
        // Keep the older shared request alive after selection changes.
        const retained = useQuery<
          ListDevicesData,
          ListDevicesVariables
        >(ListDevices, {
          variables: {
            tenantId: "tenant-alpha",
            serialNumber: oldSerial,
            page: 1,
            pageSize: 5,
          },
          fetchFirst: true,
          queryKey: QUERY_KEY,
        });

        const selected = useQuery<
          ListDevicesData,
          ListDevicesVariables
        >(ListDevices, {
          variables: {
            tenantId: "tenant-alpha",
            serialNumber,
            page: 1,
            pageSize: 5,
          },
          fetchFirst: true,
          queryKey: QUERY_KEY,
        });

        return { retained, selected };
      },
      {
        initialProps: { serialNumber: oldSerial },
      },
    );

    try {
      await waitFor(() => {
        expect(startedRequests).toEqual([oldSerial]);
      });

      rerender({ serialNumber: newSerial });

      await waitFor(() => {
        expect(startedRequests).toEqual([oldSerial, newSerial]);
      });

      // Finish the newer request first.
      await act(async () => {
        newerResponse.resolve();
      });

      await waitFor(() => {
        expect(
          result.current.selected.data?.listDevices?.deviceList?.[0]
            ?.serialNumber,
        ).toBe(newSerial);

        expect(result.current.selected.loading).toBe(false);
      });

      // Finish the older request afterwards.
      await act(async () => {
        olderResponse.resolve();
      });

      // Confirm that the late response actually reached its consumer.
      await waitFor(() => {
        expect(
          result.current.retained.data?.listDevices?.deviceList?.[0]
            ?.serialNumber,
        ).toBe(oldSerial);

        expect(result.current.retained.loading).toBe(false);
      });

      expect(
        result.current.selected.data?.listDevices?.deviceList?.[0]
          ?.serialNumber,
      ).toBe(newSerial);

      expect(result.current.selected.loading).toBe(false);
      expect(result.current.selected.errors).toEqual([]);
    } finally {
      unmount();
      olderResponse.resolve();
      newerResponse.resolve();
    }
  });
});