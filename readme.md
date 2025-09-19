# SFMC Custom Activity (Base Template)

This project provides a **minimal starter** for building a **Salesforce Marketing Cloud (SFMC) Journey Builder Custom Activity** using **Node.js + Express**.

It comes with:
- Backend (Express.js) handling lifecycle + execute routes.
- Dynamic `config.json` for Journey Builder.
- Simple configuration UI (HTML + Postmonger).
- Webpack build for bundling the client-side JS.

---

## 🚀 Setup

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd sfmc-custom-activity
npm install
```

### 2. Build the Frontend
```bash
npm run build    # production build
npm run watch    # development build (watch mode)
```

### 3. Run the Server
```bash
npm start
# app will be available at http://localhost:8080
```

---

## 📂 Structure

```
sfmc-custom-activity/
├─ app.js                        # Main Express server
├─ package.json
├─ .env.example                  # Example environment file
└─ modules/custom-activity/
   ├─ app/app.js                 # Express routes (lifecycle + execute)
   ├─ config/config-json.js      # Dynamic config.json descriptor
   ├─ html/index.html            # Configuration UI (inspector panel)
   ├─ src/index.js               # Postmonger client logic
   └─ webpack.config.js          # Webpack build config
```

---

## 🔑 Endpoints

- `GET  /modules/custom-activity/config.json` → Descriptor for JB.  
- `GET  /modules/custom-activity/index.html` → Config inspector UI.  
- `POST /modules/custom-activity/save` → Save inspector data.  
- `POST /modules/custom-activity/publish` → Journey activated.  
- `POST /modules/custom-activity/validate` → Validate before publish.  
- `POST /modules/custom-activity/stop` → Journey stopped.  
- `POST /modules/custom-activity/execute` → Contact reaches step.

---

## ⚙️ Environment Variables

Duplicate `.env.example` → `.env` and set values:

```
PORT=8080
API_URL=http://localhost:3000/api/message
API_TIMEOUT=10000
# Authentication (choose one):
API_BASIC_TOKEN= # Base64 encoded username:password for Basic auth
# API_USERNAME=
# API_PASSWORD=
# API_TOKEN= # Optional bearer token alternative
# Messaging defaults
MESSAGE_CHANNEL=WABA
MESSAGE_CONTENT_TYPE=AUTO_TEMPLATE
MESSAGE_PREVIEW_URL=false
MESSAGE_SENDER_NAME="Adidas India"
MESSAGE_SENDER_FROM=919999999999
MESSAGE_WEBHOOK_DNID=1001
MESSAGE_METADATA_VERSION=v1.0.9
# JB_PUBLIC_KEY=-----BEGIN PUBLIC KEY----- (optional, for JWT verification)
```

---

## 🧱 Journey Builder Inspector Fields

The configuration inspector surfaces the same inputs your downstream API expects:

| Field | Description | Downstream mapping |
| ----- | ----------- | ------------------ |
| Campaign name | Internal campaign label used for reporting. | `recipient.reference.cust_ref` and `metaData.campaign.name` |
| Sender profile | Display name shown in the WhatsApp preview. | `message.sender.name` |
| Message template | Dropdown selector for your approved template. | `message.content.template.name` and `recipient.reference.templateName` |
| Message body | Personalised text body (supports JB merge fields). | `message.content.text` |
| Media URL | Optional header media (image/audio/video inferred by file extension). | `message.content.media` |
| Quick reply label | Optional single quick reply CTA. | `message.content.buttons[0].label` |
| Send timing | Choose immediate delivery or schedule with date/time. | `message.preferences.sendType/sendSchedule` |

All form values are persisted as Journey Builder **in-arguments** and sent to `/execute` when a contact reaches the activity.

---

## 🧪 Local Testing

Start server:
```bash
npm run build
npm start
```

Test `/execute` endpoint:
```bash
curl -X POST http://localhost:8080/modules/custom-activity/execute \
  -H "Content-Type: application/json" \
  -d '{
    "inArguments": [
      { "recipientTo": "919999999999" },
      { "senderFrom": "919999999999" },
      { "senderName": "Adidas India" },
      { "campaignName": "Adidas India – Welcome Offer" },
      { "messageTemplate": "promo" },
      { "messageBody": "Hey {{Contact.Attribute.DE.FirstName}}, surprise! Enjoy 60% off on your next purchase with code WELCOME60." },
      { "mediaUrl": "https://images.unsplash.com/photo-1549880338-65ddcdfd017b" },
      { "buttonLabel": "Shop Now" },
      { "sendType": "immediate" }
    ]
  }'
```

Expected (truncated):
```json
{
  "upstreamStatus": 202,
  "messageId": "abc123",
  "channel": "WABA",
  "recipient": "919999999999"
}
```

`upstreamResponse` will include the raw response body returned by your messaging API.

---

## 🌐 Deployment

Deploy on a **public HTTPS server with TLS 1.2** (SFMC requirement). Suitable platforms:
- Heroku
- Render
- AWS (ECS, Elastic Beanstalk, Lambda)
- Azure App Service
- Google Cloud Run

Update your SFMC **Installed Package → Journey Builder Activity** with the deployed `config.json` URL.

---

## 🔒 Security

- Add JWT verification on `/execute`.
- Only serve HTTPS (TLS 1.2+).
- Make downstream APIs idempotent (handles retries).
- Log context: `journeyId`, `activityId`, `contactKey`.

---

## ✅ Next Steps

- Extend `/execute` to integrate with external APIs.
- Map **outArguments** to Data Extensions.
- Add better UI fields in `index.html`.
- Improve retry and error handling strategies.

