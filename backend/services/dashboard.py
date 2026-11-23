"""Everything GET /api/dashboard returns, worked out when asked for (API-15)."""

from datetime import date, timedelta
from typing import TypedDict

from sqlalchemy import select

from backend import clock, db
from backend.db import activities, deals, events
from backend.money import round_half_up_div, total_expected_cents
from backend.services.stages import OPEN_STAGES, STAGES
from backend.services.timeline import activity_entry, all_entries, name_maps, record_ref

FUNNEL_STAGES = [*OPEN_STAGES, "won"]


class Month(TypedDict):
    month: str
    won_cents: int
    won_count: int
    lost_cents: int
    lost_count: int


def month_start(d: date) -> date:
    return d.replace(day=1)


def add_months(d: date, n: int) -> date:
    index = d.year * 12 + (d.month - 1) + n
    return date(index // 12, index % 12 + 1, 1)


def _percent(part: int, whole: int) -> int | None:
    if whole == 0:
        return None
    return round_half_up_div(part * 100, whole)


def _change(this: int, last: int) -> int | None:
    """Change from last month in whole percent, rounded half away from zero."""
    if last == 0:
        return None
    diff = this - last
    sign = -1 if diff < 0 else 1
    return sign * round_half_up_div(abs(diff) * 100, last)


def _lost_from(conn) -> dict[int, str]:
    """For each lost deal, the stage it was in when it was lost (DEC-10)."""
    rows = conn.execute(
        select(events.c.deal_id, events.c.from_value)
        .where(events.c.kind == "stage_change", events.c.to_value == "lost")
        .order_by(events.c.occurred_at, events.c.id)
    ).all()
    return {deal_id: from_value for deal_id, from_value in rows}


def funnel(all_deals, lost_from, window_start) -> list[dict]:
    totals = {k: {"value_cents": 0, "count": 0} for k in FUNNEL_STAGES}
    for d in all_deals:
        stage = d["stage"]
        if STAGES[stage].open:
            reached = OPEN_STAGES[: OPEN_STAGES.index(stage) + 1]
        else:
            if d["close_date"] is None or d["close_date"] < window_start:
                continue
            if stage == "won":
                reached = FUNNEL_STAGES
            else:
                last = lost_from.get(d["id"])
                last = last if last in OPEN_STAGES else "new"
                reached = OPEN_STAGES[: OPEN_STAGES.index(last) + 1]
        for k in reached:
            totals[k]["value_cents"] += d["value_cents"]
            totals[k]["count"] += 1
    top = totals["new"]["value_cents"]
    return [
        {"stage": k, **totals[k], "share_pct": _percent(totals[k]["value_cents"], top)}
        for k in FUNNEL_STAGES
    ]


def get_dashboard() -> dict:
    today = clock.today()
    now = clock.now()
    this_month = month_start(today)
    window_start = add_months(this_month, -11)

    with db.reading() as conn:
        all_deals = [dict(r) for r in conn.execute(select(deals)).mappings()]
        lost_from = _lost_from(conn)
        acts = [dict(r) for r in conn.execute(select(activities)).mappings()]
        deal_map, contact_map, org_map = name_maps(conn)
        entries = all_entries(conn)

    open_deals = [d for d in all_deals if STAGES[d["stage"]].open]

    # Revenue won and won/lost counts per month, the last 12 months including this one.
    months: list[Month] = []
    for i in range(12):
        start = add_months(window_start, i)
        end = add_months(start, 1)
        in_month = [
            d for d in all_deals if d["close_date"] is not None and start <= d["close_date"] < end
        ]
        won = [d for d in in_month if d["stage"] == "won"]
        lost = [d for d in in_month if d["stage"] == "lost"]
        months.append(
            {
                "month": start.isoformat()[:7],
                "won_cents": sum(d["value_cents"] for d in won),
                "won_count": len(won),
                "lost_cents": sum(d["value_cents"] for d in lost),
                "lost_count": len(lost),
            }
        )
    won_this = months[-1]["won_cents"]
    won_last = months[-2]["won_cents"]

    # Follow-ups (DEC-11): overdue, today, then the next 7 days; nothing done.
    week_end = today + timedelta(days=7)
    due = [
        a
        for a in acts
        if a["follow_up_date"] is not None
        and not a["follow_up_done"]
        and a["follow_up_date"] <= week_end
    ]
    due.sort(key=lambda a: (a["follow_up_date"], a["occurred_at"], a["id"]))
    follow_ups = []
    for a in due:
        entry = activity_entry(a)
        entry["record"] = record_ref(entry, deal_map, contact_map, org_map)
        if a["follow_up_date"] < today:
            entry["group"] = "overdue"
        elif a["follow_up_date"] == today:
            entry["group"] = "today"
        else:
            entry["group"] = "week"
        follow_ups.append(entry)

    pipeline_by_stage = []
    for k in OPEN_STAGES:
        in_stage = [d for d in open_deals if d["stage"] == k]
        pipeline_by_stage.append(
            {
                "stage": k,
                "count": len(in_stage),
                "value_cents": sum(d["value_cents"] for d in in_stage),
                "expected_cents": total_expected_cents(in_stage),
            }
        )

    return {
        "today": today,
        "open_pipeline_cents": sum(d["value_cents"] for d in open_deals),
        "open_deal_count": len(open_deals),
        "expected_cents": total_expected_cents(open_deals),
        "won_this_month_cents": won_this,
        "won_last_month_cents": won_last,
        "won_change_pct": _change(won_this, won_last),
        "overdue_count": sum(1 for f in follow_ups if f["group"] == "overdue"),
        "due_today_count": sum(1 for f in follow_ups if f["group"] == "today"),
        "months": months,
        "won_total_cents": sum(m["won_cents"] for m in months),
        "won_count": sum(m["won_count"] for m in months),
        "lost_count": sum(m["lost_count"] for m in months),
        "funnel": funnel(all_deals, lost_from, window_start),
        "pipeline_by_stage": pipeline_by_stage,
        "follow_ups": follow_ups,
        "recent_activity": [e for e in entries if e["occurred_at"] <= now][:10],
    }
