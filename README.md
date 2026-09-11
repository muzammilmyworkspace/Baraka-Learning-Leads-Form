# Baraka Learning — Lithuanian class registration form

A single-page registration form for Baraka Learning's Level A1 Lithuanian classes,
introduced by SnZ Ventures. Every submission is saved as a row in a Google Sheet
inside the Drive folder **Baraka Learning Leads** and an email is sent to
`snz.ventures2025@gmail.com`. No server to run — the page is static (Vercel) and
the backend is a free Google Apps Script.

```
Student fills form (Vercel)  ──POST──▶  Apps Script web app  ──▶  Google Sheet in Drive
                                                │
                                                └──▶  email to snz.ventures2025@gmail.com
```

## Files

| File | What it is |
|---|---|
| `index.html` | The form. Static page, deploy anywhere (Vercel). |
| `apps-script/Code.gs` | Google Apps Script backend — paste into script.google.com. |
| `apps-script/appsscript.json` | Script manifest (optional; only needed if you enable "Show manifest" in the editor). |

## One-time setup (about 5 minutes)

### 1. Create the Apps Script

1. Sign in to Google as **snz.ventures2025@gmail.com** (this account will own the leads folder).
2. Go to <https://script.google.com> → **New project**.
3. Delete the default code, paste the whole of `apps-script/Code.gs`, and save (name the project e.g. *Baraka Learning Leads*).
4. In the toolbar pick the function **`setup`** and press **Run**.
   Approve the permissions when asked (Drive, Sheets, send email). If Google shows
   "This app isn't verified", click *Advanced → Go to … (unsafe)* — it is your own script.
5. Check the **Execution log**: it prints the links to the new folder and spreadsheet.
   In Drive you now have `Baraka Learning Leads/Baraka Learning Leads` (a sheet with a *Leads* tab).

### 2. Deploy it as a web app

1. **Deploy → New deployment** → gear icon → **Web app**.
2. Settings:
   - Execute as: **Me**
   - Who has access: **Anyone**
3. **Deploy**, then copy the **Web app URL** (ends in `/exec`).
4. Open that URL in a browser once — you should see `{"ok":true,"service":"Baraka Learning leads",...}`.

### 3. Connect the form

1. In `index.html`, find `var SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";` and paste the URL.
2. Commit and push — Vercel redeploys automatically.
3. Submit a test registration. A row appears in the sheet and an email arrives.

### 4. Share the leads with the client

In Google Drive, right-click the folder **Baraka Learning Leads → Share** and add the
client's Google account (Viewer to read, Editor to let them update the *Status* column).
Everything inside the folder inherits that access.

## Deploying the page on Vercel

Import this GitHub repo in Vercel as a static site — no build step, no framework.
`index.html` is served at the root URL.

## Referral tracking

Add `?ref=CODE` to the link you share, e.g. `https://your-site.vercel.app/?ref=FB1`.
The code is shown in the footer and saved in the sheet's **Reference** column
(default `SNZ`). Use a different code per campaign to see where leads come from.

## Changing things later

| Want to… | Change |
|---|---|
| Rename the folder or sheet | `FOLDER_NAME` / `FILE_NAME` at the top of `Code.gs`, then run `setup` again |
| Send the alert to another address | `NOTIFY_EMAIL` in `Code.gs` (set to `""` to turn emails off) |
| Block random POSTs to the script | Put the same secret in `FORM_TOKEN` in both `Code.gs` and `index.html` |
| Change the fallback contact shown on errors | `CONTACT_EMAIL` in `index.html` |
| Edit the code after deploying | Save, then **Deploy → Manage deployments → Edit → New version → Deploy** (the URL stays the same) |

Every submission also fills the **Status** column with `New` — update it by hand
(*Contacted*, *Enrolled*, *Paid*…) to track each lead through to a referral fee.
