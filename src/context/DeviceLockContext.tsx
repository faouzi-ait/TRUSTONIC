import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type DeviceLockState = {
  lockedDeviceIds: Set<string>;
  confirmedDeviceIds: Set<string>;
  historyVersions: Record<string, number>;
};

type DeviceLockContextValue = {
  lockedDeviceIds: ReadonlySet<string>;
  confirmedDeviceIds: ReadonlySet<string>;
  historyVersions: Readonly<Record<string, number>>;
  markLocked: (deviceId: string) => void;
  restoreDevice: (deviceId: string) => void;
  confirmLock: (deviceId: string) => void;
  completeLock: (deviceId: string) => void;
};

const DeviceLockContext = createContext<DeviceLockContextValue | undefined>(
  undefined,
);

export function DeviceLockProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DeviceLockState>(() => ({
    lockedDeviceIds: new Set(),
    confirmedDeviceIds: new Set(),
    historyVersions: {},
  }));

  const markLocked = useCallback((deviceId: string) => {
    setState((previous) => {
      const lockedDeviceIds = new Set(previous.lockedDeviceIds);
      const confirmedDeviceIds = new Set(previous.confirmedDeviceIds);

      lockedDeviceIds.add(deviceId);
      confirmedDeviceIds.delete(deviceId);

      return {
        ...previous,
        lockedDeviceIds,
        confirmedDeviceIds,
      };
    });
  }, []);

  const restoreDevice = useCallback((deviceId: string) => {
    setState((previous) => {
      const lockedDeviceIds = new Set(previous.lockedDeviceIds);
      const confirmedDeviceIds = new Set(previous.confirmedDeviceIds);

      lockedDeviceIds.delete(deviceId);
      confirmedDeviceIds.delete(deviceId);

      return {
        ...previous,
        lockedDeviceIds,
        confirmedDeviceIds,
      };
    });
  }, []);

  const confirmLock = useCallback((deviceId: string) => {
    setState((previous) => {
      const confirmedDeviceIds = new Set(previous.confirmedDeviceIds);
      confirmedDeviceIds.add(deviceId);

      return {
        ...previous,
        confirmedDeviceIds,
      };
    });
  }, []);

  const completeLock = useCallback((deviceId: string) => {
    setState((previous) => {
      if (!previous.confirmedDeviceIds.has(deviceId)) {
        return previous;
      }

      const lockedDeviceIds = new Set(previous.lockedDeviceIds);
      const confirmedDeviceIds = new Set(previous.confirmedDeviceIds);

      lockedDeviceIds.delete(deviceId);
      confirmedDeviceIds.delete(deviceId);

      return {
        lockedDeviceIds,
        confirmedDeviceIds,
        historyVersions: {
          ...previous.historyVersions,
          [deviceId]: (previous.historyVersions[deviceId] ?? 0) + 1,
        },
      };
    });
  }, []);

  return (
    <DeviceLockContext.Provider
      value={{
        ...state,
        markLocked,
        restoreDevice,
        confirmLock,
        completeLock,
      }}
    >
      {children}
    </DeviceLockContext.Provider>
  );
}

export function useDeviceLocks(): DeviceLockContextValue {
  const context = useContext(DeviceLockContext);

  if (context === undefined) {
    throw new Error("useDeviceLocks must be used inside DeviceLockProvider.");
  }

  return context;
}
