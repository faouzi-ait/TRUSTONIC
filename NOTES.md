# ALPS Device Console — Implementation Notes

- **Data layer.** Plain `fetch`, custom query/mutation hooks, and a shared cache use the supplied schema, mocks, and operations.

- **Race protection.** Request IDs and released subscriptions prevent older responses from overwriting newer state. Shared requests are aborted when no consumers remain.

- **Tenant isolation.** Tenant wrappers inject the context's `tenantId` into every request. Cache entries and query keys include the tenant. Switching tenants remounts the console, clearing displayed data and local state while retaining separate cached results.

- **Caching.** A **30-second TTL** balances reuse with freshness. Identical pending requests share one promise. Automatic queries reuse fresh results, expired entries revalidate when requested, and manual refetch requests fresh data.

- **Search.** A 300 ms debounce and Serial number/IMEI selector send one search field at a time. Search and filter changes reset pagination.

- **Optimistic locking.** A shared context immediately shows LOCKED in both list and detail. Failure removes the override and restores both views. This avoids separate rollback paths and normalized storage.

- **Reconciliation.** Success refreshes details, patches affected cached list rows, and invalidates device history without refetching the entire list. Entity-based invalidation would require an index linking tenant/device IDs to affected queries.

- **Partial responses.** Usable data remains visible alongside GraphQL errors. Missing IMSI and policy display as unavailable.

- **Testing.** The passing Vitest/`renderHook` test uses controlled MSW responses to verify that an older response arriving last cannot overwrite newer results. It also checks request deduplication.

## Known gaps and next steps
- Update filtered-list membership and totals after locking.
- Complete reconciliation independently of whether the detail panel remains open.
- Handle missing confirmed policy and null/unexpected detail responses.
- Verify rollback, pending tenant switches, partial responses, and independent history failures.
- Run final tests, build, and lint checks.

Authentication, routing, persistence, internationalization, and advanced cache features were left outside scope.
