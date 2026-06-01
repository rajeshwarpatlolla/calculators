# Finance Calculators

A single-page web app for common Indian personal-finance calculations: **SIP**, **lumpsum**, **SWP**, and **simple/compound interest**. Built as one static HTML file with no build step.

## Features

- **SIP** — monthly investment, expected return, tenure, compounding frequency (monthly / quarterly / annual)
- **Lumpsum** — one-time investment with the same inputs
- **SWP** — initial corpus, monthly withdrawal, annual withdrawal step-up, duration, compounding frequency
- **Interest** — simple or compound interest with optional compounding frequency

Shared behaviour across calculators:

- Sliders and number inputs kept in sync
- **Indian numbering** for currency (e.g. `₹10,00,000`)
- Donut charts for invested vs returns breakdown (Chart.js)
- **Light / dark mode** with system preference on first visit; choice saved in `localStorage`
- **Tab persistence** via `localStorage` and URL hash (e.g. `#swp`)
- Keyboard navigation for tabs (arrow keys, Home, End)
- Responsive layout for mobile and desktop

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
