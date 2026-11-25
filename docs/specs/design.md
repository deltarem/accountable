# Design

Part of the [Accountable spec](../spec.md). Colours, contrast, type, shape, dark mode colours, formats and tone. The look as a whole is under "The look: Command deck" in `docs/specs/screens.md`.

## Decisions

2. `DEC-02` **Fonts with no internet.** The brand's fonts are bundled with the app through the `@fontsource` npm packages, so nothing is fetched from Google at runtime.
4. `DEC-04` **The money format.** Money shows as `$12.500,00`: a US dollar sign on European separators. That's unusual for US dollars, but it's used everywhere, forms included.
   - Forms accept `12500`, `12.500`, `12.500,50` and `$12.500,00`, and turn down `12.5` with "Use a comma for cents, like 12.500,50".
   - Headline figures on the dashboard drop the cents (`$412.500`).
   - Chart axes shorten amounts (`$400k`), and their tooltips show the full figure.
5. `DEC-05` **Six stages, five brand colours.** The brand gives five colours for things side by side, in a fixed order. The stages get colours by meaning instead:
   - New Cerulean, Qualified Marigold, Proposal Coral, Negotiation Midnight, Won Sea Green, and Lost a grey taken from Sea Mist.
   - Raspberry is kept for things that need attention, such as late deals and overdue follow-ups.
   - Because Marigold and Coral sit close together, and Midnight is nearly grey, every coloured mark in a chart has its stage name beside it, and segments have 2px gaps.
6. `DEC-06` **Contrast.** The brand's bright colours fail contrast at small sizes:
   - White text on Cerulean (3.96:1) and on Raspberry (3.62:1) falls below the 4.5:1 that small text needs.
   - Sea Green, Marigold and Coral text on white is far too faint (1.6 to 2.4:1), as the brand itself warns.

   So badges and small labels use a pale tint of the colour with darker text in the same hue (all 4.8:1 or better, listed under Design). Solid fills carry Midnight text, or white text only at 16px semibold or larger.

   The solid stage blocks also hold small text, so they use these pairs, all checked:
   - white on the darker Cerulean `#0D6E8F` (5.8:1)
   - Midnight on Marigold (7.5:1), Coral (5.1:1), Sea Green (6.4:1) and the Lost grey (4.6:1)
   - white on Midnight.

   On Midnight panels:
   - labels use `#9FB4BA` (5.6:1)
   - Sea Green figures are 6.4:1
   - a Raspberry figure (3.3:1) is used only at 28px or larger.

   Dark mode follows the same rules. Its pairs are listed under Design (`DES-01`, `DES-02` and "Dark mode").
15. **Dark surfaces.** The brand gives dark mode a `#04232E` page with black panels and cards. It leaves three things open:
    - **Cards inside panels.** Pipeline cards, follow-up rows and "Add deal" buttons sit inside black panels, where black would hide them. They use `#0F2027`, one step lighter, the way the light mode's pale grey sits on white.
    - **The Midnight panels.** The rail, the dashboard's headline panel and the pipeline's totals strip stay Midnight in both modes. They still stand out on the dark page, and their figures and labels keep the contrast listed under `DEC-06`.
    - **Midnight everywhere else.** Midnight fills elsewhere would almost vanish on black. In dark mode they become Sea Mist `#CDD8DB` with Midnight text (8.3:1). That covers main action buttons, the initials circle, the note icon, the Negotiation stage, the chosen status filter and activity type, tooltips and confirmation messages. Negotiation already uses Sea Mist on the totals strip, so it looks the same everywhere in dark mode.

### Colours `DES-01`

Colours are CSS variables in `tokens.css`, named by their role. Light mode defines them on `:root`, and dark mode redefines the same names (`ARC-15`).

| Role | Light | Dark | Use |
|---|---|---|---|
| Page | `#F0F4F5` | `#04232E` | page background |
| Panel | `#FFFFFF` | `#000000` | panels, date pills |
| Raised | `#FFFFFF` | `#0F2027` (ink 11.5:1) | dialogs, menus and pop-up lists. The chosen item in a menu uses the Card colour, or `#1C3038` in dark mode. |
| Ink | `#073B4C` Midnight (12.1:1 on white) | Sea Mist `#CDD8DB` (14.4:1 on black, 11.2:1 on the page, 11.5:1 on cards) | headings and body text |
| Muted ink | `#4D6973` (5.3:1 on the page, 5.9:1 on white) | `#9FB4BA` (9.7:1 on black, 7.6:1 on the page, 7.7:1 on cards) | labels, secondary text |
| Rail and headline panels | `#073B4C` Midnight, with Sea Mist `#CDD8DB` icons, white figures and `#9FB4BA` labels | the same (see the decision "Dark surfaces") | the icon rail, the dashboard headline panel, the pipeline totals strip |
| Card | `#F3F7F8` | `#0F2027` | pipeline cards, follow-up rows, "Add deal" buttons |
| Line | `#E8EEF0` | `#1C3038` | table row dividers and input fills (never an outline around a panel) |
| Midnight fill | `#073B4C` with white text | Sea Mist `#CDD8DB` with Midnight text (8.3:1) (see the decision "Dark surfaces") | main action buttons, the initials circle, the chosen filter or activity type, tooltips, confirmation messages |
| Primary | Sea Green `#06D6A0`, Midnight text | the same | "Save" and "Log it" buttons, focus rings |
| Secondary | Marigold `#FFC145`, Midnight text | the same | Qualified, highlights |
| Tertiary | Coral `#F78C6B`, Midnight text | the same | Proposal, email activity |
| Information | Cerulean `#118AB2` | the same; links use `#5CBFE0` | New, call activity, links |
| Alert | Raspberry `#EF476F` | the same | late, overdue, delete, errors |

`DES-02` Small text and badges use these shades, each checked for contrast. Light mode darkens the brand colours, and dark mode lightens them, as the brand asks.

| Colour | Light: text on white | Light: badge (text on tint) | Dark: text on black | Dark: badge (text on tint) |
|---|---|---|---|---|
| Sea Green | `#067A5C` (5.3:1) | `#067A5C` on `#E6FBF5` (4.9:1) | `#3DE0B4` (12.5:1) | `#3DE0B4` on `#01271D` (9.6:1) |
| Marigold | `#8A5A00` (5.9:1) | `#8A5A00` on `#FFF6E3` (5.5:1) | `#FFCF6B` (14.4:1) | `#FFCF6B` on `#2E230C` (10.6:1) |
| Coral | `#B4472A` (5.4:1) | `#B4472A` on `#FEEEE9` (4.8:1) | `#FFA488` (10.9:1) | `#FFA488` on `#2C1913` (8.7:1) |
| Cerulean | `#0D6E8F` (5.8:1) | `#0D6E8F` on `#E7F3F7` (5.1:1) | `#5CBFE0` (10.0:1) | `#5CBFE0` on `#031920` (8.6:1) |
| Raspberry | `#C2264F` (5.7:1) | `#C2264F` on `#FDECF0` (5.0:1) | `#FF7F9C` (8.8:1) | `#FF7F9C` on `#2B0D14` (7.5:1) |
| Midnight | `#073B4C` | `#073B4C` on `#E8EEF0` (10.3:1) | Sea Mist `#CDD8DB` (14.4:1) | `#CDD8DB` on `#1C3038` (9.4:1) |

Every dark text shade also passes on the dark cards (7.0:1 or better) and on the dark page (6.8:1 or better).

**Stage colours** (`DEC-05`): New Cerulean, Qualified Marigold, Proposal Coral, Negotiation Midnight, Won Sea Green and Lost grey `#8FA3AA`. Stage badges use the tinted versions above; Lost uses `#4D6973` on `#E8EEF0`, and in dark mode `#9FB4BA` on `#1C3038` (6.4:1). In dark mode Negotiation is Sea Mist with Midnight text wherever it is a solid colour (see the decision "Dark surfaces").

**Contact status colours:** Lead Cerulean, Qualified Marigold, Customer Sea Green.

**Gradients:** none.

### Type `DES-03`

Fonts are bundled with `@fontsource` (`DEC-02`).

- **Instrument Sans** for all interface text:
  - page titles 28px semibold
  - panel titles 16px semibold
  - body and table text 14px regular
  - labels 12px medium, in Muted ink.
- **JetBrains Mono** for figures: money, percentages, counts in tiles and tables, and dates in tables. It uses tabular numbers, so columns line up. Tile figures are 28px medium.
- **Instrument Serif** sparingly, as an accent: today's date on the right of the dashboard's title row ("Monday, 23 Nov 2026"), and the empty-state lines.

### Shape and spacing `DES-04`

- **Panels:** 20px rounded corners, 24px padding, no outline. A faint shadow (`0 1px 2px rgba(7, 59, 76, 0.06)`) lifts them off the page.
- **No edge lines:** panels and the page never get a line on one edge only, and there's no line across the top of the page.
- **Smaller parts:** stage headers, cards and list rows have 14px rounded corners, buttons and inputs 12px, rail buttons 12px, and badges and date pills are pills.
- **Spacing:** an 8px grid, with 24px between panels.
- **Dragging:** a card being dragged turns white and lifts with a stronger shadow and a 2-degree tilt. Where it would land, a gap the size of the card shows a pale tint of that column's stage colour with a 2px ring in the stage colour.
- **Focus:** every control shows a 2px Sea Green focus ring with a 2px gap when reached by keyboard.

### Dark mode

Dark mode keeps every layout, size, shape and font. Only colours change, taken from the tables above. What that means for the parts that aren't plain text on a panel:

- **Solid stage blocks** (column headers, pipeline-by-stage rows, funnel columns) keep their light-mode colours and text, except Negotiation, which is Sea Mist with Midnight text.
- **Charts:** grid lines use the Line colour and axis labels use Muted ink. The series keep their brand colours: the won line and bars in Sea Green, lost bars in the Lost grey. The headline panel's chart is unchanged, since that panel stays Midnight.
- **Tooltips**, on charts and on the rail, are Sea Mist with Midnight text.
- **Dialogs, menus and pop-up lists** use the Raised colour, `#0F2027`, a step lighter than the black panels. Shadows don't show on black, so a black dialog would have no visible edge. The page behind a dialog dims with black at 60% (light mode dims it with Midnight at 45%).
- **Messages:** a confirmation is Sea Mist with Midnight text and a dark Sea Green `#067A5C` icon (3.7:1, above the 3:1 an icon needs). An error is `#2B0D14` with Sea Mist text (12.3:1) and a `#FF7F9C` icon, so the two still look different at a glance.
- **Follow-ups:** overdue rows sit on `#2B0D14` with the date in `#FF7F9C` (7.5:1). Other rows use the Card colour.
- **Timeline icons:** call Cerulean with white, email Coral and status change Sea Green with Midnight, as in light mode. A note is Sea Mist with a Midnight icon.
- **Pipeline cards:** the date pill is black, and a late deal's pill is `#2B0D14` with `#FF7F9C` text. A dragged card turns `#1C3038`, one step lighter than the others, and keeps its tilt.
- **Delete buttons** stay dark Raspberry `#C2264F` with white text (5.7:1), and focus rings stay Sea Green, with their 2px gap in the panel colour.
- **Shadows** are drawn in black. Panels stand off the page by colour rather than by shadow.
- **Placeholders while loading** keep their translucent Sea Mist, which shows on both backgrounds.

### Formats `DES-05`

All formatting lives in one frontend module, `frontend/src/lib/format.ts`, which has its own unit tests.

- **Dates:** `23 Nov 2026`. Times show as `23 Nov 2026, 14:05`, on a 24-hour clock.
- **Money:**
  - in tables, forms and cards, `$12.500,00`, always with the dollar sign
  - in headline tiles, `$412.500`
  - on chart axes and labels, `$400k` and `$1,2M`.
- **Probability:** `75%`.
- **Relative dates on follow-ups:** "Today", "Tomorrow", "In 3 days", "1 day overdue" and "3 days overdue", with the full date in a tooltip.

### Tone `DES-06`

Plain business English, as the brand asks. Labels are short ("New deal", "Log activity", "Mark done"), with no jargon and no exclamation marks. Money is always shown with its currency.
