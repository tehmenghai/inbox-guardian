# 🛡️ Inbox Guardian AI

**Inbox Guardian** is an intelligent email housekeeping agent designed to help you reach "Inbox Zero" without the manual grind. Using **Google Gemini**, it analyzes your unread emails to categorize them, assess risk, and suggest bulk actions like archiving or deleting clutter.

## ✨ Key Features

-   **🧠 AI Categorization**: Automatically groups emails into Personal, Promotional, Newsletters, Social, Finance, and Notifications.
-   **📊 Visual Insights**: A sleek dashboard powered by Recharts showing your inbox composition and "clutter score."
-   **🛡️ Cautious Cleanup**: AI suggests actions (Archive/Delete) with reasoning and a "Risk Level" so you never lose an important thread.
-   **🔐 Real Gmail Integration**: Connect your actual Gmail account via secure OAuth2 or explore with realistic mock data.
-   **🎨 Premium UI**: A responsive, accessible interface built with React, Tailwind CSS, and Lucide Icons.

## 🚀 Getting Started

### Prerequisites
1.  **Gemini API Key**: This app requires an API key from [Google AI Studio](https://aistudio.google.com/).
2.  **Google Cloud Project**: To test with your real Gmail account, you'll need a Client ID.

### Setup Real Gmail Testing
To enable real data synchronization:
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Enable the **Gmail API**.
3.  Configure your **OAuth Consent Screen** (add your email as a test user).
4.  Create **OAuth 2.0 Client ID** for a "Web Application."
5.  Add the app's current URL (e.g., `http://localhost:3000`) to **Authorized JavaScript origins**.
6.  Paste your Client ID into the **Developer Settings** on the Inbox Guardian login screen.

## 🛠️ Tech Stack

-   **Frontend**: React (v19), TypeScript
-   **Styling**: Tailwind CSS
-   **Icons**: Lucide React
-   **Charts**: Recharts
-   **AI Model**: `gemini-3-flash-preview`
-   **API**: Google Gmail API (via GAPI)
-   **Animations**: Canvas Confetti & CSS keyframes

## 📂 Project Structure

-   `/components`: UI screens for Auth, Scanning, Dashboard, and Review.
-   `/services/geminiService.ts`: Logic for batch analyzing emails with AI.
-   `/services/mailboxService.ts`: Hybrid service handling both GAPI/OAuth and Mock data.
-   `/utils/mockData.ts`: Generator for demo mode.
-   `App.tsx`: Main state machine for the application flow.

---

*Note: This application is a client-side demonstration. For maximum security, always review AI suggestions before executing bulk deletions.*