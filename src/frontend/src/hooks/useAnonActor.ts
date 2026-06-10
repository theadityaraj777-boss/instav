// Anonymous actor utility — for public (no-auth-required) backend reads.
// Uses createActorWithConfig with no identity, which means Internet Computer
// treats the caller as the anonymous principal.
import { createActorWithConfig } from "@caffeineai/core-infrastructure";
import type { backendInterface } from "../backend";
import { createActor } from "../backend";

let _anonActor: backendInterface | null = null;

export async function getAnonActor(): Promise<backendInterface> {
  if (_anonActor) return _anonActor;
  const actor = await createActorWithConfig(createActor);
  _anonActor = actor;
  return actor;
}
