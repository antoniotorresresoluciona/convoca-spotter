-- Configurar cron job para ejecutar el monitoreo cada 6 horas
-- Esto ejecutará la función monitor-fundaciones automáticamente

SELECT cron.schedule(
  'monitor-fundaciones-every-6-hours',
  '0 */6 * * *', -- Cada 6 horas en punto
  $$
  SELECT
    net.http_post(
        url:='https://cvihbwqujqupnhzvtosf.supabase.co/functions/v1/monitor-fundaciones',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aWhid3F1anF1cG5oenZ0b3NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTY3NTUsImV4cCI6MjA3NTQ5Mjc1NX0.iSFRDry1DXBoXTdKE2dQnzLXM6I2gI5Lasnm1-OuylY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);