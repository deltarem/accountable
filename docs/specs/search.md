# Search

Part of the [Accountable spec](../spec.md). The search box in the top bar, which finds any organization, contact or deal from every page. The search boxes above the tables are separate and unchanged (`UI-TBL-01`).

## Decisions

21. `DEC-21` **What search matches.**
    - It looks at names only: an organization's name, a contact's name and a deal's name.
    - A record matches when the search text appears anywhere in its name, ignoring case and the spaces at either end. "acme" and "ACM" both find "Acme Ltd"; "renew" finds "Acme renewal".
    - It folds case the same way on SQLite and Postgres, letters with accents included ("müller" finds "Müller"), because the matching runs in Python with `str.casefold()` rather than in SQL (`ARC-20`).
    - `%` and `_` are plain characters, never wildcards.
    - Within each group, names that start with the search text come first, then the rest, each A to Z.
    - Each group shows up to 5 results. There's no "show all": the tables are the place for longer lists.

## API

| ID | Method and path | Purpose |
|---|---|---|
| `API-21` | `GET /api/search?q=` | up to 5 organizations, 5 contacts and 5 deals whose name contains `q` (`DEC-21`), each with its id, name and one line of context. An empty or blank `q` returns three empty lists. |

The context line is:
- an organization's industry
- a contact's organization, or "No organization"
- a deal's organization and stage, such as "Acme Ltd · Negotiation".

## Screen

`UI-SRCH-01` **The search box** sits on the left of the top bar (`UI-LAY-05`), about 360px wide.
- It is a rounded input (12px corners) in the Panel colour with a Lucide search icon and the placeholder "Search organizations, contacts and deals".
- It has no outline at rest, and the Sea Green focus ring when focused.
- Its accessible name is "Search everything".

```
+----------------------------------------------+
| [Q acme                                  x ] |
+----------------------------------------------+
| ORGANIZATIONS                                |
| [b] Acme Ltd                    Software     |
|----------------------------------------------|
| CONTACTS                                     |
| [u] Maria Lopez                 Acme Ltd     |
|----------------------------------------------|
| DEALS                                        |
| [$] Acme renewal     Acme Ltd · Negotiation  |
| [$] Acme support          Acme Ltd · Won     |
+----------------------------------------------+
  dropdown: Raised colour, 20px corners, as wide as the box or 480px,
  whichever is wider; [b] [u] [$] are the rail's Lucide icons
```

`UI-SRCH-02` **The dropdown** opens under the box once something is typed.
- It asks `GET /api/search` about 150ms after typing stops, and shows the results grouped under "Organizations", "Contacts" and "Deals", in that order. A group with no results is left out.
- Each result shows the section's icon from the rail, the name with the matching part in semibold, and the context line in Muted ink on the right.
- While the first results load, it shows "Searching...". After that, older results stay until newer ones arrive, so the list doesn't flicker.
- `UI-EMPTY-06` With nothing found it reads "No matches for "xyz"".
- If the search fails, it reads "Couldn't search. Try again." inside the dropdown, with no message at the bottom right.
- The dropdown sits above everything on the page, dialogs excepted.

`UI-SRCH-03` **Opening a result.**
- The down and up arrows move through the results across the groups, and the highlighted one is read out by screen readers (the combobox pattern, with cmdk).
- Enter, or a click, opens the record's page, closes the dropdown and clears the box.
- Escape closes the dropdown; a second Escape clears the box. Clicking elsewhere or tabbing away closes it and keeps the text.
- Focusing the box again with text in it opens the dropdown again.
