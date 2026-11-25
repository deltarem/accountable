# Activities and timelines

Part of the [Accountable spec](../spec.md). Notes, calls and emails logged on a contact or a deal, follow-ups, the automatic stage and status entries, and how timelines put them together. The dashboard's follow-ups and recent activity are in `docs/specs/dashboard.md`.

## Data model

### activities `DM-04`

| Column | Type | Rules |
|---|---|---|
| type | text | `note`, `call` or `email` |
| contact_id | integer | set when the activity belongs to a contact |
| deal_id | integer | set when the activity belongs to a deal |
| description | text | required, 1 to 5.000 characters |
| occurred_at | datetime | required; the form defaults it to now |
| follow_up_date | date | optional |
| follow_up_done | boolean | defaults to false |
| created_by, updated_by | text | who logged it and who last changed it, set by the server (`DM-08`) |

Exactly one of `contact_id` and `deal_id` is set, which a check constraint enforces. Deleting the contact or deal deletes its activities.

### events `DM-05`

Entries the system writes by itself. They show in timelines and can't be edited or deleted by hand.

| Column | Type | Rules |
|---|---|---|
| kind | text | `stage_change` or `status_change` |
| deal_id | integer | set for a stage change |
| contact_id | integer | set for a status change |
| from_value, to_value | text | for example `proposal` and `negotiation` |
| occurred_at | datetime | when the change was made |
| created_by | text | who made the change, set by the server; empty for sample data (`DM-08`) |

Deleting the deal or contact deletes its events.

### What each timeline shows

`TL-04` Timelines are newest first, by `occurred_at`. Each entry shows its type, its text, its date and who made it (`UI-WHO-02`). An entry rolled up from another record also says which record it came from: "on deal Acme renewal", or "with Maria Lopez" for a contact's own entry on an organization's timeline.

- `TL-01` **Deal:** its activities and its stage changes.
- `TL-02` **Contact:**
  - their own activities and status changes
  - the activities and stage changes of every deal where they're the main contact now.

  This is worked out when the timeline is read, so changing a deal's main contact moves its history with it.
- `TL-03` **Organization:** everything on the timelines of its contacts and its deals, each entry shown once.

## API

| ID | Method and path | Purpose |
|---|---|---|
| `API-12` | `POST /api/activities` | log an activity on a contact or a deal |
| `API-13` | `PUT /api/activities/{id}`, `DELETE /api/activities/{id}` | edit or delete |
| `API-14` | `POST /api/activities/{id}/done` | body `{done}`: marks a follow-up done or not done |

## Screens

`UI-REC-05` **Log activity:** a form inside the timeline panel.
- Its fields:
  - type: Note, Call or Email, as three buttons
  - description
  - when it happened, which defaults to now on the server's clock
  - an optional follow-up date.
- "Log it" adds the entry at the top of the timeline without reloading the page, and clears the form for the next one.

`UI-REC-06` **Timeline entries:**
- Each entry has a round icon in its type's colour: note Midnight, call Cerulean, email Coral, stage change in the new stage's colour, status change Sea Green.
- Activities read "Call: agreed a two-year term", and have Edit and Delete in a small menu.
- Each entry's date line ends with who made it: "15 Nov 2026, 16:40 · Priya Shah", or "· Sample data" (`UI-WHO-02`).
- An activity with a follow-up shows its due date, "3 days overdue" if it has passed, and a "Done" checkbox.
- `UI-EMPTY-04` An empty timeline reads "Nothing here yet. Log a call, email or note to start the history."
