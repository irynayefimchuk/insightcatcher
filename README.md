# Usability Test Runner

Interactive checklist for running moderated usability test sessions.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

---

## How It Works

1. **Select a project** (e.g., CCI, Another Product)
2. **Select a test** within that project
3. **Run the session** — the app guides you through warmup → tasks → wrapup
4. **Export results** — JSON file or copy markdown summary

---

## Adding a New Test (no code editing!)

### Step 1: Create your JSON file

Copy an existing test as a template:
```bash
cp public/scripts/example/example-test.json public/scripts/cci/my-new-test.json
```

Edit `my-new-test.json` with your tasks.

### Step 2: Register it in config.json

Open `public/scripts/config.json` and add your test:

```json
{
  "projects": [
    {
      "id": "cci",
      "name": "CCI (Clinical Cost Intelligence)",
      "scripts": [
        {
          "id": "snapshot-test",
          "name": "Snapshot Tab Usability Test",
          "file": "cci-snapshot-test.json"
        },
        {
          "id": "my-new-test",
          "name": "My New Test",
          "file": "my-new-test.json"
        }
      ]
    }
  ]
}
```

### Step 3: Refresh

The new test appears in the dropdown.

---

## Adding a New Project

Edit `public/scripts/config.json`:

```json
{
  "projects": [
    {
      "id": "cci",
      "name": "CCI",
      "scripts": [...]
    },
    {
      "id": "new-product",
      "name": "New Product Name",
      "scripts": [
        {
          "id": "first-test",
          "name": "First Test",
          "file": "first-test.json"
        }
      ]
    }
  ]
}
```

Then create the folder and JSON file:
```bash
mkdir public/scripts/new-product
cp public/scripts/example/example-test.json public/scripts/new-product/first-test.json
```

---

## Folder Structure

```
public/
└── scripts/
    ├── config.json          ← Lists all projects and tests
    ├── cci/
    │   └── cci-snapshot-test.json
    ├── example/
    │   └── example-test.json   ← Use as template
    └── your-project/
        └── your-test.json
```

---

## Sharing with PMs

### Option 1: Deploy to Vercel (recommended)

1. Push this folder to GitHub
2. Go to vercel.com → Import your repo
3. Deploy
4. Share the URL (e.g., `your-app.vercel.app`)

PMs just open the link — no install needed.

### Option 2: Share the folder

PMs need to install Node.js and run `npm install` + `npm run dev`.

---

## Where Data is Stored

| Data | Location |
|------|----------|
| In-progress session | Browser localStorage (auto-saves) |
| Completed sessions | Browser localStorage |
| Exported sessions | JSON files you download |

**Note:** Browser storage is per-device. Export sessions to keep them safe.

---

## JSON Structure

See `public/scripts/example/example-test.json` for a complete template with comments.

Key sections:
- `setup` — Rules to read at start
- `warmup` — Questions before showing prototype
- `tasks` — The actual test tasks
- `wrapup` — Closing questions
- `observerNotes` — Reference for what behaviors mean
