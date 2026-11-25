# Dashboard

Part of the [Accountable spec](../spec.md). The landing page: how sales are going at a glance.

## Decisions

10. `DEC-10` **What the funnel counts.** "How much value reaches each stage" is worked out from stage history. It covers open deals and deals closed in the last 12 months:
    - A deal counts towards its current stage and every open stage before it.
    - A won deal counts towards every stage.
    - A lost deal counts towards every stage up to the last one it was in before it was lost. A lost deal with no stage history counts towards New only.
11. `DEC-11` **Which follow-ups the dashboard shows.** "Coming up" means due in the next 7 days.
    - The dashboard lists every overdue follow-up, then those due today, then those due in the next 7 days.
    - Later ones show on their contact or deal page only.

## API

| ID | Method and path | Purpose |
|---|---|---|
| `API-15` | `GET /api/dashboard` | every figure the dashboard shows, worked out on the server |

## Screen

From top to bottom:

1. `UI-DASH-01` **Headline panel** (full width): a Midnight panel with 20px corners, in two parts.
   - **Left, about 360px:** four figures in a 2 x 2 grid. Each has a label in light Sea Mist (`#9FB4BA`), a large figure in white JetBrains Mono, and a short line of context.
     - **Open pipeline:** the value of all open deals, and how many there are.
     - **Expected revenue:** the open deals' value times their probability.
     - **Won this month:** the value of deals won this month, with the figure in Sea Green. Below it, the change from last month in a pill with an up or down arrow: Sea Green on a translucent Sea Green fill for a rise, and Raspberry for a fall. With nothing won last month, it says so instead.
     - **Follow-ups due:** how many are overdue, in Raspberry when more than zero, and how many are due today.
   - `UI-DASH-02` **Right, the rest:** **Revenue won** (line chart), the value of won deals for each of the last 12 months by close date.
     - The line is Sea Green, with a dot for each month, on grid lines in a lighter Midnight (`#1C5568`), with four round axis steps from $0.
     - The current month's dot is larger and filled, and labelled with its short amount (`$86k`).
     - Hovering a month shows a white tooltip with its full total and how many deals were won.
2. **Three panels in a row:**
   - `UI-DASH-03` **Sales funnel:** one column per stage from New to Won, in stage colours, side by side and getting shorter. Above each column is the share of New's value it keeps (`94%`), and below it the stage name and the value that reached it (`DEC-10`).
   - `UI-DASH-04` **Pipeline by stage:** one solid row per open stage, in the stage's colour (New uses the darker Cerulean, `#0D6E8F`, so its white text passes contrast). Each row shows the stage name and probability, its value, its deal count and its expected revenue. Clicking a row opens the pipeline.
   - `UI-DASH-05` **Won and lost** (bar chart): one bar per month above a centre line for deals won (Sea Green), and one below it for deals lost (Lost grey), with "13 won" and "3 lost" labels, a legend, and a tooltip per month.
3. **Two panels in a row:**
   - `UI-DASH-06` **Follow-ups** (wider), grouped under "Overdue", "Today" and "Next 7 days" (`DEC-11`).
     - Each follow-up is a rounded row with:
       - a checkbox to mark it done
       - the activity's description
       - the record it belongs to, as a link ("Pinecrest Hotels · Booking engine", or a contact's name)
       - its due date, relative ("3 days overdue", "Today", "In 3 days"), with the full date in a tooltip.
     - Overdue rows sit on a pale Raspberry tint with the date in dark Raspberry. The other rows sit on a pale grey (`#F3F7F8`).
     - Ticking the box removes the row and updates the figure in the headline panel.
   - `UI-DASH-07` **Recent activity:** the 10 newest entries across all timelines with `occurred_at` up to now: activities, stage changes and status changes.
     - Each has a rounded-square icon in its type's colour, a line of text, and the record (as a link) with its date and time and who made it ("Compliance suite · 23 Nov 2026, 09:30 · Priya Shah", `UI-WHO-02`).

`UI-DASH-08` Charts use Recharts.
- Axes and grid lines are quiet: Sea Mist grid lines and muted labels on white, and lighter Midnight grid lines and pale labels on the headline panel.
- Every chart has a tooltip with full figures in the money format.
- All figures come from `GET /api/dashboard`, which is fetched again whenever the dashboard is opened.

Below 1280px wide, the headline panel stacks its figures above the chart, and the three-panel and two-panel rows become two columns, then one.

## Screen structure

### Dashboard (`/`)

```
[Q Search organizations, contacts and deals ]                         (PS)

ACCOUNTABLE
Dashboard                                         Monday, 23 Nov 2026 (serif)

+--------------------------------------------------------------------------+
| MIDNIGHT HEADLINE PANEL                                                  |
|                                    Revenue won        Last 12 months     |
| Open pipeline     Expected revenue                                       |
| $1.130.000        $529.500          $120k                o               |
| 14 open deals     Value times prob.        +-----------+/ \        $86k  |
|                                     $80k  |Apr 2026   |   \   o--- (o)  |
| Won this month    Follow-ups due          |$71.000,00 |    \ /           |
| $86.000 (green)   4 overdue (rasp.)  $40k +---o-------+     o            |
| (^ 37%) on October 2 due today          o--o   \  o                      |
|                                     $0                                   |
|                                       Dec Jan ...              Oct Nov   |
+--------------------------------------------------------------------------+
   about 360px                         the rest: line chart, dots

+-------------------------+ +-----------------------+ +--------------------+
| Sales funnel            | | Pipeline by stage     | | Won and lost       |
|                         | |                       | |          [] Won    |
| 100%  94%               | | [New 10%    $120.000] | | 13 won   [] Lost   |
| ####  ####  76%         | | [4 deals  exp $12.000]| |  # # # ## # # # #  |
| ####  ####  ####  56%   | | [Qualified  $310.000] | | ------------------ |
| ####  ####  ####  ####  | | [Proposal   $340.000] | |    #     #     #   |
| ####  ####  ####  ####  | | [Negotiation $360.000]| | 3 lost             |
| New   Qual. Prop. Neg.  | |  (solid stage colour  | |  Jan  Mar ...  Nov |
| $1.948.000 ...          | |   rows)               | |                    |
+-------------------------+ +-----------------------+ +--------------------+

+--------------------------------------+ +---------------------------------+
| Follow-ups                 10 to do  | | Recent activity                 |
|                                      | |                                 |
| OVERDUE                              | | [>] Moved from Proposal to      |
| +----------------------------------+ | |     Negotiation                 |
| |[ ] Call back about contract terms| | |     Telehealth add-on ·         |
| |    Booking engine  5 days overdue| | |     23 Nov 2026, 10:12 ·        |
| +----------------------------------+ | |     Sam Lee                     |
| TODAY                                | | [c] Call: agreed a two-year     |
| +----------------------------------+ | |     term                        |
| |[ ] Call about onboarding   Today | | |     Compliance suite ·          |
| +----------------------------------+ | |     23 Nov 2026, 09:30 ·        |
| NEXT 7 DAYS                          | |     Priya Shah                  |
|                                      | | ...                 (10 rows)   |
+--------------------------------------+ +---------------------------------+
```

- **Built from:** `DashboardPage`, `HeadlinePanel`, `HeadlineFigure` x4, `RevenueChart`, `FunnelChart`, `PipelineByStage`, `WonLostChart`, `FollowUpList` (with its groups), `ActivityFeed`, `EmptyState`, `Skeleton`.
- **Notes:**
  - Overdue follow-up rows sit on a pale Raspberry tint, and the other rows on pale grey.
  - Each panel shows its own loading placeholder and its own empty state.
