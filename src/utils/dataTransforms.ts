// Utility functions to transform Supabase database types to frontend types

import type { WhatsAppSession as DbSession } from '@/services/supabaseApi';
import type { WhatsAppSession } from '@/types/whatsapp';

export const transformDbSessionToFrontend = (dbSession: DbSession): WhatsAppSession => ({
  id: dbSession.id,
  name: dbSession.name,
  status: dbSession.status,
  qrCode: dbSession.qr_code || undefined,
  phone: dbSession.phone || undefined,
  createdAt: new Date(dbSession.created_at),
  connectedAt: dbSession.connected_at ? new Date(dbSession.connected_at) : undefined,
  lastActivity: dbSession.last_activity ? new Date(dbSession.last_activity) : undefined,
});