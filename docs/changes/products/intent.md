# Intent: products

## Problem

Accountable knows our deals but not what we sell. Prices live in people's heads and old emails, so the same thing gets quoted at different prices.

## Proposed outcome

A Products section lists what the business sells. Each product has a name, a description, a unit price and whether it's active. Anyone on the team can add, edit, search for and archive products. This is the price list that quotes and invoices will use later.

## Constraints

- Prices are in US dollars and cents, such as $49.50, and are stored as whole cents, never as decimals.
- A product's name is required and unique, ignoring case.
- Products are archived rather than deleted. Archived products are hidden unless you choose to see them, and archiving can be undone. Active and archived are one flag: an active product is one that isn't archived.
- An archived product keeps its name, so a new product can't reuse it.
- Each product records who added it and who last changed it, like every other record.
- Each product has a small page of its own, at `/products/:id`, with its details, its price, who added it and who last changed it, and Edit and Archive (or Restore). It has no timeline, because products have no activities. Clicking a row in the Products table, or a product in the top bar's search, opens it.
- The sample data includes about a dozen products with realistic prices that fit the sample deals, such as licenses, support plans and training days, with one or two archived, so the section looks full from the first visit.
- The search box in the top bar finds products too, active ones only. Archived products are found from the Products table with archived shown.
- Every unit test, old and new, runs in under a second on this computer, because CI runs on a much slower machine. `npm test` enforces it: each pytest and Vitest unit test has a one-second limit, and any test over it fails the run. Existing tests over the limit are fixed in this change.
- No new dependencies unless the plan makes the case for one.

## Not in this change

- Using products on deals, quotes or invoices.
- Stock levels, categories, units of measure or variants.
- Price lists per customer, or discounts.

## Success criteria

1. npm run check passes.
2. A product can be added, edited, found with the search box, archived and restored.
3. Prices show in dollars and cents everywhere they appear.
4. Two products can't share a name, whatever the case, through the page or the API.
5. The sample data has products, and npm run empty clears them.
6. A unit test that takes more than a second fails npm test.
