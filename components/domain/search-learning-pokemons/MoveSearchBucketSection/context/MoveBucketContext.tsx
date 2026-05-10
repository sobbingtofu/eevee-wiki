"use client";

import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";

interface MoveBucketContextValue {
  moveBucketIds: number[];
  addMoveBucketId: (moveId: number) => void;
  removeMoveBucketId: (moveId: number) => void;
  clearMoveBucketIds: () => void;
}

const MoveBucketContext = createContext<MoveBucketContextValue | null>(null);

export function MoveBucketProvider({children}: {children: ReactNode}) {
  const [moveBucketIds, setMoveBucketIds] = useState<number[]>([]);

  const addMoveBucketId = useCallback((moveId: number) => {
    setMoveBucketIds((prev) => (prev.includes(moveId) ? prev : [...prev, moveId]));
  }, []);

  const removeMoveBucketId = useCallback((moveId: number) => {
    setMoveBucketIds((prev) => prev.filter((id) => id !== moveId));
  }, []);

  const clearMoveBucketIds = useCallback(() => {
    setMoveBucketIds([]);
  }, []);

  const value = useMemo(
    () => ({moveBucketIds, addMoveBucketId, removeMoveBucketId, clearMoveBucketIds}),
    [moveBucketIds, addMoveBucketId, removeMoveBucketId, clearMoveBucketIds],
  );

  return <MoveBucketContext.Provider value={value}>{children}</MoveBucketContext.Provider>;
}

export function useMoveBucketContext() {
  const context = useContext(MoveBucketContext);
  if (!context) {
    throw new Error("useMoveBucketContext must be used within MoveBucketProvider");
  }

  return context;
}
