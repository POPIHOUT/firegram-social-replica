-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule discord logger to run every minute
SELECT cron.schedule(
  'discord-logger-job',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/discord-logger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Alternative: Create trigger to call edge function when new log is inserted
CREATE OR REPLACE FUNCTION public.trigger_discord_logger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Schedule immediate processing by inserting a job
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/discord-logger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the insert if webhook fails
    RETURN NEW;
END;
$$;

-- Create trigger on discord_logs
DROP TRIGGER IF EXISTS on_discord_log_insert ON public.discord_logs;
CREATE TRIGGER on_discord_log_insert
AFTER INSERT ON public.discord_logs
FOR EACH ROW
EXECUTE FUNCTION trigger_discord_logger();