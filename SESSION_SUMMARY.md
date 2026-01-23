# Inbox Guardian - Development Session Summary
**Date:** January 23, 2026

## Project Overview
AI-powered email management app for Yahoo Mail with Gemini AI analysis.

---

## Infrastructure Setup

### GitHub Repository
- **URL:** https://github.com/tehmenghai/inbox-guardian
- **Tag:** `v1.0.0` - Initial Release

### AWS Deployment

| Component | Service | Details |
|-----------|---------|---------|
| Frontend | AWS Amplify | https://main.d2u0lu9liyioqp.amplifyapp.com |
| Backend | EC2 t2.micro | IP: 54.90.140.130, Instance: i-0a326f40a55f5ee9b |
| HTTPS Proxy | CloudFront | https://d15lu8wbhdgmq9.cloudfront.net |
| Region | us-east-1 | AWS Profile: personal-dev |

### Key Files Created
```
/.gitignore
/amplify.yml
/cloudfront-config.json
/server/ecosystem.config.js
/server/appspec.yml
/server/scripts/before_install.sh
/server/scripts/after_install.sh
/server/scripts/start_server.sh
/server/scripts/stop_server.sh
/.github/workflows/deploy-frontend.yml
/.github/workflows/deploy-backend.yml
```

### Environment Variables
- **Amplify:** `VITE_API_URL=https://d15lu8wbhdgmq9.cloudfront.net/api/yahoo`
- **EC2:** Server runs on port 3001 via PM2

---

## Bug Fixes

### 1. Mixed Content / HTTPS Issue
**Problem:** Frontend (HTTPS) couldn't call backend (HTTP)
**Solution:** Created CloudFront distribution as HTTPS proxy

### 2. CORS Error
**Problem:** Backend didn't allow Amplify domain in CORS
**Solution:** Updated `server/index.ts` to include Amplify domain in allowed origins:
```typescript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://main.d2u0lu9liyioqp.amplifyapp.com'
  ],
  credentials: true
}));
```

### 3. 504 Gateway Timeout
**Problem:** CloudFront 30s timeout caused CORS errors on slow requests
**Solution:**
- Increased CloudFront origin timeout to 60 seconds
- Added `fetchWithTimeout` wrapper on frontend (55s timeout)
- Better error messages for timeout scenarios

### 4. Yahoo Icon 404
**Problem:** Wikipedia SVG URL was broken
**Solution:** Replaced with inline SVG in `AuthScreen.tsx`

---

## Mobile Responsive UI Improvements

### SenderGroupsScreen (Email Senders List)
- Stacked vertical layout for sender cards on mobile
- Sender name prominently displayed with truncation
- Stats (email count, unread, date) reorganized
- Action buttons in dedicated bottom row
- Compact floating action bar

### SenderDetailScreen (Sender's Email List)
- Analyze All button: Icon-only on mobile
- Email list items with stacked layout:
  - Row 1: Checkbox + Subject + Unread indicator
  - Row 2: Clean snippet (MIME artifacts removed)
  - Row 3: Date + Action buttons
- Snippet cleaning regex: removes `------=_Part_xxxxx...` artifacts
- Compact bottom action bar

### EmailDetailScreen (Email Content)
- Header redesigned with stacked mobile layout:
  - Row 1: Avatar + Sender name/email + Analyze button (icon)
  - Row 2: Full subject line
  - Row 3: Short date + badges + attachments
- Shorter date format on mobile (relative: "Today", "Jan 16")
- AI Analysis panel: Reduced padding, single-column extracted info
- Compact bottom action bar

---

## SSH Access to EC2
```bash
# Connect to EC2
ssh -i ~/.ssh/inbox-guardian-key.pem ec2-user@54.90.140.130

# PM2 Commands
pm2 status
pm2 logs
pm2 restart inbox-guardian-server

# Server location
/home/ec2-user/inbox-guardian-server/server/
```

---

## Deployment Commands

### Manual Amplify Rebuild
```bash
AWS_PROFILE=personal-dev aws amplify start-job \
  --region us-east-1 \
  --app-id d2u0lu9liyioqp \
  --branch-name main \
  --job-type RELEASE
```

### Check Amplify Build Status
```bash
AWS_PROFILE=personal-dev aws amplify list-jobs \
  --region us-east-1 \
  --app-id d2u0lu9liyioqp \
  --branch-name main \
  --max-results 1
```

### Deploy Backend to EC2
```bash
# Copy updated server code
scp -i ~/.ssh/inbox-guardian-key.pem -r server/* ec2-user@54.90.140.130:/home/ec2-user/inbox-guardian-server/server/

# SSH and rebuild
ssh -i ~/.ssh/inbox-guardian-key.pem ec2-user@54.90.140.130
cd /home/ec2-user/inbox-guardian-server/server
npm run build
pm2 restart inbox-guardian-server
```

---

## Git Commits (Recent)

1. `v1.0.0` - Initial Release tag
2. Add CORS support for production and CloudFront config
3. Improve mobile responsive layout for sender groups
4. Fix Yahoo icon 404 and improve timeout handling
5. Improve SenderDetailScreen mobile responsive layout
6. Improve EmailDetailScreen mobile responsive layout

---

## Pending / Future Work

1. **CodeDeploy Setup** - Automated backend deployments (optional)
2. **GitHub Actions Secrets** - For CI/CD automation:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AMPLIFY_APP_ID`
   - `DEPLOY_BUCKET`

---

## Cost Estimate

| Component | Monthly Cost |
|-----------|--------------|
| AWS Amplify | $0 (free tier) |
| EC2 t2.micro | $0 (12-month free tier) |
| CloudFront | $0 (1TB free tier) |
| **Total Year 1** | **~$0-1/month** |
| **After Free Tier** | **~$8-10/month** |

---

## Health Check URLs

- Frontend: https://main.d2u0lu9liyioqp.amplifyapp.com
- Backend Health: https://d15lu8wbhdgmq9.cloudfront.net/api/health
- Direct EC2: http://54.90.140.130:3001/api/health
