-- Enable realtime for tables
ALTER TABLE public.whatsapp_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.system_metrics REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; 
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_metrics;

-- Insert sample test data for demonstration
INSERT INTO public.whatsapp_sessions (name, session_key, status, user_id) VALUES
('Session Demo 1', 'demo-session-1', 'connected', auth.uid()),
('Session Demo 2', 'demo-session-2', 'qr_ready', auth.uid()),
('Session Demo 3', 'demo-session-3', 'disconnected', auth.uid());

-- Insert sample messages
INSERT INTO public.messages (session_id, to_number, from_number, chat_id, content, user_id, status) 
SELECT 
  s.id,
  '+1234567890',
  '+0987654321', 
  'demo-chat-' || s.id,
  'Mensaje de prueba #' || (random() * 100)::int,
  s.user_id,
  CASE 
    WHEN random() > 0.8 THEN 'failed'::message_status
    WHEN random() > 0.5 THEN 'delivered'::message_status
    ELSE 'sent'::message_status
  END
FROM public.whatsapp_sessions s
WHERE s.name LIKE 'Session Demo%'
AND s.user_id = auth.uid();

-- Insert historical system metrics for charts
INSERT INTO public.system_metrics (metric_type, value, recorded_at)
SELECT 
  'memory_usage',
  300 + (random() * 200)::int,
  now() - (i || ' hours')::interval
FROM generate_series(1, 24) i;

INSERT INTO public.system_metrics (metric_type, value, recorded_at)
SELECT 
  'cpu_usage', 
  20 + (random() * 60)::int,
  now() - (i || ' hours')::interval  
FROM generate_series(1, 24) i;