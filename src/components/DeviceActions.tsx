import { useEffect, useRef, useState } from "react";
import { useDeviceLocks } from "../context/DeviceLockContext";
import { ListAvailableActions } from "../api/devices.queries";
import { AssignAction } from "../api/devices.mutations";
import type {
  AssignActionData,
  AssignActionVariables,
  ListAvailableActionsData,
  ListAvailableActionsVariables,
} from "../api/devices.types";
import { useTenantQuery } from "../hooks/useTenantQuery";
import { useTenantMutation } from "../hooks/useTenantMutation";

type DeviceActionsProps = {
  deviceId: string;
  stateId: number;
};

type ActionFeedback = {
  success: boolean;
  error: string;
};

function DeviceActions({
  deviceId,
  stateId,
}: DeviceActionsProps) {
  const {
    lockedDeviceIds,
    markLocked,
    restoreDevice,
    confirmLock,
  } = useDeviceLocks();

  const [feedback, setFeedback] = useState<ActionFeedback>({
    success: false,
    error: "",
  });

  const mountedRef = useRef(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const {
    data,
    loading: actionsLoading,
    errors: actionErrors,
    refetch,
  } = useTenantQuery<
    ListAvailableActionsData,
    ListAvailableActionsVariables
  >(ListAvailableActions, {
    variables: {
      stateId: String(stateId),
    },
    fetchFirst: true,
    queryKey: `available-actions:${stateId}`,
  });

  const { loading: locking, mutateData } = useTenantMutation<
    AssignActionData,
    AssignActionVariables
  >(AssignAction, {
    throwError: true,
  });

  const actions = data?.listAvailableActions;

  const lockAction = actions?.find(
    (action) => action?.actionName === "Lock device",
  );

  const hasLockOverride = lockedDeviceIds.has(deviceId);

  async function lockDevice(): Promise<void> {
    if (
      !lockAction ||
      submittingRef.current ||
      hasLockOverride ||
      feedback.success
    ) {
      return;
    }

    submittingRef.current = true;
    setFeedback({ success: false, error: "" });
    markLocked(deviceId);

    try {
      const result = await mutateData({
        deviceId,
        actionId: lockAction.id,
      });

      if (result?.assignAction !== true) {
        throw new Error("The server did not confirm the device lock.");
      }
    } catch (error: unknown) {
      restoreDevice(deviceId);

      if (mountedRef.current) {
        setFeedback({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "The device could not be locked.",
        });
      }

      return;
    } finally {
      submittingRef.current = false;
    }

    // Preserve confirmation if the user selected another device.
    confirmLock(deviceId);

    if (mountedRef.current) {
      setFeedback({ success: true, error: "" });
    }
  }

  return (
    <div
      className="device-card__actions"
      aria-busy={actionsLoading || locking}
    >
      <h4>Available actions</h4>

      {actionsLoading && (
        <p role="status">Loading available actions…</p>
      )}

      {actionErrors.length > 0 && (
        <div role="alert">
          <ul>
            {actionErrors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => void refetch()}
            disabled={actionsLoading || locking}
          >
            Retry actions
          </button>
        </div>
      )}

      {feedback.error && (
        <p role="alert">{feedback.error}</p>
      )}

      {feedback.success && (
        <p role="status">Device locked successfully.</p>
      )}

      {!actionsLoading && actionErrors.length === 0 && lockAction && (
        <button
          type="button"
          onClick={() => void lockDevice()}
          disabled={locking || hasLockOverride || feedback.success}
        >
          {locking
            ? "Locking device…"
            : hasLockOverride || feedback.success
              ? "Device locked"
              : "Lock device"}
        </button>
      )}

      {!actionsLoading &&
        actionErrors.length === 0 &&
        actions &&
        !lockAction && (
          <p>Lock device is unavailable in the current state.</p>
        )}
    </div>
  );
}

export default DeviceActions;