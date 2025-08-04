-- Insert sample test data for demonstration (only if user exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'willingtonsosa@hotmail.com') THEN
        -- Insert sample sessions if not already exists
        INSERT INTO public.whatsapp_sessions (name, session_key, status, user_id) 
        SELECT 'Session Demo 1', 'demo-session-1', 'connected', u.id
        FROM auth.users u 
        WHERE u.email = 'willingtonsosa@hotmail.com'
        AND NOT EXISTS (SELECT 1 FROM public.whatsapp_sessions WHERE name = 'Session Demo 1');

        INSERT INTO public.whatsapp_sessions (name, session_key, status, user_id) 
        SELECT 'Session Demo 2', 'demo-session-2', 'qr_ready', u.id
        FROM auth.users u 
        WHERE u.email = 'willingtonsosa@hotmail.com'
        AND NOT EXISTS (SELECT 1 FROM public.whatsapp_sessions WHERE name = 'Session Demo 2');

        INSERT INTO public.whatsapp_sessions (name, session_key, status, user_id) 
        SELECT 'Session Demo 3', 'demo-session-3', 'disconnected', u.id
        FROM auth.users u 
        WHERE u.email = 'willingtonsosa@hotmail.com'
        AND NOT EXISTS (SELECT 1 FROM public.whatsapp_sessions WHERE name = 'Session Demo 3');

        -- Insert sample messages for demo sessions
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
        AND NOT EXISTS (SELECT 1 FROM public.messages WHERE session_id = s.id);

        -- Insert historical system metrics for charts if not exists
        INSERT INTO public.system_metrics (metric_type, value, recorded_at)
        SELECT 
          'memory_usage',
          300 + (random() * 200)::int,
          now() - (i || ' hours')::interval
        FROM generate_series(1, 24) i
        WHERE NOT EXISTS (SELECT 1 FROM public.system_metrics WHERE metric_type = 'memory_usage');

        INSERT INTO public.system_metrics (metric_type, value, recorded_at)
        SELECT 
          'cpu_usage', 
          20 + (random() * 60)::int,
          now() - (i || ' hours')::interval  
        FROM generate_series(1, 24) i
        WHERE NOT EXISTS (SELECT 1 FROM public.system_metrics WHERE metric_type = 'cpu_usage');
    END IF;
END $$;