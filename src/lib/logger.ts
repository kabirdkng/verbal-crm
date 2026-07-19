export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export function log(level: LogLevel, message: string, fields: LogFields = {}): void {
  const line = {
    level,
    message,
    service: "verbal-crm",
    ts: new Date().toISOString(),
    ...fields
  };
  const serialized = JSON.stringify(line);
  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

export function createRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}
