export function isAdminEnabled() {
  return process.env.NODE_ENV === "development" || process.env.ADMIN_ENABLED === "true";
}
