# Expense & Budget Visualizer — Project Steering

## Overview

This is a client-side, mobile-friendly single-page web application for tracking personal expenses and visualizing spending by category. It requires no backend, no build step, and no framework — just open `index.html` in any modern browser.

## Project Structure

```
index.html          # App entry point and full HTML structure
css/
  style.css         # Single stylesheet (all styles, theming, layout)
js/
  app.js            # Single JavaScript file (all logic)
```

Folder rules are strict: **one CSS file** in `css/`, **one JS file** in `js/`. Do not add additional files to those folders.

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Structure  | HTML5 (semantic elements)           |
| Styling    | CSS3 (custom properties, CSS Grid)  |
| Logic      | Vanilla JavaScript (ES2020, strict) |
| Chart      | Chart.js 4.4 via CDN (pie chart)    |
| Storage    | Browser `localStorage` (no backend) |

No frameworks (React, Vue, Angular, etc.) and no bundlers (Webpack, Vite, etc.) are used or should be introduced.

## Features

### Core
- **Add transaction form** — fields: Item Name (text), Amount (number, Rp), Category (Food / Transport / Fun). All fields are required; inline validation shows errors per field.
- **Transaction list** — scrollable, shows name + category dot + amount + delete button. Deleting a transaction immediately removes it from storage and updates all UI.
- **Total balance** — displayed prominently at the top as a styled card; auto-updates on every add/delete.
- **Pie chart** — Chart.js pie chart showing spending distribution by category; updates live as transactions change.

### Optional (all implemented)
- **Dark / light mode toggle** — toggled via a header button (🌙 / ☀️), persisted in `localStorage`.
- **Sort transactions** — by Date Added (default, newest first), Amount ascending/descending, or Category A-Z.
- **Spending limit** — user sets a Rupiah limit; a banner appears at ≥80% (yellow warning) and ≥100% (red over-limit); individual transactions that exceed the limit get a highlighted row.

## Data Model

Each transaction is a plain object stored in `localStorage` under the key `evb_transactions`:

```js
{
  id:        string,   // crypto.randomUUID() or fallback
  name:      string,   // item name (2–60 chars)
  amount:    number,   // positive integer (Rupiah)
  category:  'Food' | 'Transport' | 'Fun',
  createdAt: number,   // Date.now() timestamp
}
```

Additional `localStorage` keys:
- `evb_spending_limit` — number (Rupiah) or absent if no limit set
- `evb_theme` — `'light'` or `'dark'`

## Styling Conventions

- All design tokens (colors, radii, shadows, transitions) live as CSS custom properties on `:root` (light) and `[data-theme="dark"]`.
- Category colors are fixed: Food `#f97316`, Transport `#3b82f6`, Fun `#a855f7`.
- Currency is always formatted as Indonesian Rupiah: `Rp 25.000` (using `toLocaleString('id-ID')`).
- Responsive breakpoints: two-column grid above 800 px; single column at ≤800 px; extra-compact at ≤480 px.

## Code Conventions

- JavaScript uses `'use strict'` and ES2020 features (optional chaining, `crypto.randomUUID`, etc.).
- DOM references are declared once at the top of `app.js` as `const`.
- State is held in module-level variables: `transactions[]`, `spendingLimit`, `chart`.
- `refreshUI()` is the single top-level function that re-renders balance, list, chart, legend, and limit banner after any state change.
- HTML user content is always escaped via `escapeHtml()` before being injected with `innerHTML`.
- No inline styles are set from JS except for dynamic chart bar widths and category colors.

## Non-Functional Requirements

- No complex setup — double-click `index.html` to run.
- Fast and lag-free — all operations are synchronous in-memory; `localStorage` writes are the only I/O.
- Accessible — ARIA labels on interactive elements, `aria-live` regions for errors and the limit banner.
- Tested browsers: Chrome, Firefox, Edge, Safari (modern versions).
