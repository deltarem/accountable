# Intent: the Accountable MVP

## Problem

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies we deal with, who our contacts are, what's in the sales pipeline, what happened last with a customer or what needs doing next.

## Proposed outcome

Accountable is a business management system: a sales CRM that will grow into a full Business OS, including ERP. This first version, the MVP, is a complete sales CRM for one person, running on their own computer. Think of it as a private Salesforce that does the everyday CRM essentials really well. It should feel sharp, modern and professional, and be a pleasure to use.

### Five sections

- **Dashboard**, the landing page: how sales are going at a glance. Deals won and revenue won month by month over the last 12 months (including the current month), the open pipeline and its expected revenue (each deal's value times its probability of close), a sales funnel showing how much value reaches each stage, recent activity, and the follow-ups that are coming up or overdue. It should be visually stunning, with at least a line chart, a bar chart and a visual of the pipeline. Which figures each one shows, and how, is the designer's call.
- **Organizations**: the companies we do business with. Open one to see its contacts, its deals and a timeline of everything that has happened with them.
- **Contacts**: the people we deal with, including leads and customers, with a filter by status. Open one to see their organization and a timeline of everything that has happened with them, including activity on deals where they're the main contact.
- **Deals**: the potential sales, with each one's stage, value and close date. Open one to see its details and its timeline. A deal still open after its expected close date stands out, in the table and on its pipeline card.
- **Pipeline**: the deals as cards on a board, one column per stage, all six including Won and Lost. Drag a card to another column to change the deal's stage, or within a column to change its place; a card can be dropped anywhere in a column, and it stays where it was dropped. Dragging a card to Won or Lost closes the deal. A new deal can be added straight into a column, at that stage. The board shows the total value and expected revenue of the deals still open, each column shows its own, and the figures change as soon as a card moves.

Every table has a search box, columns you can sort by clicking their headings, a way to add a new record, and edit and delete on each row. That's how we add a new deal, a new lead or a new customer. Deleting asks first, and says what will happen to the records linked to the one being deleted:

- Deleting an organization keeps its contacts and deals; they're left with no organization.
- Deleting a contact or a deal deletes its own activities with it.
- Deleting a contact keeps the deals where they're the main contact; those deals are left with no main contact.

From any contact or deal you can log an activity (a note, call or email) and give it a follow-up date. A follow-up shows on the dashboard as a task until it's marked done. Activities can be edited and deleted too. When a deal moves to another stage, including Won or Lost, an entry such as "Moved from Proposal to Negotiation" appears in its timeline and in the dashboard's recent activity by itself. When a deal is won, its main contact becomes a customer, and that change shows in their timeline too.

### Four kinds of record

- **Organization**: a company we do business with. Name, website, industry and notes. An organization has many contacts and many deals. Only the name is required.
- **Contact**: a person we deal with. Name, email, phone, job title, the organization they belong to, and a status (lead, qualified or customer). A lead is a contact with the lead status, so there's no separate list of leads. Only the name is required; a contact doesn't need an organization.
- **Deal**: a potential sale. Name, the organization and the main contact it is with, its stage (New, Qualified, Proposal, Negotiation, Won or Lost), its value in US dollars, its probability of close, and its expected or actual close date. A deal needs a name and an organization; the main contact is optional. Each stage has a usual probability of close: New 10%, Qualified 25%, Proposal 50%, Negotiation 75%, Won 100%, Lost 0%. A deal takes its new stage's probability when it moves; a probability set by hand is kept until the stage changes.
- **Activity**: something that happened, or needs to happen, with a contact or deal. Type (note, call or email), the contact or deal it relates to, a description and when it happened, and optionally a follow-up date and whether it's done.

### Sample data

Accountable comes with realistic sample data, so every screen looks alive the first time it starts: about 10 organizations across several industries, about 25 contacts at every status, about 30 deals at every stage (including deals won and lost over the past 12 months, so every month on the dashboard has something, deals expected to close in the months ahead and a few running late), and activities with some follow-ups due soon and some overdue.

### Look and feel

The look follows Accountable's brand guidelines, which take priority over any general design guidance. The MVP is light mode, designed for a laptop or desktop screen. Dates are day first, like 23 Nov 2026, and money uses a dot for thousands and a comma for decimals, like $12.500,00.

## Affected users and systems

- One salesperson, using Accountable on their own computer every day. For now that's the person building it: this is a course project, built to show a polished, complete MVP rather than to run a live business yet. The rest of the sales team joins later.
- No other systems are involved yet.

## Constraints

- The technology in `docs/TECH_STACK.md`.
- It runs locally with one documented command that works on Mac, Linux and Windows, and needs no internet connection to use.
- Every change is kept: it's still there after a browser refresh, and every time the app starts it shows every change made before.
- One documented command resets the data to the sample data, to start again from scratch.
- It handles a few hundred of each kind of record comfortably. Paging or virtual scrolling for thousands of records isn't needed yet.
- Not in the MVP: sign-in, user accounts or several users; a dark mode or a layout for phones; AI features; email, calendar or phone integrations; currencies other than US dollars; reports beyond the dashboard; tags or custom fields; changing the pipeline stages or their usual probabilities; importing or exporting data.

## Success criteria

1. Someone non-technical can start Accountable with the one documented command, open it in a browser and land on the dashboard, with sample data on every screen.
2. Organizations, contacts (leads, qualified contacts and customers) and deals can each be added, found by searching, sorted, edited and deleted from their tables, and every change is still there after a refresh and after a restart. Deleting asks first, says what will happen to linked records, and does exactly that. The reset command brings back the sample data.
3. Contacts can be filtered by status, and each record's page shows the records it's linked to.
4. Dragging a deal to another column on the pipeline changes its stage and its probability of close, and the deals list shows both. A card dropped anywhere in a column, including higher or lower in its own column, stays there after a refresh. The board's and the columns' totals and expected revenue change as soon as the card moves. A deal added in a column starts at that stage, and late deals stand out.
5. An activity or follow-up logged on a contact or deal appears in its timeline, newest first, and so does an entry for each change of stage. Activity on a deal also shows on its main contact's and its organization's timelines. Follow-ups show on the dashboard as upcoming or overdue until they're marked done.
6. The dashboard's figures match the data, and they reflect a deal marked won or a new follow-up. Winning a deal makes its main contact a customer.
7. Forms show clear errors for a missing required field, a badly formed email, a negative value or a probability outside 0 to 100%, and nothing is saved until they're fixed.
8. Forms and tables can be used with the keyboard: tab moves between fields, enter submits, escape closes a dialog.
9. With the sample data, every screen loads and every action responds in under a second.
10. Every table, timeline and chart still looks right with no data in it, for example after deleting everything.
11. Every screen is sharp, modern and professional, and follows the brand. The dashboard is visually stunning, with a line chart, a bar chart and a visual of the pipeline.
12. Before it's called done, someone has used it end to end in a real browser, the way a salesperson would: every section and every action above, each screen checked by eye, with no errors in the browser's console. Passing tests is necessary, but it isn't enough.

## Open questions

- Sign-in, several people sharing the same data, and a record of who did what are for a later intent.
- Making Accountable available to people beyond the computer it runs on is for later too.
