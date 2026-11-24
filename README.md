# Mill Liners Customer Overview · 磨机衬板客户总览

A bilingual (English / 中文) web app for managing mining customers and grinding-mill liner sales data: interactive map by sales region (APAC / CIS / EUR / AFR / SAM) with country drill-down, multi-condition filtering, Excel import/export, analytics dashboards — protected by username / password login with user management.

网页端客户总览应用：管理矿山客户与磨机信息、潜在销售额，按销售区域（APAC / CIS / EUR / AFR / SAM）在交互式地图上展示客户分布，支持按国家下钻定位、复合条件筛选、数据导出与可视化分析；内置用户名/密码登录与用户管理。界面支持中英文一键切换。

**Tech stack**: Next.js 16 · TypeScript · Tailwind CSS · shadcn/ui · Prisma (SQLite) · Leaflet · Recharts

---

## 1. Features · 功能简介

| Page 页面 | Features 功能 |
| --- | --- |
| **Dashboard · 数据总览** | KPI cards + combined filters (region / country / owner / mill type / mill size / supplier / status / keyword) + two views (by customer / by mill) + export to Excel (.xlsx) and CSV |
| **Map · 地图分布** | Interactive map (zoom / pan), one-click region views (Global / APAC / CIS / EUR / AFR / SAM); **Country drill-down**: pick a country from the dropdown to list all countries with data under the selected region and zoom the map into that country showing all its customers; customers plotted by lat/lng, dot size = annual potential value, color = region; click a dot for customer & mill details; sidebar list locates customers |
| **Analytics · 可视化分析** | Top-10 owners, value by country, mill count by country, mill type mix, supplier share, diameter distribution, diameter × set-price scatter |
| **Manage · 客户管理** | Add / edit / delete customers & mills in the Excel "Data Entry" format (with auto price calculation); bulk Excel import (append / replace); **admin-only** (see Access control below) |

**Access control · 访问控制** — the whole app now requires signing in:

- **First run**: the login page shows a one-time *create administrator account* form. This first account has full permissions and can manage other users.
- **Two roles**: **Administrator** — everything incl. the Manage tab (add / edit / delete / import) and user management; **Viewer** — read-only access to Dashboard / Map / Analytics (incl. export).
- **User management** (admin): avatar menu in the top-right corner → *User management*: add users, edit display names / roles, reset passwords, temporarily disable accounts, delete users. Nobody can delete their own account or remove the last active administrator.
- **Change password**: each user can change their own password (avatar menu → *Change password*).
- Sessions last 7 days (stay signed-in on your own laptop); expired or signed-out sessions return to the login page automatically.
- Accounts are stored locally in `db/custom.db` — nothing leaves your machine.

**Language toggle · 语言切换**: the header has an **EN / 中文** switch (also on the login page). Your choice is remembered (browser localStorage); the first visit auto-detects your browser language. 页面右上角可一键切换中英文，选择会被记住；首次访问按浏览器语言自动选择。

**Region auto-assignment · 销售区域自动划分** (assigned by country on create/import, manually overridable):

- **APAC**: Mongolia, Southeast Asia, Australia, Papua New Guinea
- **CIS**: China, the 5 Stan countries (Kazakhstan / Uzbekistan / Turkmenistan / Kyrgyzstan / Tajikistan), plus Russia and other ex-Soviet states
- **EUR**: Europe — Serbia, Greece, the EU countries, UK, Norway, Switzerland, the Balkans, Turkey, etc.
- **AFR**: all African countries
- **SAM**: all Central & South American countries

---

## 2. Setup on Windows (step by step) · Windows 安装步骤

> The exact same steps work on macOS / Linux — just use Terminal instead of PowerShell.
> 同样步骤适用于 macOS / Linux，仅终端程序不同。

### Step 0 — What you need · 准备

- **Node.js 20 LTS or newer** — download from <https://nodejs.org> (choose the **LTS** "Windows Installer (.msi)", 64-bit). This installs `node` and `npm` automatically.
- Internet access (map tiles load from the public ESRI service; no API key needed).
- The project folder (unzipped), e.g. `C:\mill-liners-app`.

Check the install — open **PowerShell** and run:

```powershell
node -v     # should print v20.x or newer
npm -v
```

### Step 1 — Install dependencies · 安装依赖

In PowerShell, `cd` into the project folder:

```powershell
cd C:\mill-liners-app
npm install
```

(First run takes a few minutes; it downloads ~600 MB into `node_modules\`.)

### Step 2 — Initialize the database · 初始化数据库

```powershell
npm run db:push
```

This creates / updates the SQLite file `db\custom.db` (if missing) and generates the database client. The shipped `db\custom.db` already contains the seeded data from your Excel workbook and the user accounts table — this step simply keeps it in sync with the schema.

Optional — re-import the original seed data (Excel Data Entry sheet + demo-PDF potential customers), which **overwrites** current data:

```powershell
npm run db:seed
```

### Step 3 — Start the app · 启动应用

```powershell
npm run dev
```

Wait until you see `✓ Ready`, then open **<http://localhost:3000>** in your browser. You will see the **login page**: the first time, it asks you to **create the administrator account** (username + password of your choice) — after that you sign in normally. Keep the PowerShell window open while using the app; press `Ctrl+C` to stop.

### Step 4 (optional) — Production mode · 生产模式

For smoother long-term use on your own machine:

```powershell
npm run build
npm start
```

`npm start` also serves <http://localhost:3000>. To change the port: `$env:PORT=3001; npm start` (PowerShell).

### Daily use · 日常使用

- Just repeat **Step 3** (or Step 4) each time you want to use the app; you stay signed in for 7 days.
- **Create accounts for colleagues**: sign in as administrator → avatar menu (top-right) → *User management* → *Add user* (choose the **Viewer** role for read-only access, **Administrator** for full access).
- **Back up your data**: copy the single file `db\custom.db` (e.g. to a USB stick or OneDrive) — it contains both the data **and** the user accounts.
- **Import a new Excel**: Manage tab (admin only) → *Import Excel* → choose *Append* (keep existing, skip exact duplicates) or *Replace all* (full refresh). Latitude / Longitude columns are imported too.
- The app runs **100% locally** — no data leaves your laptop.

### Optional — start with one click · 一键启动（可选）

Create a file `start-mill-liners.bat` in the project folder with this single line:

```bat
cd /d "%~dp0" && npm start
```

Double-click it to launch the app (run `npm run build` once beforehand).

---

## 3. Data notes · 数据说明

- Database is the single file **`db/custom.db`** (SQLite). Backup = copy that file. 数据库为单文件，备份即复制。
- Pre-loaded data: `Mill Liners Current and Potential Sales China 101126 revB.xlsx` (Data Entry sheet, 132 mill rows / 42 customers across CIS · EUR · AFR · SAM; totals match the workbook: annual value $192,979,456). Additional demo customers from the Nov-2025 sales PDF can be re-added via `npm run db:seed` (⚠ this wipes and reseeds the DB).
- **Status values**: `Existing Customer` / `Potential Customer` (the app also accepts the legacy wording `Current Customer` and normalizes it automatically). 状态支持 Existing/Potential，旧写法 Current 会自动归一。
- **Coordinate auto-check on import & manual entry**: latitude/longitude are validated against each country's bounding box; if they were swapped (e.g. Serbia entered as `22.1, 44.0` instead of `44.0, 22.1`), the app auto-corrects them and reports how many rows were fixed after import. 导入/录入时自动检测并纠正经纬度互换。
- Coordinates for Chinese mines were pre-filled from public sources; edit them in the Manage tab if needed.
- Excel import needs headers like `Owner`, `Equipment` (Data Entry format).

### Access control · 访问控制

- The app requires a **username / password** sign-in. On first run you create the administrator account; the administrator manages all other accounts (add / edit / reset password / disable / delete) via the avatar menu → *User management*.
- **Administrator**: full access, incl. the Manage tab and user management. **Viewer**: read-only (Dashboard / Map / Analytics + export).
- Forgot the admin password? Ask another administrator to reset it, or delete the `User` table rows in `db\custom.db` (e.g. with [DB Browser for SQLite](https://sqlitebrowser.org/)) to restart the first-run setup. 密码丢失可由其他管理员重置，或用 DB Browser for SQLite 清空 `User` 表后重新初始化。

---

## 4. Project structure · 目录结构

```
prisma/schema.prisma        # Data model (Customer / Mill / User / Setting)
prisma/seed.mjs             # Seed script (reads Excel + demo customers)
src/app/login/page.tsx      # Login / first-run setup page
src/app/page.tsx            # Main page (server-side auth gate)
src/app/api/                # Backend APIs: auth / users / customers / mills / import
src/components/app/         # Tabs, dialogs, map, user menu, auth panel
src/lib/auth.ts             # Password hashing (scrypt) + signed session cookies
src/lib/i18n.tsx            # EN/中文 dictionary + language provider
src/lib/regions.ts          # Country → region mapping (APAC/CIS/EUR/AFR/SAM) + country map views
db/custom.db                # SQLite database file (data + user accounts)
```

## 5. Troubleshooting · 常见问题

| Symptom | Fix |
| --- | --- |
| `'node' is not recognized` | Node.js not installed or PowerShell not restarted after install — reinstall, then open a **new** PowerShell window |
| `npm install` fails / ETIMEDOUT | Check network or corporate proxy; retry |
| Map is grey/blank | Map tiles need internet (ESRI public tiles) |
| Port 3000 busy | `npx next dev -p 3001` (dev) or `$env:PORT=3001; npm start` |
| Import says "header row not found" | The workbook needs a sheet with `Owner` / `Equipment` headers (Data Entry sheet is auto-detected) |
| `npm run db:push` error | Make sure you run it **inside the project folder** (where `package.json` lives) |
| Forgot a user's password | An administrator resets it via *User management*; for the only admin, see *Access control* above |
| Signed out unexpectedly | Sessions last 7 days — just sign in again |
