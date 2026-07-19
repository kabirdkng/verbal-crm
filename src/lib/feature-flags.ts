import { getStore } from "@/lib/store";

export function isFeatureEnabled(key: string, organizationId?: string): boolean {
  const flags = getStore().featureFlags;
  const orgFlag = organizationId
    ? flags.find((flag) => flag.key === key && flag.organizationId === organizationId)
    : undefined;
  if (orgFlag) {
    return orgFlag.enabled;
  }
  const globalFlag = flags.find((flag) => flag.key === key && flag.organizationId === null);
  return globalFlag?.enabled ?? true;
}

export function setFeatureFlag(
  key: string,
  enabled: boolean,
  organizationId: string | null = null
): void {
  const store = getStore();
  const existing = store.featureFlags.find(
    (flag) => flag.key === key && flag.organizationId === organizationId
  );
  if (existing) {
    existing.enabled = enabled;
    return;
  }
  store.featureFlags.push({ key, organizationId, enabled });
}
