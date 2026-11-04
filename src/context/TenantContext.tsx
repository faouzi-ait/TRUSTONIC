import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type TenantId = "tenant-alpha" | "tenant-beta";

type TenantContextValue = {
  tenantId: TenantId;
  setTenantId: (tenantId: TenantId) => void;
};

const TenantContext = createContext<TenantContextValue | undefined>(
  undefined,
);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState<TenantId>("tenant-alpha");

  return (
    <TenantContext.Provider value={{ tenantId, setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);

  if (context === undefined) {
    throw new Error("useTenant must be used inside TenantProvider.");
  }

  return context;
}