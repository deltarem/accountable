# Organizations

Part of the [Accountable spec](../spec.md). The companies we do business with.

## Data model

### organizations `DM-01`

| Column | Type | Rules |
|---|---|---|
| name | text | required, 1 to 200 characters after trimming |
| website | text | optional; `https://` is added if no scheme is given |
| industry | text | optional, free text; the form suggests industries already in use |
| notes | text | optional, up to 5.000 characters |

## API

| ID | Method and path | Purpose |
|---|---|---|
| `API-01` | `GET /api/organizations` | all organizations, each with its contact count, open deal count and open value |
| `API-02` | `POST /api/organizations` | create |
| `API-03` | `GET /api/organizations/{id}` | one organization with its contacts, its deals and its timeline |
| `API-02` | `PUT /api/organizations/{id}` | edit |
| `API-02` | `DELETE /api/organizations/{id}` | delete; contacts and deals are kept, with no organization |
| `API-04` | `GET /api/organizations/{id}/delete-impact` | its name, and how many contacts and deals would lose their organization |
| `API-16` | `GET /api/industries` | industries in use, each once, sorted, with no blanks |

## Screens

### Organizations table

`UI-TBL-06` Columns:

- **Organizations:** Name, Industry, Website (a link that opens in a new tab), Contacts, Open deals, Open value.

### Organization page

- `UI-REC-02` **Organization:**
  - Facts: industry, website, open value and notes.
  - Left: its contacts (name, job title, status) and its deals (name, stage, value), each as a link, each with a "New" button that starts the form with this organization filled in.
  - Right: the organization's timeline.

### Organization form

- `UI-FORM-06` `UI-FORM-07` **Organization form:** the industry field suggests industries already in use as you type (from `GET /api/industries`), and the form adds `https://` to a website with no scheme before saving.
