# SharePoint Integration Setup Guide

## Overview

InsightCatcher saves research session data to SharePoint instead of a database. Sessions are stored as JSON files in:

```
https://healthcarequalitycatalyst.sharepoint.com/sites/UserExperience/sessions/{study_id}/{yyyy}/{mm}/{session_id}.json
```

## What IT Needs to Do

### 1. Azure App Registration (5 minutes)

Ask IT to create an Azure app registration with these details:

- **Name:** `InsightCatcher-SharePoint-API`
- **Type:** Web application
- **Purpose:** Machine-to-machine (M2M) authentication for research session storage

IT will provide:
```
AZURE_CLIENT_ID = [32-character UUID]
AZURE_CLIENT_SECRET = [long secret string]
AZURE_TENANT_ID = [32-character UUID]
```

### 2. SharePoint Permissions (2 minutes)

Request these permissions in the Azure app:
- **Microsoft Graph API**
  - `Files.ReadWrite.All` (or scoped to SharePoint site)

### 3. Get SharePoint IDs (10 minutes)

Ask IT or extract these values:

**SiteId:** `healthcarequalitycatalyst.sharepoint.com/sites/UserExperience`

Use Graph API to get:
```bash
# Get site ID
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://graph.microsoft.com/v1.0/sites/healthcarequalitycatalyst.sharepoint.com:/sites/UserExperience"

# Copy: id field (format: "hashstring,siteid,tenantid")
# This becomes SHAREPOINT_SITE_ID
```

**DriveId:** The document library ID

```bash
# Get drive ID
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://graph.microsoft.com/v1.0/sites/{SHAREPOINT_SITE_ID}/drives"

# Find default drive, copy: id field (format: "b!xxx...")
# This becomes SHAREPOINT_DRIVE_ID
```

## What You Need to Do

### 1. Create the `sessions` Folder in SharePoint

In SharePoint site root, create a folder named `sessions`

(The app will auto-create subfolders: `sessions/{study_id}/{yyyy}/{mm}/`)

### 2. Fill in .env.local

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with values from IT:
```
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_TENANT_ID=...
SHAREPOINT_SITE_ID=...
SHAREPOINT_DRIVE_ID=...
```

### 3. Test Locally

```bash
npm run dev
# Create and complete a research session
# Check SharePoint site for saved files
```

### 4. Deploy

```bash
git add .
git commit -m "Add SharePoint integration for session storage"
git push
```

Vercel will automatically:
- Read `.env.local` values from your Vercel project settings
- Save sessions to SharePoint on production

## File Structure in SharePoint

```
/sites/UserExperience/
  └── sessions/
      ├── onboarding_v2/
      │   └── 2026/
      │       └── 04/
      │           ├── sess_1234567890ab.json
      │           └── sess_1234567890cd.json
      └── checkout_test/
          └── 2026/
              └── 04/
                  └── sess_1234567890ef.json
```

## Session JSON Structure

Each file contains:

```json
{
  "id": "sess_1234567890ab",
  "project_id": "onboarding_v2",
  "project_name": "Onboarding Redesign",
  "script_id": "cci-snapshot-test-v2",
  "script_title": "CCI Snapshot Test",
  "participant_id": "p045",
  "runner_name": "Sarah Chen",
  "session_start_time": "2026-04-22T14:03:00.000Z",
  "session_end_time": "2026-04-22T14:31:00.000Z",
  "task_status": {...},
  "warmup_status": {...},
  "wrapup_status": {...},
  "session_notes": "Participant found navigation confusing"
}
```

## Troubleshooting

### "Failed to authenticate with Azure"
- ✓ Check `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` in `.env.local`
- ✓ Verify service principal hasn't expired
- ✓ Ask IT to check app registration is active

### "Failed to save session to SharePoint"
- ✓ Check `SHAREPOINT_SITE_ID` and `SHAREPOINT_DRIVE_ID`
- ✓ Verify app has `Files.ReadWrite.All` permission
- ✓ Verify `/sessions` folder exists in SharePoint site root
- ✓ Check folder permissions

### "Method not allowed" or 405 error
- ✓ Only POST requests are supported for saving
- ✓ Check endpoint is `/api/save-session`

## Future: Reading Sessions

Once working, you can add:
- `/api/sessions?study_id=onboarding_v2` — list sessions for a study
- `/api/sessions/{session_id}` — read a specific session

This would require building a read endpoint that queries the SharePoint folder structure or maintains a searchable index table.

## Security Notes

- ✅ Azure credentials are **server-side only** (never sent to browser)
- ✅ Browser never sees SharePoint credentials
- ✅ Each session file can have SharePoint permissions applied by IT
- ✅ Audit trail maintained by SharePoint (who accessed, when, etc.)
