#  GhostNote — Anonymous Messaging Platform

A production-ready anonymous messaging platform. Share your link, receive anonymous confessions, compliments, crush notes, secrets, and feedback — completely without revealing sender identity.

**Live demo flow:** User creates account → gets `ghostnote.app/u/username` → shares it → anyone can send messages anonymously → owner reads in private dashboard.

---

##  Architecture

```
ghostnote/
├── backend/          # Node.js + Express + MongoDB + Firebase Admin
│   ├── config/
│   │   └── firebase.js        # Firebase Admin SDK init
│   ├── middleware/
│   │   └── auth.js            # JWT verification middleware
│   ├── models/
│   │   ├── User.js            # User schema
│   │   └── Message.js         # Message schema (no sender info)
│   ├── routes/
│   │   ├── auth.js            # POST /api/auth/verify
│   │   ├── users.js           # User CRUD, username check
│   │   └── messages.js        # Send, get, delete, mark-read
│   └── server.js              # Express app entry point
│
└── frontend/         # Next.js 15 App Router + TypeScript + Tailwind
    ├── app/
    │   ├── page.tsx            # Landing page
    │   ├── login/page.tsx      # Login (email + Google)
    │   ├── register/page.tsx   # Register + username setup
    │   ├── dashboard/page.tsx  # Private message dashboard
    │   └── u/[username]/page.tsx  # Public anonymous message page
    ├── contexts/
    │   └── AuthContext.tsx     # Firebase auth state
    └── lib/
        ├── firebase.ts         # Firebase client config
        └── api.ts              # API client with TypeScript types
```

---

##  Setup Instructions

### Step 1 — Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Sign-in methods:
   - Email/Password ✓
   - Google ✓
4. Get **Web App credentials** (for frontend):
   - Project Settings → Your apps → Add app (Web)
   - Copy the config object
5. Get **Service Account** (for backend):
   - Project Settings → Service Accounts → Generate new private key
   - Download the JSON file

---

### Step 2 — MongoDB Setup

**Option A: MongoDB Atlas (recommended for production)**
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get the connection string: `mongodb+srv://user:pass@cluster.mongodb.net/ghostnote`

**Option B: Local MongoDB**
```bash
# Install and start MongoDB
brew install mongodb-community  # macOS
sudo systemctl start mongod     # Linux
# Connection string: mongodb://localhost:27017/ghostnote
```

---

### Step 3 — Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
# MongoDB
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASS@YOUR_CLUSTER.mongodb.net/ghostnote

# Firebase Admin — paste the entire service account JSON as a single line
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n","client_email":"firebase-adminsdk@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token"}

# Server
PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**Tip for the Firebase service account:** Open the downloaded JSON file, copy all its content, and paste it as the value of `FIREBASE_SERVICE_ACCOUNT` on a single line.

Install and run:
```bash
npm install
npm run dev
```

Backend will be available at: `http://localhost:5000`

---

### Step 4 — Frontend Configuration

```bash
cd frontend
cp .env.local.example .env.local
```

Edit `.env.local` with your Firebase web app credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Install and run:
```bash
npm install
npm run dev
```

Frontend will be available at: `http://localhost:3000`

---

##  Running the App

In two separate terminals:

```bash
# Terminal 1 — Backend
cd ghostnote/backend && npm run dev

# Terminal 2 — Frontend
cd ghostnote/frontend && npm run dev
```

Open `http://localhost:3000`

---

## 📡 API Reference

### Authentication
```
POST /api/auth/verify
Authorization: Bearer <firebase-id-token>

Response: { verified: true, hasProfile: boolean, user?: User }
```

### Create User Profile
```
POST /api/users/create
Authorization: Bearer <firebase-id-token>
Body: { username: "robiul", displayName?: "Robiul" }

Response: { user: User }
```

### Check Username Availability
```
GET /api/users/check-username/:username

Response: { available: boolean }
```

### Get Public Profile (for message page)
```
GET /api/users/profile/:username

Response: { username, displayName, profileLink, isAcceptingMessages }
```

### Send Anonymous Message (NO AUTH REQUIRED)
```
POST /api/messages/send
Body: {
  "username": "robiul",
  "type": "compliment" | "confession" | "crush" | "secret" | "feedback",
  "message": "Your ideas are incredible"
}

Response: { success: true }
```

### Get My Messages
```
GET /api/messages?type=compliment&page=1&unreadOnly=false
Authorization: Bearer <firebase-id-token>

Response: { messages: Message[], stats: {...}, pagination: {...} }
```

### Mark Message as Read
```
PATCH /api/messages/:id/read
Authorization: Bearer <firebase-id-token>
```

### Delete Message
```
DELETE /api/messages/:id
Authorization: Bearer <firebase-id-token>
```

### Update Settings
```
PATCH /api/users/settings
Authorization: Bearer <firebase-id-token>
Body: { isAcceptingMessages: boolean }
```

---

##  Security Features

- **Firebase JWT verification** on all protected routes
- **Rate limiting**: 10 messages per IP per 15 minutes (anti-spam)
- **Helmet.js** for HTTP security headers
- **Input validation** with express-validator
- **Zero sender data storage** — sender identity physically cannot be retrieved
- **Owner-only deletion** — messages matched by receiverId before delete
- **500-character message limit**
- **Username validation** — alphanumeric + underscore, 3-30 chars

---

##  Anonymous Messaging Guarantee

The `Message` model stores **only**:
- `receiverId` (who receives it — a Firebase UID)
- `type` (message category)
- `message` (content)
- `isRead` (boolean)
- `createdAt` (timestamp)

**Never stored:** sender IP, sender name, sender email, sender UID, sender device info, or any other identifying information.

---

##  Design System

- **Font**: Syne (display) + Inter (body)
- **Colors**: Space black `#0A0A0F`, Cosmic purple `#6C3DD4`, Ethereal glow `#A78BFA`, Midnight teal `#0D9488`
- **Style**: Glassmorphism with dark backgrounds, gradient text, smooth Framer Motion animations
- **Message categories**: Color-coded chips (green/red/pink/yellow/blue)

---

##  Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript |
| Styling | Tailwind CSS, custom CSS vars |
| Animation | Framer Motion |
| Auth (client) | Firebase Auth (Email + Google) |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth (server) | Firebase Admin SDK |
| Security | Helmet, express-rate-limit, express-validator |

---

##  Deployment

### Backend ( Render /)
1. Push `backend/` to a repo
2. Set environment variables from `.env.example`
3. Start command: `npm start`

### Frontend (Vercel)
1. Push `frontend/` to a repo
2. Import to Vercel
3. Add environment variables from `.env.local.example`
4. Update `NEXT_PUBLIC_API_URL` to your deployed backend URL
5. Update Firebase → Authentication → Authorized domains: add your Vercel domain

---

##  Troubleshooting

**"User profile not found" error:**
→ Make sure you complete the username step after Firebase signup. The backend creates the MongoDB profile at `POST /api/users/create`.

**Firebase token errors:**
→ Ensure `FIREBASE_PROJECT_ID` in backend matches your Firebase project.

**CORS errors:**
→ Set `FRONTEND_URL` in backend `.env` to your exact frontend URL (no trailing slash).

**MongoDB connection fails:**
→ Whitelist your IP in MongoDB Atlas Network Access settings.
