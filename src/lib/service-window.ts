const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isWithinServiceWindow(lastInboundAt: Date | null, now: Date = new Date()): boolean {
  if (!lastInboundAt) {
    return false;
  }
  return now.getTime() - lastInboundAt.getTime() <= SERVICE_WINDOW_MS;
}

export function serviceWindowExpiresAt(lastInboundAt: Date | null): Date | null {
  if (!lastInboundAt) {
    return null;
  }
  return new Date(lastInboundAt.getTime() + SERVICE_WINDOW_MS);
}
