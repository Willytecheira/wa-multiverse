-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create session status enum  
CREATE TYPE public.session_status AS ENUM ('initializing', 'qr_ready', 'connected', 'disconnected', 'auth_failure');

-- Create message status enum
CREATE TYPE public.message_status AS ENUM ('sent', 'delivered', 'read', 'failed');

-- Create webhook event enum
CREATE TYPE public.webhook_event AS ENUM ('all', 'message-received', 'message-delivered', 'message-from-me', 'session-status');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create whatsapp_sessions table
CREATE TABLE public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  session_key TEXT UNIQUE NOT NULL,
  status session_status DEFAULT 'initializing' NOT NULL,
  qr_code TEXT,
  phone TEXT,
  client_info JSONB,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  connected_at TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_id TEXT,
  chat_id TEXT NOT NULL,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' NOT NULL,
  media_url TEXT,
  status message_status DEFAULT 'sent' NOT NULL,
  is_from_me BOOLEAN DEFAULT false NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  metadata JSONB
);

-- Create webhooks table
CREATE TABLE public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events webhook_event[] NOT NULL DEFAULT '{"all"}',
  is_active BOOLEAN DEFAULT true NOT NULL,
  secret_key TEXT,
  last_triggered TIMESTAMP WITH TIME ZONE,
  success_count INTEGER DEFAULT 0 NOT NULL,
  error_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(session_id, url)
);

-- Create message_templates table
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  variables TEXT[],
  is_active BOOLEAN DEFAULT true NOT NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create system_metrics table for dashboard
CREATE TABLE public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  metadata JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for whatsapp_sessions
CREATE POLICY "Users can view own sessions"
  ON public.whatsapp_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own sessions"
  ON public.whatsapp_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON public.whatsapp_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON public.whatsapp_sessions FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
  ON public.whatsapp_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for messages
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own messages"
  ON public.messages FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for webhooks
CREATE POLICY "Users can manage own webhooks"
  ON public.webhooks FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all webhooks"
  ON public.webhooks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for message_templates
CREATE POLICY "Users can manage own templates"
  ON public.message_templates FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for system_metrics
CREATE POLICY "Admins can view system metrics"
  ON public.system_metrics FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert metrics"
  ON public.system_metrics FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_whatsapp_sessions_user_id ON public.whatsapp_sessions(user_id);
CREATE INDEX idx_whatsapp_sessions_status ON public.whatsapp_sessions(status);
CREATE INDEX idx_whatsapp_sessions_session_key ON public.whatsapp_sessions(session_key);
CREATE INDEX idx_messages_session_id ON public.messages(session_id);
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_timestamp ON public.messages(timestamp DESC);
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_webhooks_session_id ON public.webhooks(session_id);
CREATE INDEX idx_webhooks_user_id ON public.webhooks(user_id);
CREATE INDEX idx_message_templates_user_id ON public.message_templates(user_id);
CREATE INDEX idx_system_metrics_type_time ON public.system_metrics(metric_type, recorded_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create user profile and assign role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  
  -- Assign default role (first user becomes admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN (SELECT COUNT(*) FROM auth.users) = 1 THEN 'admin'::app_role
      ELSE 'user'::app_role
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for real-time updates
ALTER TABLE public.whatsapp_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.webhooks REPLICA IDENTITY FULL;
ALTER TABLE public.system_metrics REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhooks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_metrics;