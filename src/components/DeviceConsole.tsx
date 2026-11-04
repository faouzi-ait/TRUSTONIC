import { useEffect, useState } from "react";
import DeviceHistory from "./DeviceHistory";
import DeviceList, { type SearchBy } from "./DeviceList";
import DeviceDetail from "./DeviceDetails";
import { useDeviceLocks } from "../context/DeviceLockContext";
import { ListDevices } from "../api/devices.queries";
import type {
  ListDevicesData,
  ListDevicesVariables,
} from "../api/devices.types";
import { useTenantQuery } from "../hooks/useTenantQuery";

const PAGE_SIZE = 5;
const SEARCH_DELAY_MS = 300;

const DeviceConsole = () => {
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [searchBy, setSearchBy] = useState<SearchBy>("serialNumber");
  const { historyVersions } = useDeviceLocks();
  const [stateFilter, setStateFilter] = useState<number | "">("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  useEffect(() => {
    const nextSearch = searchText.trim();
    if (nextSearch === appliedSearch) return;

    const timeoutId = window.setTimeout(() => {
      setAppliedSearch(nextSearch);
      setPage(1);
    }, SEARCH_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchText, appliedSearch]);

  function changeSearchBy(nextSearchBy: SearchBy) {
    setSearchBy(nextSearchBy);
    setPage(1);
  }

  function changeStateFilter(nextState: number | "") {
    setStateFilter(nextState);
    setPage(1);
  }

  const variables: Omit<ListDevicesVariables, "tenantId"> = {
    page,
    pageSize: PAGE_SIZE,
  };

  if (stateFilter !== "") variables.stateId = stateFilter;
  if (appliedSearch !== "") variables[searchBy] = appliedSearch;

  const { data, loading, errors, refetch } = useTenantQuery<
    ListDevicesData,
    ListDevicesVariables
  >(ListDevices, {
    variables,
    fetchFirst: true,
    queryKey: "devices",
  });

  const result = data?.listDevices;
  const devices = result?.deviceList ?? [];
  const totalCount = result?.pageInfo?.total_count ?? 0;
  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <main>
      <button type="button" onClick={() => void refetch()} disabled={loading}>
        {loading ? "Loading…" : "Refresh"}
      </button>

      <div className="device-console">
        <div className="device-console__list">
          <DeviceList
            loading={loading}
            devices={devices}
            searchText={searchText}
            searchBy={searchBy}
            stateFilter={stateFilter}
            hasData={result != null}
            page={pageCount === 0 ? 0 : page}
            pageCount={pageCount}
            totalCount={totalCount}
            onSearchChange={setSearchText}
            onSearchByChange={changeSearchBy}
            onStateFilterChange={changeStateFilter}
            onPrevious={() => setPage(page - 1)}
            onNext={() => setPage(page + 1)}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={setSelectedDeviceId}
            errors={errors}
          />
        </div>

        <aside className="device-console__detail" aria-label="Selected device">
          {selectedDeviceId ? (
            <>
              <DeviceDetail
                key={`detail:${selectedDeviceId}`}
                deviceId={selectedDeviceId}
              />

              <DeviceHistory
                key={`history:${selectedDeviceId}:${
                  historyVersions[selectedDeviceId] ?? 0
                }`}
                deviceId={selectedDeviceId}
              />
            </>
          ) : (
            <p>Select a device to view its details.</p>
          )}
        </aside>
      </div>
    </main>
  );
};

export default DeviceConsole;
