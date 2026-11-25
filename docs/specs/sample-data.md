# Sample data

Part of the [Accountable spec](../spec.md). The data Accountable starts with.

## Decisions

13. `DEC-13` **Sample data dates.** Sample dates are relative to the day the data is created, so the dashboard's last 12 months are always filled on a fresh start or after `npm run seed`. Data seeded months ago looks older, which is expected; reseeding fixes it.

## The data

`SEED-07` Sample records, activities and events have no author: their `created_by` and `updated_by` are empty, and the screens show "Sample data" as who added them (`DM-08`). Seeding never adds people to `users`, and keeps the people already there.

The same sample data fills the local SQLite file and, on its first start or with `npm run seed -- --yes`, the team's database on Supabase (`RUN-03`, `RUN-05`).

Created by `backend/seed.py`. It uses a fixed random seed, so every reset gives the same data relative to today. On 23 Nov 2026 it gives these figures:
- $1.130.000 open in 14 deals, with $529.500 expected
- $668.000 won over 12 months
- a funnel of 100, 94, 76, 56 and 34%
- 4 overdue follow-ups.

- `SEED-01` **10 organizations** across seven industries: software, manufacturing, retail, healthcare, logistics, finance and hospitality. Each has a made-up name, a website on `.example` and a line of notes.
- `SEED-01` **25 contacts:**
  - 9 leads, 7 qualified and 9 customers
  - all but 3 at an organization
  - `SEED-03` every customer is the main contact of at least one won deal, and every main contact of a won deal is a customer.
- `SEED-01` **30 deals:**
  - 4 at New, 4 at Qualified, 3 at Proposal and 3 at Negotiation
  - `SEED-02` 13 won and 3 lost, with close dates spread so that each of the last 12 months has at least one won deal
  - `SEED-02` 3 of the open deals are late, and the rest have close dates over the next 4 months
  - values range from $2.500,00 to $180.000,00
  - `SEED-06` two open deals have a probability set by hand
  - `SEED-04` every deal past New has the stage-change events of the path it took
  - `SEED-04` pipeline order is set within each column.
- `SEED-05` **About 65 activities** on contacts and deals, spread over the last 12 months, in working hours and never later than now.
  - 4 have overdue follow-ups, 2 are due today, 4 are due in the next week and 3 are due later.
  - Several follow-ups are done.
