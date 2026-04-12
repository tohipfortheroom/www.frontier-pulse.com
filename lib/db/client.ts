import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedReadClient: SupabaseClient | null = null;
let cachedServiceClient: SupabaseClient | null = null;

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
}

function createSupabaseClient(key: string) {
  return createClient(getSupabaseUrl(), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function isSupabaseReadConfigured() {
  return Boolean(getSupabaseUrl() && (getSupabaseServiceRoleKey() || getSupabaseAnonKey()));
}

export function isSupabaseServiceConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

export function getSupabaseReadClient() {
  if (!isSupabaseReadConfigured()) {
    return null;
  }

  if (!cachedReadClient) {
    cachedReadClient = createSupabaseClient(getSupabaseServiceRoleKey() || getSupabaseAnonKey());
  }

  return cachedReadClient;
}

export function getSupabaseServiceClient() {
  if (!isSupabaseServiceConfigured()) {
    return null;
  }

  if (!cachedServiceClient) {
    cachedServiceClient = createSupabaseClient(getSupabaseServiceRoleKey());
  }

  return cachedServiceClient;
}

export function getSupabaseServerClient() {
  return getSupabaseReadClient();
}
