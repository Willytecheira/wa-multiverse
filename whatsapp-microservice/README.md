# WhatsApp Microservice

Micro-servicio Node.js que proporciona integración real con WhatsApp Web usando QR codes auténticos.

## Características

- ✅ QR codes reales de WhatsApp Web
- ✅ Manejo de múltiples sesiones simultáneas
- ✅ Integración automática con Supabase
- ✅ Envío y recepción de mensajes
- ✅ Autenticación persistente local
- ✅ API RESTful completa

## Instalación

### Desarrollo Local

1. Instalar dependencias:
```bash
cd whatsapp-microservice
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus credenciales de Supabase
```

3. Ejecutar en modo desarrollo:
```bash
npm run dev
```

### Deploy en Railway (Recomendado)

1. Crear cuenta en [Railway](https://railway.app)
2. Conectar tu repositorio GitHub
3. Configurar variables de entorno en Railway:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
4. Deploy automático

### Deploy en Render

1. Crear cuenta en [Render](https://render.com)
2. Crear nuevo Web Service
3. Conectar repositorio y configurar:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Configurar variables de entorno

## API Endpoints

### Crear Sesión
```http
POST /session/create
Content-Type: application/json

{
  "sessionId": "session-123"
}
```

### Obtener QR Code
```http
GET /session/{sessionId}/qr
```

### Obtener Estado de Sesión
```http
GET /session/{sessionId}/status
```

### Enviar Mensaje
```http
POST /session/{sessionId}/send
Content-Type: application/json

{
  "to": "+1234567890",
  "content": "Hola desde el microservicio!",
  "type": "text"
}
```

### Eliminar Sesión
```http
DELETE /session/{sessionId}
```

### Listar Sesiones
```http
GET /sessions
```

### Health Check
```http
GET /health
```

## Flujo de Trabajo

1. **Cliente** solicita crear sesión en Supabase
2. **Supabase Edge Function** llama al microservicio
3. **Microservicio** inicializa WhatsApp Web
4. **WhatsApp Web** genera QR code real
5. **Usuario** escanea QR con su teléfono
6. **Microservicio** actualiza estado en Supabase
7. **Cliente** recibe notificaciones en tiempo real

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3001` |
| `SUPABASE_URL` | URL de tu proyecto Supabase | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service Role Key de Supabase | `eyJ...` |
| `NODE_ENV` | Entorno de ejecución | `production` |

## Monitoreo

- Logs en tiempo real con estado de sesiones
- Health check endpoint disponible
- QR codes mostrados en terminal (desarrollo)

## Próximos Pasos

1. Deploy del microservicio
2. Actualizar Edge Function para usar microservicio
3. Configurar webhook URL en Supabase
4. Probar con tu número de WhatsApp real