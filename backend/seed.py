"""Sample data (SEED-01 to SEED-06, ARC-13).

seed(conn, today, now) fills an empty database. Every date is relative to
today, so the dashboard's last 12 months are always filled (DEC-13). On
23 Nov 2026 it gives the figures in mockup B: open pipeline $1.130.000 in
14 deals, $668.000 won over 12 months, and 4 overdue follow-ups.

    uv run python -m backend.seed           reset to the sample data
    uv run python -m backend.seed --empty   reset to an empty database
    uv run python -m backend.seed --yes     needed when the database is Postgres (RUN-03)

`npm run seed` runs this through scripts/seed.mjs, which loads .env first.
Sample records get no author (SEED-07), and `users` is never cleared.
"""

import argparse
import calendar
import random
import sys
from datetime import date, datetime, time, timedelta

from sqlalchemy import delete, func, insert, select
from sqlalchemy.engine import make_url

from backend import clock, db, settings
from backend.db import ALL_TABLES, activities, contacts, deals, events, organizations
from backend.services.stages import OPEN_STAGES, STAGES

ORGANIZATIONS = [
    ("Harbor Logistics", "Logistics", "Regional freight and warehousing, three depots."),
    ("Pinecrest Hotels", "Hospitality", "Eight boutique hotels; buys through head office."),
    ("Solano Foods", "Retail", "Grocery chain with 40 stores; slow to sign off budgets."),
    ("Corvus Analytics", "Software", "Data consultancy; partner on two past projects."),
    ("Northgate Finance", "Finance", "Mid-size lender; compliance drives most purchases."),
    ("Brightline Health", "Healthcare", "Outpatient clinics across the region."),
    ("Meridian Clinics", "Healthcare", "Two clinics, growing fast; IT run by one person."),
    ("Fernwood Retail", "Retail", "Home goods retailer, strong online store."),
    ("Kestrel Manufacturing", "Manufacturing", "Machine parts; plant upgrade planned next year."),
    ("Larch Software", "Software", "SaaS company; renews contracts every spring."),
]

# name, organization (or None), job title, status
CONTACTS = [
    ("Sam Whitfield", "Harbor Logistics", "Operations Director", "customer"),
    ("Hannah Cole", "Harbor Logistics", "Fleet Manager", "lead"),
    ("Lucia Moreno", "Pinecrest Hotels", "General Manager", "customer"),
    ("Oliver Grant", "Pinecrest Hotels", "IT Lead", "qualified"),
    ("Tomas Silva", "Solano Foods", "Supply Chain Lead", "qualified"),
    ("Rosa Delgado", "Solano Foods", "Store Operations Manager", "lead"),
    ("Ben Hartley", "Corvus Analytics", "CTO", "qualified"),
    ("Mia Novak", "Corvus Analytics", "Project Manager", "qualified"),
    ("Priya Raman", "Northgate Finance", "Head of Compliance", "customer"),
    ("James Whitaker", "Northgate Finance", "CFO", "customer"),
    ("Laura Chen", "Northgate Finance", "Risk Analyst", "lead"),
    ("Daniel Okafor", "Brightline Health", "Practice Director", "customer"),
    ("Amara Nwosu", "Brightline Health", "Clinic Manager", "lead"),
    ("Grace Liu", "Meridian Clinics", "IT Lead", "customer"),
    ("Peter Haas", "Meridian Clinics", "Finance Manager", "qualified"),
    ("Elena Fischer", "Fernwood Retail", "Head of Ecommerce", "customer"),
    ("Chris Doyle", "Fernwood Retail", "Marketing Lead", "lead"),
    ("Marco Bianchi", "Kestrel Manufacturing", "Plant Manager", "customer"),
    ("Sofia Rossi", "Kestrel Manufacturing", "Quality Lead", "qualified"),
    ("Ivan Petrov", "Kestrel Manufacturing", "Maintenance Engineer", "lead"),
    ("Noah Stein", "Larch Software", "VP Operations", "customer"),
    ("Emma Price", "Larch Software", "Office Manager", "lead"),
    ("Aisha Khan", None, "Independent Consultant", "qualified"),
    ("Tom Becker", None, "Freelance Buyer", "lead"),
    ("Nina Patel", None, "Procurement Advisor", "lead"),
]

# Open deals: name, organization, contact, stage, value in dollars,
# close date in days from today, probability set by hand (or None).
# Listed in pipeline order within each stage.
OPEN_DEALS = [
    ("Fleet tracking", "Harbor Logistics", "Sam Whitfield", "new", 35000, 84, None),
    ("Guest portal", "Pinecrest Hotels", "Lucia Moreno", "new", 35000, 97, None),
    ("POS rollout", "Solano Foods", None, "new", 28000, 118, None),
    ("Data audit", "Corvus Analytics", "Ben Hartley", "new", 22000, 112, None),
    ("Group reporting", "Northgate Finance", "Priya Raman", "qualified", 110000, 67, None),
    ("Clinic scheduling", "Brightline Health", "Daniel Okafor", "qualified", 95000, 81, None),
    ("Intake forms", "Meridian Clinics", "Grace Liu", "qualified", 45000, -3, None),
    ("Loyalty app", "Fernwood Retail", "Elena Fischer", "qualified", 60000, 58, 35),
    ("Shop-floor tablets", "Kestrel Manufacturing", "Marco Bianchi", "proposal", 140000, 25, None),
    ("Warehouse sensors", "Harbor Logistics", "Sam Whitfield", "proposal", 120000, 60, 45),
    ("Support renewal", "Larch Software", "Noah Stein", "proposal", 80000, -9, None),
    ("Compliance suite", "Northgate Finance", "Priya Raman", "negotiation", 180000, 18, None),
    ("Booking engine", "Pinecrest Hotels", "Lucia Moreno", "negotiation", 95000, -13, None),
    ("Telehealth add-on", "Brightline Health", "Daniel Okafor", "negotiation", 85000, 37, None),
]

# Closed deals: name, organization, contact, stage, value in dollars,
# close month (0 = this month, -1 = last month), day of month,
# and for lost deals the stage they were lost from. Newest first.
CLOSED_DEALS = [
    ("Store analytics", "Fernwood Retail", "Elena Fischer", "won", 86000, 0, None, None),
    ("Patient portal", "Meridian Clinics", "Grace Liu", "won", 63000, -1, 14, None),
    ("Maintenance plan", "Kestrel Manufacturing", "Marco Bianchi", "won", 112000, -2, 22, None),
    ("Route planning", "Harbor Logistics", "Sam Whitfield", "won", 54000, -3, 19, None),
    ("Staff app", "Pinecrest Hotels", "Lucia Moreno", "won", 29000, -4, 8, None),
    ("Risk dashboard", "Northgate Finance", "James Whitaker", "won", 95000, -5, 24, None),
    ("Clinic kiosk", "Brightline Health", "Daniel Okafor", "won", 38000, -6, 12, None),
    ("Release tooling", "Larch Software", "Noah Stein", "won", 68500, -7, 9, None),
    ("Training workshop", "Meridian Clinics", "Grace Liu", "won", 2500, -7, 27, None),
    ("Audit reporting", "Northgate Finance", "Priya Raman", "won", 46000, -8, 17, None),
    ("Line sensors", "Kestrel Manufacturing", "Marco Bianchi", "won", 24000, -9, 11, None),
    ("Web shop refresh", "Fernwood Retail", None, "won", 32000, -10, 20, None),
    ("Depot scanners", "Harbor Logistics", "Sam Whitfield", "won", 18000, -11, 15, None),
    ("Supply dashboard", "Solano Foods", "Tomas Silva", "lost", 60000, -2, 9, "proposal"),
    ("Analytics pilot", "Corvus Analytics", "Ben Hartley", "lost", 55000, -5, 16, "negotiation"),
    ("Team training", "Larch Software", None, "lost", 35000, -9, 12, "qualified"),
]

# Activities with follow-ups: record kind, record name, type, description,
# days ago, time, follow-up in days from today, done.
FOLLOW_UPS = [
    ("deal", "Booking engine", "call", "Call back about contract terms", 9, "11:20", -5, False),
    ("deal", "Support renewal", "email", "Send revised pricing", 8, "14:05", -3, False),
    ("deal", "Compliance suite", "call", "Confirm budget sign-off", 6, "10:40", -2, False),
    ("contact", "Priya Raman", "email", "Email the case study", 5, "09:15", -1, False),
    ("contact", "Daniel Okafor", "call", "Call about onboarding", 4, "16:30", 0, False),
    ("deal", "Shop-floor tablets", "note", "Check proposal feedback", 3, "12:10", 0, False),
    ("deal", "Telehealth add-on", "call", "Book the product demo", 2, "15:45", 3, False),
    ("deal", "Group reporting", "email", "Send the security questionnaire", 1, "11:05", 2, False),
    ("contact", "Oliver Grant", "call", "Follow up on the pilot quote", 6, "13:30", 5, False),
    ("deal", "Warehouse sensors", "note", "Share the rollout plan", 5, "17:10", 6, False),
    ("contact", "Lucia Moreno", "note", "Quarterly check-in", 12, "10:00", 21, False),
    ("contact", "Noah Stein", "call", "Renewal conversation", 20, "14:20", 40, False),
    ("deal", "POS rollout", "note", "Revisit budget in the new year", 15, "09:50", 45, False),
    ("deal", "Compliance suite", "email", "Send the contract draft", 20, "16:00", -14, True),
    ("contact", "Sam Whitfield", "call", "Check in after go-live", 30, "11:30", -21, True),
    ("deal", "Store analytics", "call", "Confirm the purchase order", 12, "15:00", -6, True),
    ("contact", "Grace Liu", "email", "Send the onboarding guide", 40, "10:25", -33, True),
    (
        "deal",
        "Clinic scheduling",
        "note",
        "Prepare the discovery questions",
        18,
        "13:15",
        -10,
        True,
    ),
]

# Activities without follow-ups: record kind, record name, type, description, days ago, time.
NOTES = [
    ("deal", "Compliance suite", "call", "Agreed a two-year term", 0, "09:30"),
    ("deal", "Shop-floor tablets", "email", "Sent the proposal", 3, "16:40"),
    ("deal", "Warehouse sensors", "note", "Wants a phased rollout", 6, "15:22"),
    ("contact", "Grace Liu", "call", "Intro with the new IT lead", 7, "13:10"),
    ("deal", "Intake forms", "email", "Sent the form templates for review", 10, "11:45"),
    ("deal", "Fleet tracking", "call", "First call; 60 vans to track", 14, "10:15"),
    ("deal", "Guest portal", "note", "Head office wants one portal for all hotels", 16, "14:50"),
    ("deal", "Data audit", "email", "Shared a sample audit report", 21, "09:40"),
    ("deal", "Loyalty app", "call", "Walked through the points model", 9, "15:30"),
    ("contact", "Hannah Cole", "note", "Met at the logistics trade fair", 25, "12:00"),
    ("contact", "Rosa Delgado", "email", "Asked for a brochure on store tools", 33, "10:50"),
    ("contact", "Laura Chen", "call", "Introduced by James Whitaker", 45, "16:15"),
    ("contact", "Amara Nwosu", "note", "Interested once the kiosk project settles", 52, "11:10"),
    ("contact", "Tom Becker", "email", "Sent our price list", 60, "09:05"),
    ("contact", "Nina Patel", "call", "Advises two of our prospects on procurement", 75, "14:35"),
    ("contact", "Aisha Khan", "note", "Could refer clients in healthcare", 90, "13:20"),
]

CLOSED_ACTIVITY_TEXT = [
    ("call", "Went through the requirements"),
    ("email", "Sent the final quote"),
]


def _month_date(today: date, months: int, day: int | None) -> date:
    index = today.year * 12 + (today.month - 1) + months
    year, month = index // 12, index % 12 + 1
    if day is None:
        # This month's win: five days ago, but never before the 1st.
        return max(today.replace(day=1), today - timedelta(days=5))
    return date(year, month, min(day, calendar.monthrange(year, month)[1]))


class _Clock:
    """Times for sample entries, never later than now."""

    def __init__(self, today: date, now: datetime):
        self.today = today
        self.now = now
        self.clamped = 0

    def at(self, day: date, hhmm: str) -> datetime:
        hour, minute = (int(p) for p in hhmm.split(":"))
        value = datetime.combine(day, time(hour, minute))
        if value > self.now:
            self.clamped += 1
            value = self.now - timedelta(minutes=self.clamped)
        return value

    def ago(self, days: int, hhmm: str) -> datetime:
        return self.at(self.today - timedelta(days=days), hhmm)


def _add_stage_events(conn, deal_id: int, path: list[str], first: datetime, last: datetime) -> None:
    steps = len(path) - 1
    for n in range(steps):
        if n == steps - 1:
            at = last
        else:
            # Spread the earlier moves out, in working hours.
            day = (first + (last - first) * (n + 1) / (steps + 1)).date()
            at = min(
                datetime.combine(day, time(9 + (deal_id + n) % 8, (deal_id * 7 + n * 13) % 60)),
                last,
            )
        at = at.replace(second=0, microsecond=0)
        conn.execute(
            insert(events).values(
                kind="stage_change",
                deal_id=deal_id,
                from_value=path[n],
                to_value=path[n + 1],
                occurred_at=at,
                created_at=at,
                updated_at=at,
            )
        )


class _Seeder:
    """Fills the tables in a fixed order, so the sample data is the same every time."""

    def __init__(self, conn, today: date, now: datetime):
        self.conn = conn
        self.today = today
        self.when = _Clock(today, now)
        self.rng = random.Random(2026)
        self.org_ids: dict[str, int] = {}
        self.contact_ids: dict[str, int] = {}
        self.deal_ids: dict[str, int] = {}
        self.positions = {k: 0 for k in STAGES}
        self.wins_by_contact: dict[str, datetime] = {}

    def organizations(self) -> None:
        for i, (name, industry, notes) in enumerate(ORGANIZATIONS):
            slug = name.split()[0].lower()
            created = self.when.ago(400 - i * 7, "09:00")
            self.org_ids[name] = self.conn.execute(
                insert(organizations).values(
                    name=name,
                    website=f"https://{slug}.example",
                    industry=industry,
                    notes=notes,
                    created_at=created,
                    updated_at=created,
                )
            ).inserted_primary_key[0]

    def contacts(self) -> None:
        for i, (name, org, title, status) in enumerate(CONTACTS):
            first, last = name.lower().split()
            domain = f"{org.split()[0].lower()}.example" if org else "mail.example"
            created = self.when.ago(380 - i * 9, "10:00")
            self.contact_ids[name] = self.conn.execute(
                insert(contacts).values(
                    name=name,
                    email=f"{first}.{last}@{domain}",
                    phone=f"+1 555 01{i:02d}",
                    job_title=title,
                    organization_id=self.org_ids.get(org) if org else None,
                    status=status,
                    created_at=created,
                    updated_at=created,
                )
            ).inserted_primary_key[0]

    def _insert_deal(
        self, name, org, contact, stage, dollars, probability, close_date, created, updated
    ) -> int:
        self.deal_ids[name] = self.conn.execute(
            insert(deals).values(
                name=name,
                organization_id=self.org_ids[org],
                contact_id=self.contact_ids.get(contact) if contact else None,
                stage=stage,
                value_cents=dollars * 100,
                probability=probability,
                close_date=close_date,
                position=self.positions[stage],
                created_at=created,
                updated_at=updated,
            )
        ).inserted_primary_key[0]
        self.positions[stage] += 1
        return self.deal_ids[name]

    def open_deals(self) -> None:
        for i, (name, org, contact, stage, dollars, close_in, manual) in enumerate(OPEN_DEALS):
            created = self.when.ago(40 + i * 6, "09:30")
            probability = manual if manual is not None else STAGES[stage].probability
            close_date = self.today + timedelta(days=close_in)
            deal_id = self._insert_deal(
                name, org, contact, stage, dollars, probability, close_date, created, created
            )
            path = OPEN_STAGES[: OPEN_STAGES.index(stage) + 1]
            if len(path) > 1:
                if name == "Telehealth add-on":
                    last_move = self.when.ago(0, "10:12")
                else:
                    last_move = self.when.ago(2 + i, "11:00")
                _add_stage_events(self.conn, deal_id, path, created, last_move)

    def closed_deals(self) -> None:
        start = self.when.ago(365, "09:00")
        for name, org, contact, stage, dollars, months, day, lost_from in CLOSED_DEALS:
            closed_on = _month_date(self.today, months, day)
            closed_at = self.when.at(closed_on, "11:05")
            created = max(start, closed_at - timedelta(days=60))
            probability = STAGES[stage].probability
            deal_id = self._insert_deal(
                name, org, contact, stage, dollars, probability, closed_on, created, closed_at
            )
            if lost_from is None:
                path = [*OPEN_STAGES, "won"]
            else:
                path = [*OPEN_STAGES[: OPEN_STAGES.index(lost_from) + 1], "lost"]
            if stage == "won" and contact:
                first_win = self.wins_by_contact.get(contact)
                if first_win is None or closed_at < first_win:
                    self.wins_by_contact[contact] = closed_at
            _add_stage_events(self.conn, deal_id, path, created, closed_at)
            self._closed_deal_activities(deal_id, closed_at)

    def _closed_deal_activities(self, deal_id: int, closed_at: datetime) -> None:
        for k, (kind, text) in enumerate(CLOSED_ACTIVITY_TEXT):
            day = (closed_at - timedelta(days=20 - k * 13)).date()
            hour_minute = time(self.rng.randint(9, 16), self.rng.randint(0, 59))
            at = min(datetime.combine(day, hour_minute), closed_at)
            self._insert_activity(kind, text, at, None, False, deal_id=deal_id, contact_id=None)

    def status_changes(self) -> None:
        # Every customer became one with their first win; every qualified
        # contact was a lead before.
        for name, _org, _title, status in CONTACTS:
            if status == "customer":
                at = self.wins_by_contact[name]
                from_value = "qualified"
            elif status == "qualified":
                at = self.when.ago(30 + len(name) * 3, "15:00")
                from_value = "lead"
            else:
                continue
            self.conn.execute(
                insert(events).values(
                    kind="status_change",
                    contact_id=self.contact_ids[name],
                    from_value=from_value,
                    to_value=status,
                    occurred_at=at,
                    created_at=at,
                    updated_at=at,
                )
            )

    def _record(self, kind: str, name: str) -> dict:
        if kind == "deal":
            return {"deal_id": self.deal_ids[name], "contact_id": None}
        return {"deal_id": None, "contact_id": self.contact_ids[name]}

    def _insert_activity(self, act_type, text, at, follow_up_date, done, **record) -> None:
        self.conn.execute(
            insert(activities).values(
                type=act_type,
                description=text,
                occurred_at=at,
                follow_up_date=follow_up_date,
                follow_up_done=done,
                created_at=at,
                updated_at=at,
                **record,
            )
        )

    def follow_ups_and_notes(self) -> None:
        for kind, name, act_type, text, days, hhmm, follow_in, done in FOLLOW_UPS:
            follow_up_date = self.today + timedelta(days=follow_in)
            at = self.when.ago(days, hhmm)
            self._insert_activity(
                act_type, text, at, follow_up_date, done, **self._record(kind, name)
            )
        for kind, name, act_type, text, days, hhmm in NOTES:
            at = self.when.ago(days, hhmm)
            self._insert_activity(act_type, text, at, None, False, **self._record(kind, name))


def seed(conn, today: date, now: datetime) -> None:
    seeder = _Seeder(conn, today, now)
    seeder.organizations()
    seeder.contacts()
    seeder.open_deals()
    seeder.closed_deals()
    seeder.status_changes()
    seeder.follow_ups_and_notes()


def clear(conn) -> None:
    """Every table except `users`, children first (SEED-07)."""
    for table in ALL_TABLES:
        conn.execute(delete(table))


def seed_database(empty: bool = False) -> None:
    """Reset the database in one transaction: clear every table, then seed."""
    db.run_migrations()
    with db.transaction() as conn:
        clear(conn)
        if not empty:
            seed(conn, clock.today(), clock.now())


def count_records() -> int:
    """How many organizations, contacts, deals and activities the database holds."""
    with db.reading() as conn:
        return sum(
            conn.execute(select(func.count()).select_from(t)).scalar_one()
            for t in (organizations, contacts, deals, activities)
        )


def describe(config: settings.Settings) -> str:
    """The database, for messages, without its password."""
    if not config.is_postgres:
        return str(db.db_path())
    url = make_url(config.database_url)
    return f"Postgres database {url.database} on {url.host}"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Reset the Accountable database to the sample data."
    )
    parser.add_argument("--empty", action="store_true", help="leave every table empty instead")
    parser.add_argument(
        "--yes", action="store_true", help="go ahead when the database is Postgres on Supabase"
    )
    args = parser.parse_args(argv)
    config = settings.load()
    where = describe(config)
    if config.is_postgres and not args.yes:
        # RUN-03: this would wipe the team's data, so it has to be asked for twice.
        print(
            f"This would reset the {where}, which holds {count_records()} records, "
            "and wipe the team's data.\n"
            "To go ahead: npm run seed -- --yes\n"
            "To reset the local SQLite file instead: npm run seed -- --local",
            file=sys.stderr,
        )
        return 1
    seed_database(empty=args.empty)
    print(f"Database {where} reset to {'no data' if args.empty else 'the sample data'}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
