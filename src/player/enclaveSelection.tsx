import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { EnclaveRole } from '@/web3/enclaves';

export type EnclavePick = {
  id: string;
  roles: EnclaveRole[];
};

type Selection = {
  pick: EnclavePick | null;
  revision: number;
  select: (pick: EnclavePick | null) => void;
  refresh: () => void;
};

const Ctx = createContext<Selection | null>(null);

export function EnclaveSelectionProvider({ children }: { children: ReactNode }) {
  const [pick, setPick] = useState<EnclavePick | null>(null);
  const [revision, setRevision] = useState(0);
  const value = useMemo<Selection>(
    () => ({
      pick,
      revision,
      select: setPick,
      refresh: () => setRevision((current) => current + 1),
    }),
    [pick, revision],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEnclaveSelection() {
  const value = useContext(Ctx);
  if (value) return value;
  return {
    pick: null,
    revision: 0,
    select: () => undefined,
    refresh: () => undefined,
  } satisfies Selection;
}
