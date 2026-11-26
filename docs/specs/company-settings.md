# Spec: Company settings

Part of the [spec](../spec.md), which has the summary, the terms, the quality rules and the index of every area file.

## Company settings

The company settings are the business's own details, kept for the quotes and invoices that come later. Nothing uses them yet apart from their own page.

- **B1.** There's one set of company settings for the whole team, kept in the database, never in `.env`. Everyone who signs in sees the same ones. A teammate's save shows when the window is used again or the page is refreshed, as with records.
- **B2.** The Company settings page is at `/settings`, and opens from Company settings in the menu ([N7](shell.md#app-shell)). It isn't one of the five sections, so no section is shown as current while it's open. Refresh, back and forward work, as N2 says.
- **B3.** The page holds these fields, and anyone signed in can change any of them:

| Field | Required | Rule | Message when it's wrong |
|---|---|---|---|
| Company name | Yes | Any text, not blank | Enter the company name |
| Address | No | Any text, over several lines, kept as typed, line breaks included | |
| Email | No | Must look like an email address, as in F6 | Enter a valid email address |
| Phone | No | Any text | |
| Tax label | No | Any text, such as Sales tax or VAT | |
| Tax rate | Yes | A percentage from 0 to 100 with up to three decimal places, such as 8.875. Zero is allowed. | Enter a percentage from 0 to 100, with up to 3 decimal places |
| Payment terms | Yes | A whole number of days from 0 to 365 | Enter a whole number of days from 0 to 365 |
| Quote prefix | Yes | 1 to 10 characters, using only the letters A to Z in either case, the digits 0 to 9 and hyphens, such as QT- | Use 1 to 10 letters, digits or hyphens, such as QT- |
| Invoice prefix | Yes | The same, such as INV- | Use 1 to 10 letters, digits or hyphens, such as INV- |

- **B4.** Spaces at the ends of every field are dropped before it's checked and saved, and so are blank lines at the ends of the address. An optional field left blank is saved as blank. Prefixes keep the case they're typed in.
- **B5.** The backend checks every value by the same rules, whatever sends it, so a value out of range, such as a tax rate of 150 or payment terms of 400, is refused through the API as it is through the page, with the message from B3 for each field that's wrong. The page checks as you save, and shows each message beside its field, as in F2.
- **B6.** Save settings saves every change on the page in one go, and happens once, however quickly it's pressed. Once saved, the page says "Settings saved." and shows the saved values. If the save fails, the page keeps what was typed and says so, as F10 does for dialogs.
- **B7.** The page shows who last changed the settings and when, such as "Last changed by Dana Whitfield on Nov 20, 2026", following U8. A save counts as a change only if it alters something, as in U10, so pressing Save settings with nothing changed leaves the line alone. Settings nobody has changed since Accountable added them, on a database from before this page existed, show "Nobody has changed these yet." Nobody chooses who's recorded: the backend takes it from the token of whoever saves.
- **B8.** Two people saving at once follow the rule for records: the last save wins, field by field. The page sends only the fields that changed, so two people changing different fields both keep their change.
- **B9.** While the form has changes that haven't been saved, a teammate's save arriving from a refetch leaves what's typed alone and updates the last-changed line. Leaving the page drops unsaved changes, with no warning, as closing a dialog does.
- **B10.** If the settings can't be read, the page says so and offers Try again, as in N6, and shows no form, so blank fields never pass for the real settings.

## Starting settings

- **B11.** A new database starts with the settings of a made-up company, part of the sample data (M8):

| Field | Value |
|---|---|
| Company name | Fieldstone Digital |
| Address | 48 Larkspur Avenue, Suite 210, then Brooklyn, NY 11201 on a second line |
| Email | `hello@fieldstone.example` |
| Phone | (718) 555-0134 |
| Tax label | Sales tax |
| Tax rate | 8.875% |
| Payment terms | 30 days |
| Quote prefix | QT- |
| Invoice prefix | INV- |

Fieldstone Digital is a small software and services firm, which fits the sample deals: support plans, booking systems, portals and apps for small businesses. Its email uses `.example` (M5), its phone number is in the 555-0100 to 555-0199 range set aside for fiction, and its name is unlike any sample organization's. The sample data puts the settings down to one of the made-up teammates as last changed, a few days before the day of seeding (M2).

- **B12.** A database from before this page existed, such as the team's in Supabase, gets settings when the migration adds the table: "Your company" as the name, the tax label Sales tax at 0%, payment terms of 30 days, the prefixes QT- and INV-, and the rest blank, with nobody recorded (B7). The made-up company isn't put on a database that already holds the team's work.
- **B13.** `npm run seed` puts the made-up company's settings back, as it does the sample records. `npm run empty` leaves the settings as they are, as it leaves the teammates, and so do the steps in `docs/STATUS.md` for clearing the sample data from the shared app (C4, C11).

## Not yet

- Using the settings on quotes and invoices, which don't exist yet, or numbering any document
- Currencies other than US dollars, and more than one tax rate
- A logo
- Personal preferences. The theme stays in the menu, and belongs to the browser (L2).

## Screens

### Company settings page

The page title "Company settings", then one panel, 720px wide at most, against the left of the page as the tables are. Inside, the fields come in three groups, each under a section heading, separated by space and not lines:

- **Company:** Company name, Address, Email and Phone. The address box is four lines high.
- **Tax and payment:** Tax label, Tax rate and Payment terms. Tax rate is followed by "%" and payment terms by "days", in muted ink, beside the box.
- **Document numbers:** Quote prefix and Invoice prefix, side by side.

Labels sit above their fields, as in the forms in dialogs. Inputs take the page color and the 8px input radius. Tax rate, payment terms and the two prefixes are typed in JetBrains Mono, because they're figures and identifiers, and every other field in Instrument Sans.

At the foot of the panel is Save settings, a main button in Sea Green with Midnight text, and beside it, in muted ink, the line from B7. "Settings saved." shows as a message at the bottom center, like every other message.

Enter in a one-line field saves, and Enter in the address box starts a new line. Required fields are marked for screen readers. A failed read shows the failed-read panel from N6 in place of the form.
