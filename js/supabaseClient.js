import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
  "https://cuhcscpvhypoaplcmtjk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNDI4MjgsImV4cCI6MjA2MTgxODgyOH0.q9zAs0sc2V9VHFw_A8TEeC5J4Jns_FNS1HsZeVBJsVk"
  // stessa anon key di Ristoflow — stesso progetto Supabase
);
