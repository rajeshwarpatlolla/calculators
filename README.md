# Finance Calculators

A single-page web app for common Indian personal-finance calculations: **SIP**, **lumpsum**, **SWP**, and **simple/compound interest**. Built as one static HTML file with no build step.

## Features

### Calculators

- **SIP** — monthly investment, expected return, tenure (up to 100 years), compounding frequency
- **Lumpsum** — one-time investment with the same inputs (tenure up to 100 years)
- **SWP** — initial corpus (up to ₹5 Cr), monthly withdrawal, annual withdrawal step-up, duration (up to 100 years), compounding frequency
- **Interest** — simple or compound interest; principal, rate (up to 36% p.a.), tenure (up to 100 years)

### Charts

Each calculator includes a **Breakdown** (donut) chart by default and an optional **Timeline** (line) chart:

| Calculator    | Breakdown                          | Timeline lines                                |
| ------------- | ---------------------------------- | --------------------------------------------- |
| SIP / Lumpsum | Invested amount · Wealth gained    | Invested amount · Total value · Wealth gained |
| SWP           | Total withdrawn · Remaining corpus | Remaining corpus · Total withdrawn            |
| Interest      | Principal · Interest earned        | Principal · Total amount · Interest earned    |

Timeline charts use yearly data points (`Year`, `1`, `2`, … on the x-axis). Y-axis labels use compact Indian units (`₹2.5Cr`, `₹12L`, `₹50K`) while tooltips show full Indian-formatted amounts.

### Shared behaviour

- Sliders and number inputs kept in sync (minimum **0** on all fields; defaults unchanged)
- **Indian numbering** for currency (e.g. `₹10,00,000`)
- **Light / dark mode** (midnight teal theme) with system preference on first visit; choice saved in `localStorage`
- **Tab persistence** via `localStorage` and URL hash (e.g. `#swp`, `#interest`)
- Keyboard navigation for tabs (arrow keys, Home, End)
- Debounced recalculation while dragging sliders
- Lazy chart init per tab; responsive layout for mobile and desktop

## Default values

| Field            | SIP        | Lumpsum   | SWP                                      | Interest        |
| ---------------- | ---------- | --------- | ---------------------------------------- | --------------- |
| Amount / corpus  | ₹10,000/mo | ₹1,00,000 | ₹10,00,000                               | ₹1,00,000       |
| Return / rate    | 12%        | 12%       | 10%                                      | 8%              |
| Years / duration | 10         | 10        | 10                                       | 5               |
| Other            | —          | —         | ₹10,000/mo withdrawal, 5% annual step-up | Simple interest |

## Quick start

No install required. Open the file in a browser:

```bash
open index.html
```

Or serve locally (recommended so hash routing and assets behave consistently):

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## Tech stack

| Layer          | Choice                                        |
| -------------- | --------------------------------------------- |
| Markup / logic | `index.html` (vanilla JavaScript)             |
| Styling        | [Tailwind CSS](https://tailwindcss.com) (CDN) |
| Charts         | [Chart.js](https://www.chartjs.org) 4.x (CDN) |
| Fonts          | Inter, JetBrains Mono (Google Fonts)          |

## Project structure

```
calculators/
├── index.html   # entire app (UI + calculations + charts)
└── README.md
```

## Disclaimer

All figures are **illustrative estimates only**, not financial advice. Actual mutual fund / deposit returns depend on market performance, fees, taxes, and product terms. Consult a qualified advisor before investing.

## License

Use and modify freely for personal or educational purposes unless otherwise specified by the repository owner.
