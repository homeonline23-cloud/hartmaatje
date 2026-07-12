import path from "path";

export function memoryBaseDir(): string {
  return process.env.MEMORY_DATA_PATH?.trim() || path.join(process.cwd(), "data", "memory");
}

export function safeResidentFileName(residentId: string): string {
  return residentId.replace(/[^\w\-]/g, "_").slice(0, 80) || "guest";
}
