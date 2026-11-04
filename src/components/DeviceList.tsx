import { useDeviceLocks } from "../context/DeviceLockContext";
import type { DeviceListRow } from "../api/devices.types";

export type SearchBy = "serialNumber" | "imei";

type DeviceListProps = {
  devices: Array<DeviceListRow | null>;
  totalCount: number;
  loading: boolean;
  hasData: boolean;
  errors: string[];
  searchText: string;
  onSearchChange: (value: string) => void;
  searchBy: SearchBy;
  onSearchByChange: (value: SearchBy) => void;
  stateFilter: number | "";
  onStateFilterChange: (value: number | "") => void;
  page: number;
  pageCount: number;
  onPrevious: () => void;
  onNext: () => void;
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
};

function DeviceList({
  devices,
  totalCount,
  loading,
  hasData,
  errors,
  searchText,
  onSearchChange,
  searchBy,
  onSearchByChange,
  stateFilter,
  onStateFilterChange,
  page,
  pageCount,
  onPrevious,
  onNext,
  selectedDeviceId,
  onSelectDevice,
}: DeviceListProps) {
  const { lockedDeviceIds } = useDeviceLocks();
  const searchLabel = searchBy === "imei" ? "IMEI" : "serial number";

  const rows = devices.filter(
    (device): device is DeviceListRow => device !== null,
  );

  return (
    <section
      className="device-list"
      aria-labelledby="devices-heading"
      aria-busy={loading}
    >
      <header className="device-list__header">
        <div>
          <p className="device-list__eyebrow">Device management</p>
          <h1 id="devices-heading">Devices</h1>
        </div>

        {hasData && (
          <span className="device-list__count">{totalCount} devices</span>
        )}
      </header>

      <div className="device-list__toolbar">
        <label className="device-list__control">
          <span>Search by</span>
          <select
            value={searchBy}
            onChange={(event) =>
              onSearchByChange(
                event.target.value === "imei" ? "imei" : "serialNumber",
              )
            }
          >
            <option value="serialNumber">Serial number</option>
            <option value="imei">IMEI</option>
          </select>
        </label>

        <label className="device-list__control device-list__control--search">
          <span>Search {searchLabel}</span>
          <input
            type="search"
            value={searchText}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={
              searchBy === "imei" ? "Enter an IMEI" : "Enter a serial number"
            }
          />
        </label>

        <label className="device-list__control">
          <span>State</span>
          <select
            value={stateFilter}
            onChange={(event) => {
              const value = event.target.value;
              onStateFilterChange(value === "" ? "" : Number(value));
            }}
          >
            <option value="">All states</option>
            <option value={1}>Enrolled</option>
            <option value={2}>Active</option>
            <option value={3}>Locked</option>
            <option value={4}>Released</option>
          </select>
        </label>
      </div>

      {errors.length > 0 && (
        <div className="device-list__error" role="alert">
          <ul>
            {errors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {loading && (
        <p className="device-list__message" role="status">
          Loading devices…
        </p>
      )}

      {!loading && hasData && errors.length === 0 && rows.length === 0 && (
        <div className="device-list__empty">
          <p>No matching devices</p>
          <span>Try another search or change the state filter.</span>
        </div>
      )}

      {rows.length > 0 && (
        <div className="device-list__table-wrapper">
          <table className="device-list__table">
            <thead>
              <tr>
                <th scope="col">Serial number</th>
                <th scope="col">Primary IMEI</th>
                <th scope="col">Model</th>
                <th scope="col">State</th>
                <th scope="col">Last check-in</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((device) => {
                const primaryImei = device.IMEIs?.find(
                  (item) => item?.isPrimary,
                )?.imei;

                const selected = selectedDeviceId === device.id;

                return (
                  <tr
                    key={device.id}
                    className={
                      selected ? "device-list__row--selected" : undefined
                    }
                  >
                    <td>
                      <button
                        className="device-list__serial"
                        type="button"
                        onClick={() => onSelectDevice(device.id)}
                        aria-pressed={selected}
                      >
                        {device.serialNumber ?? "Serial number unavailable"}
                      </button>
                    </td>

                    <td className="device-list__identifier">
                      {primaryImei ?? "—"}
                    </td>

                    <td>{device.modelMarketingName ?? "—"}</td>

                    <td>
                      <span className="device-list__state">
                        {lockedDeviceIds.has(device.id)
                          ? "LOCKED"
                          : (device.state?.name ?? "Unavailable")}
                      </span>
                    </td>

                    <td className="device-list__date">
                      {device.lastCheckin
                        ? new Date(device.lastCheckin).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 0 && (
        <nav
          className="device-list__pagination"
          aria-label="Device list pagination"
        >
          <button
            type="button"
            onClick={onPrevious}
            disabled={loading || page <= 1}
          >
            Previous
          </button>

          <span aria-live="polite">
            Page <strong>{page}</strong> of {pageCount}
          </span>

          <button
            type="button"
            onClick={onNext}
            disabled={loading || page >= pageCount}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}

export default DeviceList;
