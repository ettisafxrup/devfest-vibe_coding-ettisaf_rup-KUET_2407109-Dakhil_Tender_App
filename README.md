# Dakhil: Our Tender Document Package Builder

**Participant:** Ettisaf Rup
**Mail:** mosharraf2407109@stud.kuet.ac.bd
**Live URL:** https://dakhil-ettisafxrup.netlify.app/

AI DevFest vibe-coding contest entry. Frontend only: every file is processed in the browser and nothing is uploaded.

## What problem it solves

A tender bid is rejected if one required document is missing, expired, duplicated or out of order. Office staff usually check this by eye against a folder of PDFs.

Dakhil ("submission" in Bangla) turns the tender's `requirements.json` into a live checklist. Staff match each PDF to its document, the app checks every rule as they go, and it produces one ordered, page-numbered PDF only when nothing blocks it.

## Main features completed

All nine main tasks from the problem statement:

| #   | Task          | How it works                                                                                                                                   |
| --- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | Load the list | Opens `requirements.json`, shows tender details and documents sorted by `order`.                                                               |
| 4.2 | Upload files  | Many PDFs at once, with name and page count. Non-PDF files are rejected with a clear message. Any file can be removed.                         |
| 4.3 | Match files   | By dropdown on the document, dropdown on the file, or drag and drop. One file per document, one document per file. Change or undo at any time. |
| 4.4 | Expiry dates  | A date field appears for matched documents with `has_expiry`.                                                                                  |
| 4.5 | Live status   | Missing, Expiry date needed, Expired, Not provided or OK, updated on every change. Expiring on the deadline day counts as OK.                  |
| 4.6 | Duplicates    | Files with identical content (SHA-256) are marked, and cannot be matched to two different documents.                                           |
| 4.7 | Generate      | The button stays disabled while anything blocks, and lists each reason with a link to the row.                                                 |
| 4.8 | Download      | Saved as `<tender_id>_Package.pdf`.                                                                                                            |
| 4.9 | Two languages | The whole interface switches between English and Bangla; document names use `title_en` or `title_bn`.                                          |

The generated PDF follows Section 6:

- **Cover page** in English, laid out as a formal submission: tender ID, title, procuring entity, bidder, deadline, date prepared, and a schedule of the included documents in order with their page ranges. It carries a faint "ETTISAF RUP DEVFEST" watermark.
- **Documents** in tender order, all pages, skipping optional documents with no file.
- **Footer** `<tender_id> | Page X of Y` on every page. Each page is scaled slightly to open a blank band at the bottom, so the footer never covers content, including on rotated, cropped and very small pages. Filled-in form fields are flattened so their values stay visible.

Also included:

- Three pages at clean URLs: home (`/`), your tender (`/tender`) and a built-in sample tender (`/sample`).
- Light and dark themes, switched from the top bar and remembered between visits; the first visit follows the system setting.
- **Quick select** on the sample page fills every required document with its correct file and expiry date in one click.
- Drop a whole tender folder on the home page: `requirements.json` and the PDFs inside it load together.
- Opening a second tender over loaded files asks first, and the browser warns before a tab with loaded files is closed.
- Responsive layout down to 360px, keyboard-accessible controls, and a live page range on every checklist row.

## Bonus features completed

- **Handle bad files safely:** damaged and password-protected PDFs get a clear message instead of a crash. The 30-file and 50 MB limits are enforced the same way.

No other bonus task is implemented.

## Known problems / limitations

- No auto-match: every file is matched by hand.
- No index page, seal placement, checklist export, or AI help.
- Work is not saved. Refreshing the page clears the tender and files; only the language choice is remembered.
- No in-app file preview or thumbnails, so a file with an unhelpful name must be opened outside the app to identify it. The finished package can be previewed in a new tab.
- The PDF cover is English only. Characters outside Latin-1 in tender fields are printed as `?`.
- The expiry date field uses the browser's own date format.
- Removing a file has no undo.
- Tested with `npm test` (42 checks on the rules and the generated PDF) and automated runs in headless Microsoft Edge (Chromium), not in Chrome itself. The password-protected check uses a hand-built encrypted file, not one saved by a real PDF tool.
- The "SAMPLE" watermark seen inside the sample documents is printed in the contest's own PDFs. The app copies document pages unchanged and does not alter it.
- The built-in sample page loads the pack's ten PDFs only; its PNG logo is left out so the page does not open with an error. Adding a non-PDF yourself still shows the rejection.
- Clean URLs need the host to serve `index.html` for unknown paths. `public/_redirects` does this on Netlify; other hosts need their own rule.
- The Bangla text has not been reviewed by a second reader.

## How to run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev        # development server
npm run build      # type-check and production build into dist/
npm run preview    # serve the production build
npm test           # rule and PDF checks
```

To try it, open the sample tender from the home page, or load `sample-pack/requirements.json` and the PDFs in `sample-pack/documents/`.

Contest deliverables are in `output/T-2026-0417_Package.pdf` and `screenshots/`.

## AI tools used

- **Claude Code** (Anthropic), running Claude Opus 5.5, for planning, the design system, implementation, review and automated browser testing.

No API keys are used by the app, and none are stored in this repository.

## Most useful AI prompt

The opening prompt, which forced a plan before any code (excerpt):

> You are a senior product designer and frontend architect. I am participating in a frontend-only 90-minute vibe-coding competition. […] My goal is not to build the largest application. My goal is to create a small but exceptionally polished product that judges immediately understand and remember.
>
> First: 1. Identify the target user 2. Define the core problem 3. Define the core solution 4. Define the single WOW feature 5. Design the ideal 3-minute demo flow 6. List only the essential screens 7. Identify potential judge objections.
>
> Do NOT write code yet.

It produced the "checklist is the package" concept and exposed the traps hidden in the sample pack before a line was written.
