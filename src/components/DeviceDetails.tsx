import { useEffect, useRef } from "react";
import DeviceActions from "./DeviceActions";
import { useDeviceLocks } from "../context/DeviceLockContext";
import { useTenant } from "../context/TenantContext";
import { useTenantQuery } from "../hooks/useTenantQuery";
import { DeviceDetail } from "../api/devices.queries";
import { invalidateQueryKey, updateQueryKey } from "../api/queryCache";
import type {
  DeviceDetailData,
  DeviceDetailVariables,
  ListDevicesData,
} from "../api/devices.types";

type DeviceDetailProps = {
  deviceId: string;
};

type ReconciliationState = {
  started: boolean;
  completed: boolean;
  previousDetail: DeviceDetailData["deviceDetail"] | undefined;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "Unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString();
}

function DeviceDetails({ deviceId }: DeviceDetailProps) {
  const { tenantId } = useTenant();

  const { lockedDeviceIds, confirmedDeviceIds, completeLock } =
    useDeviceLocks();

  const isMarkedLocked = lockedDeviceIds.has(deviceId);
  const needsReconciliation = confirmedDeviceIds.has(deviceId);

  const reconciliationRef = useRef<ReconciliationState>({
    started: false,
    completed: false,
    previousDetail: undefined,
  });

  const { data, loading, errors, refetch } = useTenantQuery<
    DeviceDetailData,
    DeviceDetailVariables
  >(DeviceDetail, {
    variables: { deviceId },
    fetchFirst: true,
    queryKey: `device-detail:${deviceId}`,
  });

  const device = data?.deviceDetail;
  const imeis = device?.IMEIs?.filter((item) => item !== null) ?? [];

  // Fetch confirmed details after a successful mutation.
  // This also runs if the user returns to an unreconciled device.
  useEffect(() => {
    if (!needsReconciliation) {
      reconciliationRef.current = {
        started: false,
        completed: false,
        previousDetail: undefined,
      };

      return;
    }

    if (reconciliationRef.current.started) return;

    reconciliationRef.current = {
      started: true,
      completed: false,
      previousDetail: device,
    };

    void refetch();
  }, [needsReconciliation, device, refetch]);

  // Reconcile only after a new detail response shows LOCKED.
  useEffect(() => {
    const reconciliation = reconciliationRef.current;

    if (
      !needsReconciliation ||
      !reconciliation.started ||
      reconciliation.completed ||
      loading ||
      !device ||
      device.id !== deviceId ||
      device === reconciliation.previousDetail ||
      device.state?.name !== "LOCKED"
    ) {
      return;
    }

    reconciliation.completed = true;

    const confirmedState = device.state;
    const listKey = JSON.stringify([tenantId, "devices"]);
    const historyKey = JSON.stringify([tenantId, `device-history:${deviceId}`]);

    updateQueryKey<ListDevicesData>(listKey, (cachedData) => {
      const list = cachedData.listDevices;

      if (!list?.deviceList?.some((row) => row?.id === deviceId)) {
        return cachedData;
      }

      return {
        ...cachedData,
        listDevices: {
          ...list,
          deviceList: list.deviceList.map((row) =>
            row?.id === deviceId
              ? {
                  ...row,
                  state: confirmedState,
                  policy: device.policy ?? row.policy,
                  lastCheckin: device.lastCheckin?.date ?? row.lastCheckin,
                }
              : row,
          ),
        },
      };
    });

    // Clear all cached history pages for this device.
    invalidateQueryKey(historyKey);

    // Remove the override and advance the device's history version.
    completeLock(deviceId);
  }, [needsReconciliation, loading, device, deviceId, tenantId, completeLock]);

  return (
    <section aria-labelledby="device-detail-heading" aria-busy={loading}>
      <h2 id="device-detail-heading">Device details</h2>

      {loading && <p role="status">Loading device details…</p>}

      {errors.length > 0 && (
        <div role="alert">
          <p>
            {device
              ? "Some device details could not be loaded."
              : "Device details could not be loaded."}
          </p>

          <ul>
            {errors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {needsReconciliation && !loading && errors.length > 0 && (
        <div>
          <p>
            The lock succeeded, but refreshing its confirmed details encountered
            an error.
          </p>

          <button type="button" onClick={() => void refetch()}>
            Retry details
          </button>
        </div>
      )}

      {!loading && errors.length === 0 && !device && (
        <p>No device details were returned.</p>
      )}

      {device && (
        <div className="device-card">
          <header className="device-card__header">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={loading}
            >
              {loading ? "Loading…" : "Refresh details"}
            </button>

            <div>
              <p className="device-card__eyebrow">
                {device.deviceBrandName ?? "Unknown brand"}
              </p>

              <h3>{device.deviceModelMarketingName ?? "Unknown model"}</h3>
            </div>

            <span className="device-card__state">
              {isMarkedLocked
                ? "LOCKED"
                : (device.state?.name ?? "State unavailable")}
            </span>
          </header>

          <dl className="device-card__fields">
            <div className="device-card__field">
              <dt>Serial number</dt>
              <dd className="device-card__identifier">
                {device.serialNumber ?? "Unavailable"}
              </dd>
            </div>

            <div className="device-card__field">
              <dt>Policy</dt>
              <dd>{device.policy?.name ?? "Unavailable"}</dd>
            </div>

            <div className="device-card__field device-card__field--wide">
              <dt>IMEIs</dt>
              <dd>
                {imeis.length > 0 ? (
                  <ul className="device-card__imeis">
                    {imeis.map((item, index) => (
                      <li key={`${item.imei}-${index}`}>
                        <span className="device-card__identifier">
                          {item.imei ?? "Unavailable"}
                        </span>

                        {item.isPrimary && (
                          <span className="device-card__primary">Primary</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  "Unavailable"
                )}
              </dd>
            </div>

            <div className="device-card__field">
              <dt>IMSI</dt>
              <dd className="device-card__identifier">
                {device.imsi ?? "Unavailable"}
              </dd>
            </div>

            <div className="device-card__field">
              <dt>Locale</dt>
              <dd>{device.locale ?? "Unavailable"}</dd>
            </div>

            <div className="device-card__field">
              <dt>Last check-in</dt>
              <dd>{formatDate(device.lastCheckin?.date)}</dd>
            </div>

            <div className="device-card__field">
              <dt>Enrolled</dt>
              <dd>{formatDate(device.firstEnrollAt)}</dd>
            </div>
          </dl>

          {device.state ? (
            <DeviceActions
              key={deviceId}
              deviceId={deviceId}
              stateId={device.state.id}
            />
          ) : (
            <p className="device-card__actions">
              Available actions require a device state.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default DeviceDetails;
