import {create} from "zustand";
import {zustandStoreType} from "./zustandStoreType";

export const useZustandStore = create<zustandStoreType>((set) => ({
  temp: "temp",
}));
