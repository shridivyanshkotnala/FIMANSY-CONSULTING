import { useGetDSOQuery } from "@/Redux/Slices/api/cashIntelligenceApi";
import { DSOUI } from "./DSOUI.jsx";

// Destructure and discard metrics/months/loading so a parent
// can never accidentally override what RTK Query fetches.
export function DSOTracker({ metrics: _m, months: _mo, loading: _l, ...rest }) {
  // isFetching covers the window between mount and fresh response:
  // without it the component would render stale cached null-metrics.
  const { data, isLoading, isFetching } = useGetDSOQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  return (
    <DSOUI
      {...rest}
      months={data?.months ?? []}
      metrics={data?.metrics ?? null}
      loading={isLoading || isFetching}
    />
  );
}

export default DSOTracker;