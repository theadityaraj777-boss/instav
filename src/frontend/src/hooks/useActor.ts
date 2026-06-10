// Thin wrapper: useActor pre-bound to the backend's createActor function.
// This keeps all other files unchanged — they import from "./useActor" and get
// a pre-wired hook that returns { actor: backendInterface | null, isFetching }.
import { useActor as _useActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";

export function useActor() {
  return _useActor(createActor);
}
