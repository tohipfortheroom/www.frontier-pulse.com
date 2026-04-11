function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = typeof record.message === "string" ? record.message : null;
    const details = typeof record.details === "string" ? record.details : null;
    const hint = typeof record.hint === "string" ? record.hint : null;
    const combined = [message, details, hint].filter(Boolean).join(" | ");

    if (combined) {
      return combined;
    }

    return safeStringify(error) ?? "Unknown error";
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "Unknown error";
}

export function isSupabaseMissingTableError(error: unknown, tableName?: string) {
  const message = getErrorMessage(error).toLowerCase();
  const missingTable =
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"));

  if (!missingTable) {
    return false;
  }

  if (!tableName) {
    return true;
  }

  return message.includes(tableName.toLowerCase());
}
