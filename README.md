# Hackathon Status Board

A real-time status board for hackathon events. Participants signal **Done** or **Need Help**, and facilitators see everything at a glance on a color-coded dashboard.

<a href="https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2FRaikHerrmann%2Fhackathon-status%2Fmain%2Fazuredeploy.json" target="_blank"><img src="https://aka.ms/deploytoazurebutton" alt="Deploy to Azure" /></a>

---

## Features

- **Dashboard** — Live color-coded grid of all participants (auto-refreshes every 5 seconds)
  - 🟢 Green = Done with the challenge
  - 🔴 Red = Needs help
  - ⚫ Gray = Still working
- **Participant Page** — Look up your entry by table number, participant number, or name and set your status with large tap-friendly buttons
- **Admin Page** — Full management for hackathon facilitators:
  - Create and delete **hackathons / events** (isolated containers per hackathon challenge)
  - Add, edit, and delete **participants** (by table #, participant #, or name)
  - Reset all statuses in a hackathon / event with one click

## Architecture

```
┌──────────────┐     ┌──────────────────────────┐     ┌──────────────────┐
│   Browser    │────▶│  Azure Static Web Apps    │────▶│  Azure Table     │
│  (3 pages)   │     │  + Managed Functions API  │     │  Storage         │
└──────────────┘     └──────────────────────────┘     └──────────────────┘
                              │
                     ┌────────▼─────────┐
                     │ Application      │
                     │ Insights + Logs  │
                     └──────────────────┘
```

| Component | Azure Service | SKU / Tier | Est. Cost |
|-----------|---------------|------------|-----------|
| Frontend (3 HTML pages) | Static Web Apps | Standard | ~$9/mo |
| REST API (Node.js 20) | SWA Managed Functions | Included | $0 |
| Database | Azure Table Storage | Standard LRS (pay-per-use) | ~$0/mo |
| Monitoring | App Insights + Log Analytics | Pay-per-GB | ~$0/mo |
| Auth | Managed Identity (Entra ID) | Included | $0 |

**Total estimated cost for ≤100 users: ~$9/month** (Standard tier required for managed identity; no storage keys used)

---

## Quick Start: Deploy to Azure

### Option 1: One-Click Deploy (recommended)

#### 1. Create the Azure resources

1. Click the **Deploy to Azure** button above
2. Select your subscription, create or pick a resource group, choose a region
3. Click **Review + create** → **Create**
4. After deployment completes, go to the **Outputs** tab to find your `swaUrl`

#### 2. Get the deployment token from Azure

1. In the [Azure portal](https://portal.azure.com), type **"Static Web Apps"** in the top search bar and click the service
2. Click on your Static Web App (named something like `swa-hackstatus...`)
3. On the **Overview** page (the default page that opens), look for **"Manage deployment token"** in the top command bar
4. A panel opens showing the token — click the **copy icon** next to it

> **Tip:** If you don't see "Manage deployment token" in the toolbar, try the left sidebar → **Settings** → **Deployment token** (the name varies by portal version).

#### 3. Add the token as a GitHub secret

1. In your GitHub repo, click the **Settings** tab (far right of the repo tabs: `Code`, `Issues`, `Pull requests`, `Actions`, ... `Settings`)
2. In the left sidebar, find the **Security** section → expand **"Secrets and variables"** → click **"Actions"**
3. Click **"New repository secret"**
4. **Name:** `AZURE_STATIC_WEB_APPS_API_TOKEN` (exact, all caps with underscores)
5. **Secret:** paste the deployment token you copied from Azure
6. Click **"Add secret"**

> **Can't find Settings?** Make sure you are logged into GitHub as the **owner** of the repo (or have admin permissions). The Settings tab is only visible to repo admins. You can also use the direct link: `https://github.com/<your-user>/<your-repo>/settings/secrets/actions`

#### 4. Trigger the deployment

- **If you push a new commit to `main`**, the GitHub Actions workflow triggers automatically.
- **To re-run manually:** go to the **Actions** tab → click the latest workflow run → click **"Re-run all jobs"**.
- Wait ~1–2 minutes. A green checkmark means the app is live at your `swaUrl`.
- **Note:** The first request may take up to 5 minutes after deployment as Azure propagates the managed identity role assignment.

### Option 2: Azure Developer CLI

```bash
# Clone the repo
git clone https://github.com/RaikHerrmann/hackathon-status.git
cd hackathon-status

# Login and deploy
azd auth login
azd init -e dev
azd up
```

### Option 3: Azure CLI + Bicep

```bash
az deployment sub create \
  --location eastus \
  --template-file infra/main.bicep \
  --parameters environmentName=hackathon location=eastus
```

---

## Local Development

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-locally)
- [Azure Static Web Apps CLI](https://github.com/Azure/static-web-apps-cli)

### Setup

```bash
# Install API dependencies
cd src/api
npm install

# Start the local dev server (from project root)
cd ../..
npx @azure/static-web-apps-cli start src/web --api-location src/api
```

The app will be available at `http://localhost:4280`.

---

## Accessing the Pages

Once deployed (or running locally), the app has three pages accessible from your Static Web App URL:

| Page | URL | Who uses it |
|------|-----|-------------|
| **Dashboard** | `https://<your-swa>.azurestaticapps.net/` | Everyone — shows live status grid |
| **My Status** | `https://<your-swa>.azurestaticapps.net/participant.html` | Participants — set your status |
| **Admin** | `https://<your-swa>.azurestaticapps.net/admin.html` | Facilitators — manage rounds & participants |

**Finding your URL after deployment:**

- **One-click deploy**: Go to the Azure Portal → your resource group → Static Web App resource → **Overview** → **URL**
- **azd**: Run `azd env get-values` and look for `AZURE_SWA_URL`
- **Local dev**: `http://localhost:4280`

> **Tip:** Share the Dashboard URL on a big screen so everyone can see the status board. Share the Participant URL with hackathon attendees (e.g., via QR code). Keep the Admin URL for facilitators only.

---

## How It Works

### For Participants

1. Go to the **My Status** page
2. Select the current round from the dropdown
3. Enter your table number, participant number, or name
4. Click **Find Me** to look up your entry
5. Tap the big **✅ Done** or **🆘 Need Help** button

### For Facilitators

1. Go to the **Admin** page
2. **Before the hackathon**: Create a round (e.g., "Challenge 1")
3. Add participants — by table number, participant number, or name
4. **During the hackathon**: Monitor the **Dashboard** for real-time status
5. **Between rounds**: Click "Reset All Statuses" to clear the board
6. **After the hackathon**: Delete the round to clean up

### Rounds

Each hackathon round is an isolated container. Rounds keep participant lists and statuses separate, so you can run multiple challenges in sequence. Delete a round to remove it and all its data.

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/rounds` | List all rounds |
| `POST` | `/api/rounds` | Create a round `{ "name": "..." }` |
| `DELETE` | `/api/rounds/{id}` | Delete round + all its participants |
| `POST` | `/api/rounds/{id}/reset` | Reset all statuses in a round to idle |
| `GET` | `/api/participants?roundId=` | List participants (optionally filtered by round) |
| `POST` | `/api/participants` | Add participant `{ "roundId", "identifier", "identifierType" }` |
| `PUT` | `/api/participants/{id}` | Update participant (admin) |
| `DELETE` | `/api/participants/{id}?roundId=` | Delete a participant |
| `PUT` | `/api/participants/{id}/status` | Set status `{ "status": "done|need-help|idle", "roundId" }` |

---

## Project Structure

```
hackathon-status/
├── azuredeploy.json             # One-click Deploy to Azure template
├── azure.yaml                   # Azure Developer CLI config
├── .github/workflows/           # GitHub Actions CI/CD
│   └── azure-static-web-apps.yml
├── infra/                       # Bicep infrastructure (for azd)
│   ├── main.bicep
│   ├── abbreviations.json
│   └── modules/
│       ├── storage.bicep
│       ├── monitoring.bicep
│       └── staticwebapp.bicep
└── src/
    ├── api/                     # Azure Functions API (Node.js 20)
    │   ├── host.json
    │   ├── package.json
    │   └── src/
    │       ├── storageClient.js
    │       └── functions/
    │           ├── rounds.js
    │           └── participants.js
    └── web/                     # Static frontend
        ├── index.html           # Dashboard (live status grid)
        ├── participant.html     # Participant self-service
        ├── admin.html           # Admin management panel
        ├── style.css
        ├── app.js               # Shared API client
        └── staticwebapp.config.json
```

## License

MIT
