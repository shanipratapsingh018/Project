# Rate card

- `proposed_rate_card.csv` — the rate card **approved on 27 Oct 2026** and now live on the website
  (`public/assets/js/rate-card.js`). Edit this file and run `npm run import-rates -- docs/rate-card/proposed_rate_card.csv`
  to change prices. `npm test` checks every figure on the site against it.
- `CarMechanic_Indore_Price_Research_2026-10-23.xlsx` — the research workbook: competitor prices with sources,
  comparison, conflicts, missing prices and the formula-driven rate card. Its "OWNER REVIEW REQUIRED" labels date
  from before approval.
- `competitor_prices.csv` — 126 competitor prices with source URLs (checked 23 Oct 2026).
- `calculator_rates_PROPOSED.json` — the JSON prepared for review; superseded by `rate-card.js`.
