# Pipeline

Part of the [Accountable spec](../spec.md). The deals as cards on a board, one column per stage. The stage rules are in `docs/specs/deals.md`.

## Decisions

14. `DEC-14` **Keyboard use on the pipeline.** Cards can be moved with the keyboard as well as the mouse:
    - Space picks a card up and drops it.
    - Left and right move it to the neighbouring column; up and down move it within its column.
    - Escape cancels the move.
    - Enter opens the deal.

## API

| ID | Method and path | Purpose |
|---|---|---|
| `API-11` | `POST /api/deals/{id}/move` | body `{stage, index}`: moves the card to that stage and place, renumbers both columns, and applies the stage rules. An index past the end puts the card last. |

## Screen

- `UI-PIPE-01` **Totals strip:** a Midnight panel across the top. It shows the total open value, the expected revenue (in Sea Green) and the number of open deals. Beside them is a stacked bar of open value by stage, in stage colours with 2px gaps and a legend; Negotiation uses Sea Mist there so it shows on Midnight. With no open deals, the bar reads "No open deals".
- `UI-PIPE-02` **The board:** six columns side by side, New to Lost, sharing the width equally, each at least 180px. Each column is its own white panel with 20px corners. All six fit at 1280px; the board scrolls sideways if the window is narrower, and each column scrolls on its own if it's taller than the window.
- `UI-PIPE-03` **Column header:** a solid block in the stage colour at the top of the column, with 14px corners. It shows:
  - the stage name and its usual probability
  - the number of cards, in a pill (beside the name, or beside the expected revenue in narrower columns)
  - the column's value
  - its expected revenue, or "Closed, won" or "Closed, lost" for the last two columns.

  The header colours are: New `#0D6E8F` with white text, Qualified Marigold, Proposal Coral, Won Sea Green and Lost grey `#8FA3AA`, all four with Midnight text, and Negotiation Midnight with white text.
- `UI-PIPE-04` **Card:** a pale grey card (`#F3F7F8`) with 14px corners, inside the white column. It shows:
  - the value first, in JetBrains Mono 16px
  - the deal name, in semibold
  - the organization, or "No organization"
  - at the bottom, the main contact's initials in a Midnight circle (an empty ringed circle when there's no main contact), and the close date in a white pill ("No date" when there's none).

  A late card's pill reads "Late · 20 Nov 2026" in dark Raspberry on a pale Raspberry tint. Clicking a card, or pressing Enter on it, opens the deal. The initials circle has the contact's full name as its tooltip and accessible name.
- `UI-PIPE-05` **Adding a deal:** "Add deal" sits under the header of each open column, as a pale grey button. It opens the deal form with that stage and its probability already chosen.
- `UI-PIPE-06` **Dragging:** cards are dragged with dnd-kit, using its sortable preset.
  - A card can be dropped anywhere in any column, including higher or lower in its own column.
  - The board updates at once: the card's place, its stage, its probability and every total. Then it calls `POST /api/deals/{id}/move`.
  - `UI-PIPE-07` If the call fails, the card goes back to where it was and a message explains why ("Couldn't move Data audit. ...").
  - The keyboard works too (`DEC-14`).

## Screen structure

### Pipeline (`/pipeline`)

```
ACCOUNTABLE
Pipeline                                                     [ + New deal ]

+--------------------------------------------------------------------------+
| MIDNIGHT TOTALS STRIP                                                    |
| Open pipeline    Expected revenue   Open deals   Open value by stage     |
| $1.130.000,00    $529.500,00        14           [==|=====|=====|=====]  |
+--------------------------------------------------------------------------+

+----------+ +----------+ +----------+ +----------+ +----------+ +----------+
|+--------+| |+--------+| |+--------+| |+--------+| |+--------+| |+--------+|
||New 10% 4|| ||Qual. 25%|| ||Prop. 50%|| ||Neg. 75% || ||Won 100% || ||Lost 0%  ||
||$120.000|| ||$310.000|| ||$340.000|| ||$360.000|| ||$668.000|| ||$150.000||
||exp ... || ||exp ... || ||exp ... || ||exp ... || ||Closed,  || ||Closed,  ||
|+--------+| |+--------+| |+--------+| |+--------+| ||won     || ||lost    ||
|[+Add    ]| |[+Add    ]| |[+Add    ]| |[+Add    ]| |+--------+| |+--------+|
|+--------+| |+--------+| |+--------+| |+--------+| |+--------+| |+--------+|
||$35.000 || ||$110.000|| ||$140.000|| ||$180.000|| ||$86.000 || ||$60.000 ||
||Fleet   || ||Group   || ||Shop-   || ||Compli- || ||Store   || ||Supply  ||
||tracking|| ||report. || ||floor   || ||ance    || ||analyt. || ||dashb.  ||
||Harbor  || ||Northg. || ||Kestrel || ||Northg. || ||Fernwood|| ||Solano  ||
||(SW) 15 || ||(PR) 29 || ||(MB) 18 || ||(PR) 11 || ||(EF) 18 || ||(TS) 9  ||
||  Feb 27|| ||  Jan 27|| ||  Dec 26|| ||  Dec 26|| ||  Nov 26|| ||  Sep 26||
|+--------+| |+--------+| |+--------+| |+--------+| |+--------+| |+--------+|
|   ...    | |   ...    | |   ...    | |   ...    | |  ...     | |   ...    |
+----------+ +----------+ +----------+ +----------+ +----------+ +----------+
  each column is a white panel; its header is a solid block of stage colour
```

- **Built from:** `PipelinePage`, `BoardTotals` (the Midnight strip with its stacked bar), `Board` (dnd-kit context, with its keyboard handling), `StageColumn` x6, `ColumnHeader`, `DealCard` with `ContactInitials` and `DatePill`, `DealCardOverlay` (the card while dragging).
- **Notes:**
  - The columns share the width equally, at least 180px each, and the board scrolls sideways only when they don't fit.
  - The board takes the full height of the window under the totals strip, and each column scrolls on its own.
  - `(SW)` is the main contact's initials in a Midnight circle. The date sits in a white pill, which turns pale Raspberry with "Late ·" for a late deal.
