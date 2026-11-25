# Contacts

Part of the [Accountable spec](../spec.md). The people we deal with. A lead is a contact with the lead status.

## Decisions

9. `DEC-09` **Status changes in the timeline.** Every change of a contact's status makes an entry, whether it was made by hand or by a win, for example "Status changed from Lead to Qualified".

## Data model

### contacts `DM-02`

| Column | Type | Rules |
|---|---|---|
| name | text | required, 1 to 200 characters |
| email | text | optional, must look like an email address |
| phone | text | optional, free text |
| job_title | text | optional |
| organization_id | integer | optional; set to empty when the organization is deleted |
| status | text | `lead`, `qualified` or `customer`; new contacts default to `lead` |

## API

| ID | Method and path | Purpose |
|---|---|---|
| `API-05` | `GET /api/contacts` | all contacts with their organization's name |
| `API-06` | `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}` | as above; a contact's `GET` includes their organization, their deals and their timeline |
| `API-07` | `GET /api/contacts/{id}/delete-impact` | their name, how many activities would be deleted, and how many deals would lose their main contact |

## Screens

### Contacts table

- `UI-TBL-07` **Contacts:** Name, Organization, Job title, Email (a `mailto:` link), Phone, Status (badge). Above the table are filter buttons for All, Lead, Qualified and Customer, each with its count. The filter combines with the search.

### Contact page

- `UI-REC-03` **Contact:**
  - Facts: status badge, organization (as a link), job title, email (as a `mailto:` link) and phone.
  - Left: the deals where they're the main contact, with a "New" button that starts a deal with them and their organization filled in.
  - Right: the timeline, with "Log activity" at the top.
