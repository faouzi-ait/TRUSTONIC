import DeviceConsole from "./components/DeviceConsole";
import { useTenant } from "./context/TenantContext";
import { DeviceLockProvider } from "./context/DeviceLockContext";
import "./App.css";

function App() {
  const { tenantId, setTenantId } = useTenant();

  return (
    <>
      <header>
        <label>
          Tenant{" "}
          <select
            value={tenantId}
            onChange={(event) => {
              const value = event.target.value;

              if (value === "tenant-alpha" || value === "tenant-beta") {
                setTenantId(value);
              }
            }}
          >
            <option value="tenant-alpha">Tenant Alpha</option>
            <option value="tenant-beta">Tenant Beta</option>
          </select>
        </label>
      </header>

      <DeviceLockProvider key={tenantId}>
        <DeviceConsole />
      </DeviceLockProvider>
    </>
  );
}

export default App;
