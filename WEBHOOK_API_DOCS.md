# WhatsApp Webhook API Documentation

This document describes the webhook API that will receive messages from the WhatsApp API when users send messages to your WhatsApp number.

## Overview

When someone sends a message to your WhatsApp number, the WhatsApp API will automatically forward that message to your webhook endpoint. Your webhook API should process the message and optionally send a reply back.

## Environment Variables

Add these variables to your `.env` file:

```env
# Webhook Configuration (External API)
WEBHOOK_URL=https://your-external-api.com/webhook/whatsapp
WEBHOOK_API_KEY=your-api-key-here
WEBHOOK_TIMEOUT=10000
```

## Webhook Endpoint

Your external API should have an endpoint that receives POST requests from the WhatsApp API:

```
POST https://your-external-api.com/webhook/whatsapp
```

## Request Data Structure

The WhatsApp API will send the following JSON structure to your webhook:

```json
{
  "messageId": "3EB0C767D82B0A78C4",
  "from": "1234567890@c.us",
  "sender": {
    "id": "1234567890@c.us",
    "phone": "1234567890",
    "pushname": "John Doe",
    "name": "John Doe",
    "isBusiness": false,
    "isVerified": false,
    "isRegisteredContact": true
  },
  "message": {
    "body": "Hello! How are you?",
    "type": "chat",
    "timestamp": 1640995200
  },
  "chat": {
    "id": "1234567890@c.us",
    "type": "individual"
  },
  "receivedAt": "2024-01-01T12:00:00.000Z"
}
```

## Field Descriptions

### Top Level Fields
- **messageId**: Unique identifier for the message
- **from**: WhatsApp ID of the sender (phone number with @c.us suffix)
- **sender**: Object containing sender information
- **message**: Object containing message details
- **chat**: Object containing chat information
- **receivedAt**: ISO timestamp when the message was received

### Sender Object
- **id**: WhatsApp ID of the sender
- **phone**: Phone number without @c.us suffix
- **pushname**: Display name from WhatsApp
- **name**: Contact name (if saved in phone contacts)
- **isBusiness**: Whether the sender is a business account
- **isVerified**: Whether the business account is verified
- **isRegisteredContact**: Whether the sender is saved in your phone contacts

### Message Object
- **body**: The actual message text
- **type**: Message type (chat, image, video, etc.)
- **timestamp**: Unix timestamp of the message

### Chat Object
- **id**: Chat ID (same as sender ID for individual chats)
- **type**: Chat type ("individual" or "group")

## Response Format

Your webhook should respond with JSON. To send a reply back to the sender, include a "reply" field:

```json
{
  "reply": "Thank you for your message! We'll get back to you soon."
}
```

### Response Fields
- **reply** (optional): Text message to send back to the sender
- **status** (optional): Status message for logging
- **data** (optional): Any additional data you want to return

## Example Webhook Implementation

Here's an example of how your webhook endpoint might look:

```javascript
// Express.js example
app.post('/webhook/whatsapp', (req, res) => {
  const { message, sender, from } = req.body;
  
  console.log(`Message from ${sender.name || sender.phone}: ${message.body}`);
  
  // Process the message based on content
  let reply = '';
  
  if (message.body.toLowerCase().includes('hello')) {
    reply = 'Hello! How can I help you today?';
  } else if (message.body.toLowerCase().includes('help')) {
    reply = 'I can help you with various services. What do you need?';
  } else {
    reply = 'Thank you for your message. We\'ll get back to you soon.';
  }
  
  // Send reply back to WhatsApp
  res.json({
    reply: reply,
    status: 'processed',
    timestamp: new Date().toISOString()
  });
});
```

## Authentication

If you set `WEBHOOK_API_KEY` in your environment variables, the WhatsApp API will include an Authorization header:

```
Authorization: Bearer your-api-key-here
```

You can use this to verify that requests are coming from your WhatsApp API.

## Error Handling

If your webhook fails to respond or returns an error, the WhatsApp API will:
1. Log the error
2. Continue processing other messages
3. Not send any reply to the sender

## Message Types

The `message.type` field can have different values:
- **chat**: Text message
- **image**: Image message
- **video**: Video message
- **audio**: Audio message
- **document**: Document message
- **location**: Location message
- **contact**: Contact message

## Group Messages

If the message comes from a group, the chat object will have:
```json
{
  "chat": {
    "id": "1234567890@g.us",
    "type": "group"
  }
}
```

## Testing

You can test your webhook using the WhatsApp API test endpoint:

```bash
POST /whatsapp/webhook/test
```

This will send a test message to your webhook with sample data.

## Security Considerations

1. **Validate the Authorization header** if you're using API keys
2. **Rate limiting** to prevent abuse
3. **Input validation** for message content
4. **HTTPS** for production webhooks
5. **Logging** for debugging and monitoring

## Best Practices

1. **Respond quickly**: Keep response time under 10 seconds
2. **Handle errors gracefully**: Always return a valid JSON response
3. **Log important events**: Track message processing
4. **Validate input**: Check message content and sender information
5. **Use HTTPS**: Secure your webhook endpoint
6. **Monitor performance**: Track response times and error rates
