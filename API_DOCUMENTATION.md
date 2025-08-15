# WhatsApp API Documentation

Complete documentation for all WhatsApp API endpoints with request/response examples.

## 📋 Table of Contents

- [Authentication](#authentication)
- [Health & Status](#health--status)
- [Message Sending](#message-sending)
- [Contact Management](#contact-management)
- [Group Management](#group-management)
- [Diffusion Groups](#diffusion-groups)
- [Webhook Management](#webhook-management)
- [Error Handling](#error-handling)

## 🔐 Authentication

### Get QR Code
**Endpoint:** `GET /whatsapp/qrcode`

**Description:** Get QR code for WhatsApp Web authentication

**Response:**
```json
{
  "status": "qr",
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Error Response:**
```json
{
  "status": "no_qr",
  "message": "No QR code available at this moment"
}
```

## 🏥 Health & Status

### Health Check
**Endpoint:** `GET /health`

**Description:** Check API health and status

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### Welcome Message
**Endpoint:** `GET /`

**Description:** Get API welcome message

**Response:**
```json
"Welcome to WhatsApp API!"
```

## 💬 Message Sending

### Send Message to Individual Contact
**Endpoint:** `POST /whatsapp/send`

**Description:** Send message to a specific contact

**Request Body:**
```json
{
  "phone": "1234567890",
  "message": "Hello! How are you?"
}
```

**Response:**
```json
{
  "status": "success",
  "phone": "1234567890@c.us",
  "contactName": "John Doe",
  "message": "Hello! How are you?",
  "sentAt": "2024-01-01T12:00:00.000Z"
}
```

### Send Message to Group
**Endpoint:** `POST /whatsapp/send-group`

**Description:** Send message to a WhatsApp group

**Request Body:**
```json
{
  "groupName": "Work Team",
  "message": "Meeting at 3 PM today!",
  "searchById": false
}
```

**Response:**
```json
{
  "status": "success",
  "group": {
    "id": "1234567890@g.us",
    "name": "Work Team",
    "participantsCount": 15
  },
  "message": "Meeting at 3 PM today!",
  "sentAt": "2024-01-01T12:00:00.000Z"
}
```

### Send Message to Diffusion Group
**Endpoint:** `POST /whatsapp/send-diffusion`

**Description:** Send message to a diffusion group (broadcast list)

**Request Body:**
```json
{
  "diffusionName": "Broadcast List 1",
  "message": "Important announcement for everyone!",
  "searchById": false
}
```

**Response:**
```json
{
  "status": "success",
  "diffusion": {
    "id": "1234567890@g.us",
    "name": "Broadcast List 1",
    "participantsCount": 25
  },
  "message": "Important announcement for everyone!",
  "sentAt": "2024-01-01T12:00:00.000Z"
}
```

## 👥 Contact Management

### Validate/Save Contact
**Endpoint:** `POST /whatsapp/contacts`

**Description:** Validate that a contact exists and was manually created

**Request Body:**
```json
{
  "phone": "1234567890",
  "description": "Work contact"
}
```

**Response:**
```json
{
  "status": "success",
  "contact": {
    "phone": "1234567890@c.us",
    "name": "John Doe",
    "description": "Work contact",
    "isManuallyCreated": true,
    "validatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### Get Specific Contact
**Endpoint:** `POST /whatsapp/contact`

**Description:** Get a specific contact by name or ID

**Request Body:**
```json
{
  "contactIdentifier": "John Doe",
  "searchById": false
}
```

**Response:**
```json
{
  "status": "success",
  "contact": {
    "id": "1234567890@c.us",
    "name": "John Doe",
    "phone": "1234567890",
    "pushname": "John",
    "isBusiness": false,
    "isVerified": false,
    "profilePicUrl": "https://...",
    "status": "Available"
  }
}
```

## 👥 Group Management

### Get All Groups
**Endpoint:** `GET /whatsapp/groups`

**Description:** Get all WhatsApp groups

**Response:**
```json
{
  "status": "success",
  "totalGroups": 3,
  "groups": [
    {
      "id": "1234567890@g.us",
      "name": "Work Team",
      "description": "Team communication",
      "participantsCount": 15,
      "isGroup": true,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "participants": [
        {
          "id": "1234567890@c.us",
          "name": "John Doe",
          "isAdmin": true,
          "isSuperAdmin": false
        }
      ]
    }
  ]
}
```

### Get Group Contacts
**Endpoint:** `POST /whatsapp/group-contacts`

**Description:** Get all contacts from a specific group

**Request Body:**
```json
{
  "groupName": "Work Team",
  "searchById": false
}
```

**Response:**
```json
{
  "status": "success",
  "group": {
    "id": "1234567890@g.us",
    "name": "Work Team",
    "participantsCount": 15
  },
  "contacts": [
    {
      "id": "1234567890@c.us",
      "name": "John Doe",
      "phone": "1234567890",
      "pushname": "John",
      "isBusiness": false,
      "isVerified": false,
      "profilePicUrl": "https://...",
      "status": "Available"
    }
  ]
}
```

## 📢 Diffusion Groups

### Get All Diffusion Groups
**Endpoint:** `GET /whatsapp/diffusion-groups`

**Description:** Get all diffusion groups (broadcast lists)

**Response:**
```json
{
  "status": "success",
  "totalDiffusionGroups": 2,
  "diffusionGroups": [
    {
      "id": "1234567890@g.us",
      "name": "Broadcast List 1",
      "description": "Work contacts",
      "participantsCount": 25,
      "isGroup": true,
      "isBroadcast": true,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "participants": [
        {
          "id": "1234567890@c.us",
          "name": "John Doe",
          "isAdmin": true,
          "isSuperAdmin": false
        }
      ]
    }
  ]
}
```

### Get Diffusion Contacts
**Endpoint:** `POST /whatsapp/diffusion-contacts`

**Description:** Get all contacts from a diffusion group

**Request Body:**
```json
{
  "diffusionName": "Broadcast List 1",
  "searchById": false
}
```

**Response:**
```json
{
  "status": "success",
  "diffusion": {
    "id": "1234567890@g.us",
    "name": "Broadcast List 1",
    "participantsCount": 25
  },
  "contacts": [
    {
      "id": "1234567890@c.us",
      "name": "John Doe",
      "phone": "1234567890",
      "pushname": "John",
      "isBusiness": false,
      "isVerified": false,
      "profilePicUrl": "https://...",
      "status": "Available"
    }
  ]
}
```

## 🔗 Webhook Management

### Configure Webhook
**Endpoint:** `POST /whatsapp/webhook/configure`

**Description:** Configure webhook for handling messages from unknown contacts

**Request Body:**
```json
{
  "url": "https://your-external-api.com/webhook/whatsapp",
  "method": "POST",
  "apiKey": "your-api-key-here",
  "timeout": 10000
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Webhook configured successfully",
  "config": {
    "url": "https://your-external-api.com/webhook/whatsapp",
    "method": "POST",
    "apiKey": "your-api-key-here",
    "timeout": 10000
  }
}
```

### Get Webhook Configuration
**Endpoint:** `GET /whatsapp/webhook/config`

**Description:** Get current webhook configuration

**Response:**
```json
{
  "status": "success",
  "config": {
    "url": "https://your-external-api.com/webhook/whatsapp",
    "method": "POST",
    "apiKey": "your-api-key-here",
    "timeout": 10000
  }
}
```

### Remove Webhook Configuration
**Endpoint:** `DELETE /whatsapp/webhook/remove`

**Description:** Remove webhook configuration

**Response:**
```json
{
  "status": "success",
  "message": "Webhook configuration removed successfully"
}
```

### Test Webhook
**Endpoint:** `POST /whatsapp/webhook/test`

**Description:** Test webhook configuration with sample data

**Response:**
```json
{
  "status": "success",
  "message": "Webhook test successful",
  "response": {
    "status": 200,
    "data": {
      "reply": "Test message received successfully"
    }
  }
}
```

## 🚨 Error Handling

### Error Response Format
All endpoints return errors in the following format:

```json
{
  "error": "ERROR_TYPE: Detailed error message with available options"
}
```

### Common Error Types

#### Contact Not Found
```json
{
  "error": "CONTACT_NOT_FOUND: Contact with phone 1234567890 not found. Please add this contact to your phone's contact list first."
}
```

#### Group Not Found
```json
{
  "error": "GROUP_NOT_FOUND: Group with name containing 'Invalid Group' not found. Available groups: Work Team, Family Group, Project Alpha"
}
```

#### Send Failed
```json
{
  "error": "SEND_FAILED: Failed to send message to group. Please check if you have permission to send messages in this group."
}
```

#### Webhook Error
```json
{
  "error": "WEBHOOK_ERROR: Failed to forward message to webhook. Connection timeout."
}
```

### HTTP Status Codes

- **200**: Success
- **201**: Created (for POST requests)
- **400**: Bad Request (validation errors)
- **404**: Not Found (contact/group not found)
- **500**: Internal Server Error

## 🔧 Usage Examples

### Complete Workflow Example

1. **Get QR Code for Authentication:**
```bash
curl -X GET http://localhost:3005/whatsapp/qrcode
```

2. **Send Message to Contact:**
```bash
curl -X POST http://localhost:3005/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "1234567890",
    "message": "Hello from API!"
  }'
```

3. **Send Message to Group:**
```bash
curl -X POST http://localhost:3005/whatsapp/send-group \
  -H "Content-Type: application/json" \
  -d '{
    "groupName": "Work Team",
    "message": "Meeting reminder!"
  }'
```

4. **Configure Webhook:**
```bash
curl -X POST http://localhost:3005/whatsapp/webhook/configure \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-api.com/webhook",
    "apiKey": "your-secret-key"
  }'
```

## 📊 Rate Limits

Currently, there are no rate limits implemented. However, it's recommended to:

- Limit requests to reasonable frequencies
- Implement proper error handling
- Monitor API usage
- Consider implementing rate limiting for production use

## 🔒 Security Considerations

- Use HTTPS in production
- Implement proper authentication
- Validate all input data
- Monitor logs for suspicious activity
- Keep dependencies updated
- Use strong API keys for webhooks

## 📝 Notes

- All phone numbers should be in international format without '+' or spaces
- Group names are case-insensitive and support partial matching
- Contact validation requires the contact to be manually saved in your phone
- Webhook responses should include a "reply" field to send messages back
- Session persistence is automatic and maintained across deployments
