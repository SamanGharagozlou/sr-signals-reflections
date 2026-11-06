import { useCallback, useEffect, useState } from "react";
import { fastapiAdapter } from "./fastapi-adapter";
import type { SignalApi } from "./types";

/** Real FastAPI adapter; all persistent demo state is held by the Python service. */
export const api: SignalApi = fastapiAdapter;
export const IS_MOCK = false;

type Q<T> = { status: "loading" } | { status: "error"; error: Error & { status?: number } } | { status: "ok"; data: T };

export function useApi<T>(fn: () => Promise<T>) {
  const [q, setQ] = useState<Q<T>>({ status: "loading" });
  const run = useCallback(() => {
    fn().then((data) => setQ({ status: "ok", data }), (error) => setQ({ status: "error", error }));
    // stable per mount; call refresh after mutations
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { run(); }, [run]);
  return { ...q, refresh: run };
}
