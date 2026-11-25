# Deals

Part of the [Accountable spec](../spec.md). Deals, their stages and the rules for moving between them. The board is in `docs/specs/pipeline.md`.

## Decisions

1. `DEC-01` **Deals that lose their organization.** A deal needs an organization, but deleting an organization keeps its deals with no organization. Both rules stand:
   - The database allows a deal with no organization.
   - The table and the deal's page show "No organization".
   - The deal form won't save until one is chosen.

   So a deal can sit without an organization until it's next edited.
7. `DEC-07` **Close dates.**
   - The close date is optional while a deal is open, and a deal with no close date is never late.
   - Moving a deal to Won or Lost, by dragging or in the form, sets its close date to today. The form shows that date and it can be changed before saving, so a deal won last week can be recorded properly.
   - Moving a deal back out of Won or Lost keeps the date. If that date has passed, the deal is late at once, which prompts a new expected date.
8. `DEC-08` **Undoing a win.**
   - If a won deal is moved back to an open stage, its main contact stays a customer.
   - Winning a deal with no main contact changes no contact.
   - Winning one whose contact is already a customer adds no entry to their timeline.

## Data model

### deals `DM-03`

| Column | Type | Rules |
|---|---|---|
| name | text | required, 1 to 200 characters |
| organization_id | integer | required by the form and the API on create and edit; set to empty when the organization is deleted (`DEC-01`) |
| contact_id | integer | the main contact, optional; set to empty when the contact is deleted |
| stage | text | `new`, `qualified`, `proposal`, `negotiation`, `won` or `lost` |
| value_cents | integer | 0 or more; defaults to 0 |
| probability | integer | 0 to 100 |
| close_date | date | optional while open; set to today when the deal is won or lost (`DEC-07`) |
| position | integer | the card's place in its pipeline column, 0 at the top |
| created_by, updated_by | text | who added the deal and who last changed it, set by the server; a move on the board counts as a change (`DM-08`) |

### Stage rules

| Stage | Usual probability | Open or closed |
|---|---|---|
| New | 10% | open |
| Qualified | 25% | open |
| Proposal | 50% | open |
| Negotiation | 75% | open |
| Won | 100% | closed |
| Lost | 0% | closed |

- `RULE-01` A new deal takes its stage's usual probability, unless the form sets another. It goes to the top of its column.
- `RULE-02` `RULE-03` When the stage changes, the probability becomes the new stage's usual figure.
  - In the form, picking a new stage fills in that figure, and the user can change it before saving.
  - A probability set by hand is kept until the stage changes again.
- `RULE-04` Every change of stage writes a `stage_change` event, whether it comes from the board or the form. The event records who made the change.
- `RULE-05` Moving to Won makes the main contact a customer (`DEC-08`) and writes a `status_change` event for them. A deal created at Won does the same. The person who won the deal is recorded on the event and as the contact's last change.
- `RULE-06` A deal is **late** when it's open and its close date is before today.
- `RULE-07` **Expected revenue** for a deal is value times probability. The open pipeline's figures add up open deals only.

## API

| ID | Method and path | Purpose |
|---|---|---|
| `API-08` | `GET /api/deals` | all deals with organization and contact names, a `late` flag and expected revenue |
| `API-09` | `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}` | as above; a deal's `GET` includes its timeline |
| `API-10` | `GET /api/deals/{id}/delete-impact` | its name, and how many activities and stage-history entries would be deleted |

## Screens

### Deals table

- `UI-TBL-08` **Deals:** Name, Organization, Main contact, Stage (badge), Value, Probability, Close date. A late deal shows its close date in Raspberry with a small "Late" badge. A deal with no organization shows "No organization" in muted text.

### Deal page

- `UI-REC-04` **Deal:**
  - Facts: stage badge, value, probability, expected revenue, close date (with "Late" if it applies).
  - Left: details, including organization and main contact (as links).
  - The header's last line says who added the deal and when, and who last changed it (`UI-WHO-01`).
  - Right: the timeline, with "Log activity" at the top.

### Deal form

- `UI-FORM-04` **Deal form:**
  - Changing the stage fills in its usual probability.
  - Choosing Won or Lost fills in today as the close date.
  - Both can be changed before saving.
  - The value is typed in the money format and tidied to `12.500,00` when the field is left.
