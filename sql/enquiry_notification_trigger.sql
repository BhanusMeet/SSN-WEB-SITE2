-- ============================================================
-- SSN ELITE — Customer Enquiry Database Notification Trigger
-- 
-- Optional database-level webhook trigger that automatically
-- invokes the notify-enquiry Edge Function on every new submission.
-- ============================================================

-- Add tracking column for notification status (safe add)
ALTER TABLE public.user_submissions ADD COLUMN IF NOT EXISTS notification_status TEXT DEFAULT 'pending';
ALTER TABLE public.user_submissions ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- Enable pg_net extension for asynchronous HTTP requests from Postgres (if supported)
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Function to trigger the notification Edge Function asynchronously
CREATE OR REPLACE FUNCTION public.trigger_enquiry_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := 'https://pnxnwtrozxxqoofxutci.supabase.co';
  anon_key TEXT := 'sb_publishable_QH1WF8LiQIxdNbOym0oCIw_gDZn28x0';
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'record', jsonb_build_object(
      'id', NEW.id,
      'full_name', NEW.full_name,
      'email', NEW.email,
      'phone', NEW.phone,
      'address', NEW.address,
      'message', NEW.message,
      'created_at', NEW.created_at
    )
  );

  -- Perform non-blocking background HTTP POST to the notify-enquiry Edge Function
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/notify-enquiry',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', anon_key,
      'Authorization', 'Bearer ' || anon_key
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the insert if pg_net is unavailable or network is down
  RAISE WARNING 'Enquiry notification trigger warning: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Attach trigger to user_submissions table (runs AFTER INSERT only)
DROP TRIGGER IF EXISTS on_user_submission_created ON public.user_submissions;
CREATE TRIGGER on_user_submission_created
  AFTER INSERT ON public.user_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_enquiry_notification();
