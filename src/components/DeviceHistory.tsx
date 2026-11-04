import { useState } from "react";
import { ListDeviceHistory } from "../api/devices.queries";
import type {
  ListDeviceHistoryData,
  ListDeviceHistoryVariables,
} from "../api/devices.types";
import { useTenantQuery } from "../hooks/useTenantQuery";

type DeviceHistoryProps = {
  deviceId: string;
};

const HISTORY_PAGE_SIZE = 5;

function formatTimestamp(value: string | null): string {
  if (!value) return "Unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : date.toLocaleString();
}

function DeviceHistory({ deviceId }: DeviceHistoryProps) {
  const [page, setPage] = useState(1);

  const { data, loading, errors } = useTenantQuery<
    ListDeviceHistoryData,
    ListDeviceHistoryVariables
  >(ListDeviceHistory, {
    variables: {
      deviceId,
      page,
      pageSize: HISTORY_PAGE_SIZE,
    },
    fetchFirst: true,
    queryKey: `device-history:${deviceId}`,
  });

  const history = data?.listDeviceHistory;
  const totalCount = history?.pageInfo?.total_count ?? 0;
  const pageCount = Math.ceil(totalCount / HISTORY_PAGE_SIZE);

  const entries =
    history?.histories?.filter((entry) => entry !== null) ?? [];

  return (
    <section
      className="device-history"
      aria-labelledby="device-history-heading"
      aria-busy={loading}
    >
      <header className="device-history__header">
        <div>
          <p className="device-history__eyebrow">Audit trail</p>
          <h2 id="device-history-heading">Device history</h2>
        </div>

        {history && (
          <span className="device-history__count">
            {totalCount} entries
          </span>
        )}
      </header>

      {loading && (
        <p className="device-history__message" role="status">
          Loading device history…
        </p>
      )}

      {errors.length > 0 && (
        <div className="device-history__error" role="alert">
          <ul>
            {errors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {!loading && history && errors.length === 0 && entries.length === 0 && (
        <div className="device-history__empty">
          <p>No history entries</p>
          <span>This page has no recorded history.</span>
        </div>
      )}

      {entries.length > 0 && (
        <div className="device-history__table-wrapper">
          <table className="device-history__table">
            <thead>
              <tr>
                <th scope="col">Event type</th>
                <th scope="col">Policy transition</th>
                <th scope="col">Timestamp</th>
                <th scope="col">Operator email</th>
              </tr>
            </thead>

            <tbody>
              {entries.map((entry, index) => (
                <tr key={`${page}-${entry.createdAt}-${index}`}>
                  <td>
                    <span className="device-history__event">
                      {entry.type ?? "Unavailable"}
                    </span>
                  </td>

                  <td>
                    <div className="device-history__transition">
                      <span>{entry.policyName ?? "Unavailable"}</span>
                      <span className="device-history__arrow">→</span>
                      <span>{entry.nextPolicyName ?? "Unavailable"}</span>
                    </div>
                  </td>

                  <td className="device-history__date">
                    {formatTimestamp(entry.createdAt)}
                  </td>

                  <td className="device-history__email">
                    {entry.email ?? "Unavailable"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 0 && (
        <nav
          className="device-history__pagination"
          aria-label="Device history pagination"
        >
          <button
            type="button"
            onClick={() => setPage((previous) => previous - 1)}
            disabled={loading || page <= 1}
          >
            Previous
          </button>

          <span aria-live="polite">
            Page <strong>{page}</strong> of {pageCount}
          </span>

          <button
            type="button"
            onClick={() => setPage((previous) => previous + 1)}
            disabled={loading || page >= pageCount}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}

export default DeviceHistory;