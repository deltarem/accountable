"""Sample data (SEED-01 to SEED-06, ARC-13).

seed(conn, today, now) fills an empty database. Every date is relative to
today, so the dashboard's last 12 months are always filled (DEC-13). On
23 Nov 2026 it gives the figures in mockup B: open pipeline $1.130.000 in
14 deals, $668.000 won over 12 months, and 4 overdue follow-ups.

    uv run python -m backend.seed           reset to the sample data
    uv run python -m backend.seed --empty   reset to an empty database
"""

import argparse
import calendar
import random
from datetime import date, datetime, time, timedelta

from sqlalchemy import delete, insert

from backend import clock, db
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
    ("deal", "Clinic scheduling", "note", "Prepare the discovery questions", 18, "13:15", -10, True),
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


def seed(conn, today: date, now: datetime) -> None:
    rng = random.Random(2026)
    when = _Clock(today, now)
    start = when.ago(365, "09:00")

    org_ids = {}
    for i, (name, industry, notes) in enumerate(ORGANIZATIONS):
        slug = name.split()[0].lower()
        created = when.ago(400 - i * 7, "09:00")
        org_ids[name] = conn.execute(
            insert(organizations).values(
                name=name,
                website=f"https://{slug}.example",
                industry=industry,
                notes=notes,
                created_at=created,
                updated_at=created,
            )
        ).inserted_primary_key[0]

    contact_ids = {}
    contact_status = {}
    for i, (name, org, title, status) in enumerate(CONTACTS):
        first, last = name.lower().split()
        domain = f"{org.split()[0].lower()}.example" if org else "mail.example"
        created = when.ago(380 - i * 9, "10:00")
        contact_ids[name] = conn.execute(
            insert(contacts).values(
                name=name,
                email=f"{first}.{last}@{domain}",
                phone=f"+1 555 01{i:02d}",
                job_title=title,
                organization_id=org_ids.get(org) if org else None,
                status=status,
                created_at=created,
                updated_at=created,
            )
        ).inserted_primary_key[0]
        contact_status[name] = status

    deal_ids = {}
    positions = {k: 0 for k in STAGES}

    def add_events(deal_id: int, path: list[str], first: datetime, last: datetime) -> None:
        steps = len(path) - 1
        for n in range(steps):
            if n == steps - 1:
                at = last
            else:
                # Spread the earlier moves out, in working hours.
                day = (first + (last - first) * (n + 1) / (steps + 1)).date()
                at = min(datetime.combine(day, time(9 + (deal_id + n) % 8, (deal_id * 7 + n * 13) % 60)), last)
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

    for i, (name, org, contact, stage, dollars, close_in, manual) in enumerate(OPEN_DEALS):
        created = when.ago(40 + i * 6, "09:30")
        probability = manual if manual is not None else STAGES[stage].probability
        deal_ids[name] = conn.execute(
            insert(deals).values(
                name=name,
                organization_id=org_ids[org],
                contact_id=contact_ids.get(contact) if contact else None,
                stage=stage,
                value_cents=dollars * 100,
                probability=probability,
                close_date=today + timedelta(days=close_in),
                position=positions[stage],
                created_at=created,
                updated_at=created,
            )
        ).inserted_primary_key[0]
        positions[stage] += 1
        path = OPEN_STAGES[: OPEN_STAGES.index(stage) + 1]
        if len(path) > 1:
            last_move = when.ago(0, "10:12") if name == "Telehealth add-on" else when.ago(2 + i, "11:00")
            add_events(deal_ids[name], path, created, last_move)

    wins_by_contact: dict[str, datetime] = {}
    for name, org, contact, stage, dollars, months, day, lost_from in CLOSED_DEALS:
        closed_on = _month_date(today, months, day)
        closed_at = when.at(closed_on, "11:05")
        created = max(start, closed_at - timedelta(days=60))
        deal_ids[name] = conn.execute(
            insert(deals).values(
                name=name,
                organization_id=org_ids[org],
                contact_id=contact_ids.get(contact) if contact else None,
                stage=stage,
                value_cents=dollars * 100,
                probability=STAGES[stage].probability,
                close_date=closed_on,
                position=positions[stage],
                created_at=created,
                updated_at=closed_at,
            )
        ).inserted_primary_key[0]
        positions[stage] += 1
        if stage == "won":
            path = [*OPEN_STAGES, "won"]
            if contact and (contact not in wins_by_contact or closed_at < wins_by_contact[contact]):
                wins_by_contact[contact] = closed_at
        else:
            path = [*OPEN_STAGES[: OPEN_STAGES.index(lost_from) + 1], "lost"]
        add_events(deal_ids[name], path, created, closed_at)
        for k, (kind, text) in enumerate(CLOSED_ACTIVITY_TEXT):
            day = (closed_at - timedelta(days=20 - k * 13)).date()
            at = min(datetime.combine(day, time(rng.randint(9, 16), rng.randint(0, 59))), closed_at)
            conn.execute(
                insert(activities).values(
                    type=kind,
                    deal_id=deal_ids[name],
                    description=text,
                    occurred_at=at,
                    follow_up_date=None,
                    follow_up_done=False,
                    created_at=at,
                    updated_at=at,
                )
            )

    # Status changes: every customer became one with their first win; every
    # qualified contact was a lead before.
    for name, _org, _title, status in CONTACTS:
        if status == "customer":
            at = wins_by_contact[name]
            from_value = "qualified"
        elif status == "qualified":
            at = when.ago(30 + len(name) * 3, "15:00")
            from_value = "lead"
        else:
            continue
        conn.execute(
            insert(events).values(
                kind="status_change",
                contact_id=contact_ids[name],
                from_value=from_value,
                to_value=status,
                occurred_at=at,
                created_at=at,
                updated_at=at,
            )
        )

    def record(kind: str, name: str) -> dict:
        if kind == "deal":
            return {"deal_id": deal_ids[name], "contact_id": None}
        return {"deal_id": None, "contact_id": contact_ids[name]}

    for kind, name, act_type, text, days, hhmm, follow_in, done in FOLLOW_UPS:
        at = when.ago(days, hhmm)
        conn.execute(
            insert(activities).values(
                type=act_type,
                description=text,
                occurred_at=at,
                follow_up_date=today + timedelta(days=follow_in),
                follow_up_done=done,
                created_at=at,
                updated_at=at,
                **record(kind, name),
            )
        )
    for kind, name, act_type, text, days, hhmm in NOTES:
        at = when.ago(days, hhmm)
        conn.execute(
            insert(activities).values(
                type=act_type,
                description=text,
                occurred_at=at,
                follow_up_date=None,
                follow_up_done=False,
                created_at=at,
                updated_at=at,
                **record(kind, name),
            )
        )


def clear(conn) -> None:
    for table in ALL_TABLES:
        conn.execute(delete(table))


def seed_database(empty: bool = False) -> None:
    """Reset the database in one transaction: clear every table, then seed."""
    db.create_tables()
    with db.transaction() as conn:
        clear(conn)
        if not empty:
            seed(conn, clock.today(), clock.now())


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset the Accountable database to the sample data.")
    parser.add_argument("--empty", action="store_true", help="leave every table empty instead")
    args = parser.parse_args()
    seed_database(empty=args.empty)
    where = db.db_path()
    print(f"Database {where} reset to {'no data' if args.empty else 'the sample data'}.")


if __name__ == "__main__":
    main()
