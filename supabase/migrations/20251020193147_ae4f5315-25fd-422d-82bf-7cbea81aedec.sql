-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the premium expiration check to run daily at midnight
SELECT cron.schedule(
  'expire-premium-daily',
  '0 0 * * *', -- every day at midnight
  $$
  SELECT net.http_post(
    url:='https://aehbsmsgusvmmguuqavh.supabase.co/functions/v1/expire-premium',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlaGJzbXNndXN2bW1ndXVxYXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTY5MzMsImV4cCI6MjA3NjQzMjkzM30.wRM9XIyMPEMF7RLijkUE1_rJEX7VuGquyQCPyMpW6kc"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);