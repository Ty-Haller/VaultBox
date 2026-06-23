# VaultBox — Session Handoff

**Last updated:** 2026-06-20  
**Status:** Dev servers stopped. Ports 5173 and 8000 are free.

Use this file to resume work. The main project README (`README.md`) still describes the baseline app; this document covers recent work and operational notes.

---

## Quick resume

```bash
cd /home/hallert/Projects/VaultBox
npm run start
```

- **Frontend:** http://127.0.0.1:5173 (use this URL — Vite proxies `/api` to Django)
- **Backend API:** http://127.0.0.1:8000/api/
- **Admin UI:** http://127.0.0.1:5173/admin

Default admin credentials (seeded): `admin` / `admin`

---

## What we built this session

### 1. Cancelable audits

Audits in progress can be cancelled from the UI. Cancelled audits cannot be edited.

| Layer | Location |
|-------|----------|
| API | `POST /api/audits/{id}/cancel/` — `backend/inventory/views.py` (`AuditSessionViewSet.cancel`) |
| Frontend | Audits list, Audit start page, Audit form footer |
| Client | `api.cancelAudit()` in `src/lib/api.ts` |

### 2. Purchase & Sales report (time-filtered)

New report section on the Reports page with date presets (YTD, 30/90 days, all time, custom range).

| Layer | Location |
|-------|----------|
| UI | `src/components/reports/PurchaseSaleReport.tsx` |
| Shared date logic | `src/lib/dateRange.ts`, `src/components/reports/DateRangeFilter.tsx` |
| Transaction aggregation | `src/lib/transactionReports.ts` |
| PDF export | `GET /api/reports/purchase-sale.pdf?from=&to=` |

### 3. Profit & Loss report (time-filtered)

Replaced the old all-time gain/loss table with a period-based P/L report:

- **Realized P/L** — sales within the selected period
- **Unrealized P/L** — active holdings acquired in the period

| Layer | Location |
|-------|----------|
| UI | `src/components/reports/ProfitLossReport.tsx` |
| PDF export | `GET /api/reports/profit-loss.pdf?from=&to=&charts=true` |
| Optional charts in PDF | P/L breakdown bar, portfolio value bar, unrealized P/L pie |
| Backend valuation (PDF) | `backend/inventory/valuation.py`, `backend/inventory/metal_prices.py` (static prices — no live network in PDF) |

### 4. CSV export on tables

Export button on Inventory and Reports tables. Exports visible/filtered/sorted columns.

| Layer | Location |
|-------|----------|
| Core utility | `src/lib/csvExport.ts` |
| Button | `src/components/ui/ExportCsvButton.tsx` |
| Table integration | `DataTable`, `FilterableDataTable` — pass `exportFilename` (+ optional `getCsvValue` per column) |

**CSV filenames in use:**

| Page / table | Filename |
|--------------|----------|
| Inventory | `vaultbox-inventory.csv` |
| Purchases | `vaultbox-purchases.csv` |
| Sales | `vaultbox-sales.csv` |
| Realized P/L | `vaultbox-realized-pl.csv` |
| Unrealized P/L | `vaultbox-unrealized-pl.csv` |
| Audit reports | `vaultbox-audit-reports.csv` |
| Dealer breakdown | `vaultbox-dealer-acquisitions.csv` |

---

## Key files map

```
backend/inventory/
  views.py          # audits (cancel/complete), ReportPDFView
  pdf_reports.py    # portfolio, inventory, labels, purchase-sale, profit-loss PDFs
  valuation.py      # holding valuation for P/L PDF
  metal_prices.py   # static metal prices for PDF
  audit_lines.py    # audit line item logic

src/
  pages/Reports.tsx, Inventory.tsx, Audits.tsx, AuditFormPage.tsx, AuditStartPage.tsx
  components/reports/   # PurchaseSaleReport, ProfitLossReport, DateRangeFilter
  components/ui/        # DataTable, FilterableDataTable, ExportCsvButton
  lib/api.ts            # cancelAudit, reportPdfUrl
  lib/csvExport.ts
  lib/transactionReports.ts
  lib/dateRange.ts

scripts/start.sh        # kills stale ports, migrate, starts backend + frontend
```

---

## PDF report endpoints

| Type | URL | Query params |
|------|-----|--------------|
| Portfolio | `/api/reports/portfolio.pdf` | — |
| Inventory | `/api/reports/inventory.pdf` | — |
| QR labels | `/api/reports/labels.pdf` | `holdings` (comma-separated IDs) |
| Purchase & Sales | `/api/reports/purchase-sale.pdf` | `from`, `to` (ISO dates) |
| Profit & Loss | `/api/reports/profit-loss.pdf` | `from`, `to`, `charts=true` (optional) |

Frontend builds URLs via `api.reportPdfUrl(type, params)` in `src/lib/api.ts`.

---

## Troubleshooting

### Bad gateway / cannot reach API

Usually Vite (5173) is up but Django (8000) is down, or SQLite is locked by hung `manage.py shell` processes.

```bash
# Free ports and stale processes
for port in 5173 5174 5175 8000; do fuser -k "${port}/tcp" 2>/dev/null; done
pgrep -f 'manage.py runserver' | xargs -r kill
pgrep -f 'manage.py shell' | xargs -r kill
pgrep -x vite | xargs -r kill

# Restart
npm run start
```

Always use **http://127.0.0.1:5173** — opening `dist/` alone will not proxy API requests.

### Pie chart infinite loop in P/L PDF (fixed)

ReportLab's `enumerate(pie.slices)` never terminates. Fixed in `pdf_reports.py` — use `range(len(pie.data))` instead.

---

## Pending / next session

1. **Unapplied model migrations** — `makemigrations --check` reports drift:
   - `administration/migrations/0006_alter_auditworkflow_audit_type.py`
   - `inventory/migrations/0010_alter_auditlineitem_options_and_more.py`  
   Run when ready:
   ```bash
   cd backend
   python3 manage.py makemigrations
   python3 manage.py migrate
   ```

2. **Verify after restart** — P/L PDF with `charts=true` in browser; CSV exports on filtered inventory.

3. **Optional enhancements**
   - CSV export on Audits / Dashboard pages
   - Purchase/sale PDF with charts
   - Live spot prices in PDF exports (currently static in `metal_prices.py`)

4. **README.md** — still missing audits, P/L, CSV, and new PDF types; update when convenient.

---

## Shutdown checklist (done)

- [x] Killed processes on ports 5173, 5174, 5175, 8000
- [x] Stopped Vite and Django runserver processes
- [x] Cleared stale `manage.py shell` processes
- [x] Wrote this handoff document

---

## Tech stack (unchanged)

**Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Recharts, TanStack Query, React Router 7

**Backend:** Django 5, DRF, SQLite, Pillow, ReportLab, qrcode