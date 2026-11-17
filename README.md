# ALEL Quotation Builder

Web app for building and exporting **Akij Light Engineering Limited (ALEL)** quotations as PDF, with product prices pulled from the live RTM item-rate configuration.

**Live app:** https://quotation-deploy-two.vercel.app

## Features

- Category → Sub-category → Product selection (26 categories, 382 products)
- **Live RTM prices** across 4 distribution channels:
  - Distributor · Electrical · Home Appliances · Electrical-L
- Quantity + editable unit price per line
- Subtotal, percentage discount, total
- Customer details, payment terms, validity date
- Print/PDF export on the official ALEL letterhead (header + footer)
- Commercial Terms & Conditions, greeting, prepared-by block
- "System generated quotation — no signature required" note

## How pricing works

Prices are read from `itm.tblPriceSetup` for Business Unit **237 (ALEL)** in the RTM ERP,
condition type `Distribution Channel` (`intConditionTypeId = 2`).

Channel IDs:

| ID  | Channel         |
|-----|-----------------|
| 140 | Distributor     |
| 149 | Electrical      |
| 153 | Home Appliances |
| 184 | Electrical-L    |

The catalog is snapshotted into `alel-live-catalog.json` and embedded at build time.

## Refresh prices from live RTM

1. Pull current rows from the ERP gateway:

```sql
SELECT i.strItemCode, i.strItemName, i.strItemCategoryName, i.strItemSubCategoryName,
       p.intConditionReffId AS channelId, p.numPrice
FROM itm.tblPriceSetup p
JOIN itm.tblItem i ON i.intItemId = p.intItemId
WHERE p.intBusinessUnitId = 237
  AND p.isActive = 1
  AND p.intConditionTypeId = 2
  AND i.isActive = 1
ORDER BY i.strItemCategoryName, i.strItemSubCategoryName, i.strItemName, p.intConditionReffId;
```

2. Save the result as TSV (tab separated) to `live-catalog-part1.tsv` (+ more parts if large).
3. Rebuild:

```bash
node build.js
```

This regenerates `index.html` with the fresh catalog and letterhead images.

## Local development

```bash
# serve the built app
npx serve .
# or
python -m http.server 8000
```

## Deploy

### Vercel

```bash
npx vercel --prod
```

### GitHub + Vercel (recommended)

1. Create a GitHub repo and push:

```bash
git init
git add .
git commit -m "ALEL Quotation Builder"
git branch -M main
git remote add origin https://github.com/<your-user>/alel-quotation-app.git
git push -u origin main
```

2. In Vercel → **Add New Project** → import the GitHub repo.
   - Framework preset: **Other**
   - Build command: *(leave empty)*
   - Output directory: *(leave empty — static `index.html` at root)*

3. Every push to `main` auto-deploys.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Built single-file app (deployed artifact) |
| `quotation-template.html` | HTML/JS/CSS source template |
| `build.js` | Injects catalog + letterhead into the template |
| `alel-live-catalog.json` | Snapshot of live RTM catalog |
| `live-catalog-part*.tsv` | Raw TSV price extracts |

## Letterhead

Header and footer are cropped from the official ALEL letterhead and embedded as base64
so the PDF prints on the correct stationery. They render in normal flow (not `position: fixed`)
to ensure they appear in the exported PDF.
