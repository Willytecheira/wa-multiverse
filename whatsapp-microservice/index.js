const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Store WhatsApp clients and their states
const sessions = new Map();

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Helper function to update session in Supabase
async function updateSessionInSupabase(sessionId, updates) {
  try {
    const response = await axios.patch(
      `${SUPABASE_URL}/rest/v1/whatsapp_sessions?id=eq.${sessionId}`,
      updates,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      }
    );
    console.log(`Session ${sessionId} updated in Supabase:`, updates);
  } catch (error) {
    console.error(`Error updating session ${sessionId} in Supabase:`, error.message);
  }
}

// Helper function to create message in Supabase
async function createMessageInSupabase(sessionId, messageData) {
  try {
    const response = await axios.post(
      `${SUPABASE_URL}/rest/v1/messages`,
      messageData,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`Message created in Supabase for session ${sessionId}`);
  } catch (error) {
    console.error(`Error creating message in Supabase:`, error.message);
  }
}

// Create a new WhatsApp session
app.post('/session/create', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Session ID is required' });
  }

  if (sessions.has(sessionId)) {
    return res.status(400).json({ success: false, error: 'Session already exists' });
  }

  try {
    console.log(`Creating WhatsApp session: ${sessionId}`);

    // Create WhatsApp client with local authentication
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: sessionId }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    // Store client and session info
    sessions.set(sessionId, {
      client,
      status: 'initializing',
      qrCode: null,
      phone: null
    });

    // QR Code event
    client.on('qr', async (qr) => {
      console.log(`QR code generated for session ${sessionId}`);
      
      // Display QR in terminal for development
      qrcode.generate(qr, { small: true });
      
      // Store QR code and update status
      const sessionData = sessions.get(sessionId);
      sessionData.qrCode = qr;
      sessionData.status = 'qr_ready';
      sessions.set(sessionId, sessionData);

      // Update Supabase
      await updateSessionInSupabase(sessionId, {
        status: 'qr_ready',
        qr_code: qr,
        updated_at: new Date().toISOString()
      });
    });

    // Ready event
    client.on('ready', async () => {
      console.log(`WhatsApp session ${sessionId} is ready!`);
      
      const sessionData = sessions.get(sessionId);
      sessionData.status = 'connected';
      
      // Get phone number
      const info = client.info;
      if (info && info.wid) {
        sessionData.phone = `+${info.wid.user}`;
      }
      
      sessions.set(sessionId, sessionData);

      // Update Supabase
      await updateSessionInSupabase(sessionId, {
        status: 'connected',
        phone: sessionData.phone,
        connected_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    // Authentication failure
    client.on('auth_failure', async (msg) => {
      console.error(`Authentication failed for session ${sessionId}:`, msg);
      
      const sessionData = sessions.get(sessionId);
      if (sessionData) {
        sessionData.status = 'auth_failure';
        sessions.set(sessionId, sessionData);
      }

      await updateSessionInSupabase(sessionId, {
        status: 'auth_failure',
        updated_at: new Date().toISOString()
      });
    });

    // Disconnected event
    client.on('disconnected', async (reason) => {
      console.log(`Session ${sessionId} disconnected:`, reason);
      
      const sessionData = sessions.get(sessionId);
      if (sessionData) {
        sessionData.status = 'disconnected';
        sessions.set(sessionId, sessionData);
      }

      await updateSessionInSupabase(sessionId, {
        status: 'disconnected',
        updated_at: new Date().toISOString()
      });
    });

    // Message received
    client.on('message', async (message) => {
      console.log(`Message received in session ${sessionId}:`, message.body);
      
      // Create message in Supabase
      await createMessageInSupabase(sessionId, {
        session_id: sessionId,
        from: message.from,
        to: message.to,
        content: message.body,
        type: message.type,
        direction: 'inbound',
        status: 'received',
        created_at: new Date().toISOString()
      });

      // Update last activity
      await updateSessionInSupabase(sessionId, {
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    // Initialize client
    await client.initialize();

    res.json({
      success: true,
      message: 'Session creation started',
      sessionId
    });

  } catch (error) {
    console.error(`Error creating session ${sessionId}:`, error);
    sessions.delete(sessionId);
    
    await updateSessionInSupabase(sessionId, {
      status: 'error',
      updated_at: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get QR code for a session
app.get('/session/:sessionId/qr', (req, res) => {
  const { sessionId } = req.params;
  const sessionData = sessions.get(sessionId);

  if (!sessionData) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  if (sessionData.status !== 'qr_ready' || !sessionData.qrCode) {
    return res.status(400).json({ success: false, error: 'QR code not ready' });
  }

  res.json({
    success: true,
    qrCode: sessionData.qrCode,
    status: sessionData.status
  });
});

// Get session status
app.get('/session/:sessionId/status', (req, res) => {
  const { sessionId } = req.params;
  const sessionData = sessions.get(sessionId);

  if (!sessionData) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  res.json({
    success: true,
    status: sessionData.status,
    phone: sessionData.phone,
    hasQR: !!sessionData.qrCode
  });
});

// Send message
app.post('/session/:sessionId/send', async (req, res) => {
  const { sessionId } = req.params;
  const { to, content, type = 'text' } = req.body;

  const sessionData = sessions.get(sessionId);

  if (!sessionData) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  if (sessionData.status !== 'connected') {
    return res.status(400).json({ success: false, error: 'Session not connected' });
  }

  try {
    const client = sessionData.client;
    
    // Format phone number
    let formattedNumber = to;
    if (!formattedNumber.includes('@')) {
      formattedNumber = formattedNumber.replace(/[^\d]/g, '');
      if (!formattedNumber.startsWith('1')) {
        formattedNumber = '1' + formattedNumber;
      }
      formattedNumber += '@c.us';
    }

    // Send message
    const message = await client.sendMessage(formattedNumber, content);

    // Create message record in Supabase
    await createMessageInSupabase(sessionId, {
      session_id: sessionId,
      from: message.from,
      to: message.to,
      content: content,
      type: type,
      direction: 'outbound',
      status: 'sent',
      created_at: new Date().toISOString()
    });

    // Update last activity
    await updateSessionInSupabase(sessionId, {
      last_activity: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Message sent successfully',
      messageId: message.id._serialized
    });

  } catch (error) {
    console.error(`Error sending message in session ${sessionId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete session
app.delete('/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const sessionData = sessions.get(sessionId);

  if (!sessionData) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  try {
    const client = sessionData.client;
    await client.destroy();
    sessions.delete(sessionId);

    await updateSessionInSupabase(sessionId, {
      status: 'disconnected',
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error(`Error deleting session ${sessionId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp microservice is running',
    sessions: Array.from(sessions.keys()),
    timestamp: new Date().toISOString()
  });
});

// List all sessions
app.get('/sessions', (req, res) => {
  const sessionList = Array.from(sessions.entries()).map(([id, data]) => ({
    sessionId: id,
    status: data.status,
    phone: data.phone,
    hasQR: !!data.qrCode
  }));

  res.json({
    success: true,
    sessions: sessionList
  });
});

app.listen(PORT, () => {
  console.log(`WhatsApp microservice running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});