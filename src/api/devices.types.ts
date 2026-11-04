type PageInfo = {
  total_count: number | null;
};

type DeviceImei = {
  imei: string | null;
  isPrimary: boolean | null;
};

type DeviceState = {
  id: number;
  name: string | null;
};

type DevicePolicy = {
  id: string;
  name: string | null;
  color: string | null;
};

// ListDevices
export type DeviceListRow = {
  id: string;
  serialNumber: string | null;
  modelMarketingName: string | null;
  brandName: string | null;
  IMEIs: Array<DeviceImei | null> | null;
  state: DeviceState | null;
  policy: DevicePolicy;
  lastCheckin: string | null;
};

export type ListDevicesData = {
  listDevices: {
    pageInfo: PageInfo | null;
    deviceList: Array<DeviceListRow | null> | null;
  } | null;
};

export type ListDevicesVariables = {
  tenantId: string;
  imei?: string | null;
  serialNumber?: string | null;
  stateId?: number | null;
  page?: number | null;
  pageSize?: number | null;
};

// DeviceDetail
export type DeviceDetailData = {
  deviceDetail: {
    id: string;
    serialNumber: string | null;
    deviceBrandName: string | null;
    deviceModelMarketingName: string | null;
    imsi: string | null;
    locale: string | null;
    firstEnrollAt: string | null;
    IMEIs: Array<DeviceImei | null> | null;
    state: DeviceState | null;
    policy: DevicePolicy | null;
    lastCheckin: {
      label: string | null;
      date: string | null;
      color: string | null;
    } | null;
  } | null;
};

export type DeviceDetailVariables = {
  tenantId: string;
  deviceId: string;
};

// ListDeviceHistory
export type ListDeviceHistoryData = {
  listDeviceHistory: {
    histories: Array<{
      type: string | null;
      createdAt: string | null;
      email: string | null;
      policyName: string | null;
      nextPolicyName: string | null;
      actionName: string | null;
    } | null> | null;
    pageInfo: PageInfo | null;
  } | null;
};

export type ListDeviceHistoryVariables = {
  tenantId: string;
  deviceId: string;
  page?: number | null;
  pageSize?: number | null;
};

// ListAvailableActions
export type ListAvailableActionsData = {
  listAvailableActions: Array<{
    id: string;
    actionName: string | null;
    policyName: string | null;
    stateId: number | null;
  } | null> | null;
};

export type ListAvailableActionsVariables = {
  tenantId: string;
  stateId?: string | null;
};

// AssignAction
export type AssignActionData = {
  assignAction: boolean | null;
};

export type AssignActionVariables = {
  tenantId: string;
  deviceId: string;
  actionId: string;
};
