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
API_URL=https://your-api.example.com
API_TOKEN=your-secret
# JB_PUBLIC_KEY=-----BEGIN PUBLIC KEY----- (optional, for JWT verification)
```

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
    "inArguments":[
      {"discount":20},
      {"email":"test@example.com"},
      {"mobile":"+9198xxxxxx"}
    ]
  }'
```

Expected:
```json
{
  "discount": 20,
  "discountCode": "XJ8P9Q2R-20%"
}
```

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

