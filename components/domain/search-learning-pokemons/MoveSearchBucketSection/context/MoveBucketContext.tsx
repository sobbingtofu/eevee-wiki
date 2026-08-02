"use client";

import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";
import type {MoveSearchItem} from "@/types/apiTypes";

/**
 * 드롭다운에서 이미 알고 있는 기술의 미리보기 정보
 * (상세 정보 fetch 중 MoveBucketItem에서 먼저 표시하는 용도)
 */
export type MoveBucketPreview = Pick<MoveSearchItem, "koreanName" | "korType">;

interface MoveBucketContextValue {
  moveBucketIds: number[];
  moveBucketPreviews: Record<number, MoveBucketPreview>;
  addMoveBucketId: (item: MoveSearchItem) => void;
  removeMoveBucketId: (moveId: number) => void;
  clearMoveBucketIds: () => void;
}

const MoveBucketContext = createContext<MoveBucketContextValue | null>(null);

interface MoveBucketProviderProps {
  children: ReactNode;
  /**
   * 바구니의 초기 내용 (첫 렌더에서만 반영됨)
   *
   * 뒤로가기로 돌아왔을 때 URL에 실려 있던 기술들을 다시 채워 넣는 용도임
   * 이게 없으면 오른쪽에는 결과가 떠 있는데 왼쪽 바구니만 비어 보임
   * 미리보기 정보는 없지만 `MoveBucketItem`이 알아서 상세를 받아오므로 표시에 문제 없음
   */
  initialMoveIds?: number[];
}

export function MoveBucketProvider({children, initialMoveIds = []}: MoveBucketProviderProps) {
  const [moveBucketIds, setMoveBucketIds] = useState<number[]>(initialMoveIds);
  const [moveBucketPreviews, setMoveBucketPreviews] = useState<Record<number, MoveBucketPreview>>({});

  const addMoveBucketId = useCallback((item: MoveSearchItem) => {
    setMoveBucketIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    setMoveBucketPreviews((prev) => ({
      ...prev,
      [item.id]: {koreanName: item.koreanName, korType: item.korType},
    }));
  }, []);

  const removeMoveBucketId = useCallback((moveId: number) => {
    setMoveBucketIds((prev) => prev.filter((id) => id !== moveId));
    setMoveBucketPreviews((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {[moveId]: _removed, ...rest} = prev;
      return rest;
    });
  }, []);

  const clearMoveBucketIds = useCallback(() => {
    setMoveBucketIds([]);
    setMoveBucketPreviews({});
  }, []);

  const value = useMemo(
    () => ({moveBucketIds, moveBucketPreviews, addMoveBucketId, removeMoveBucketId, clearMoveBucketIds}),
    [moveBucketIds, moveBucketPreviews, addMoveBucketId, removeMoveBucketId, clearMoveBucketIds],
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
