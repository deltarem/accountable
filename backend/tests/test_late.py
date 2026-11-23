import pytest


def late(api, **kw):
    return api.deal(**kw)["late"]


def test_open_deal_with_close_date_before_today_is_late(api):
    assert late(api, close_date="2026-11-22") is True


def test_today_is_not_late(api):
    assert late(api, close_date="2026-11-23") is False


@pytest.mark.parametrize("stage", ["won", "lost"])
def test_closed_deals_are_never_late(api, stage):
    assert late(api, stage=stage, close_date="2026-01-01") is False


def test_dateless_deal_is_never_late(api):
    assert late(api) is False
