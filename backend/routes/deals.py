from fastapi import APIRouter

from backend.schemas import DealIn, DealMove
from backend.services import deals as svc

router = APIRouter(prefix="/api/deals", tags=["deals"])


@router.get("")
def list_deals():
    return svc.list_deals()


@router.post("", status_code=201)
def create_deal(body: DealIn):
    return svc.create_deal(body)


@router.get("/{deal_id}")
def get_deal(deal_id: int):
    return svc.get_deal(deal_id)


@router.put("/{deal_id}")
def update_deal(deal_id: int, body: DealIn):
    return svc.update_deal(deal_id, body)


@router.post("/{deal_id}/move")
def move_deal(deal_id: int, body: DealMove):
    return svc.move_deal(deal_id, body.stage, body.index)


@router.get("/{deal_id}/delete-impact")
def delete_impact(deal_id: int):
    return svc.delete_impact(deal_id)


@router.delete("/{deal_id}", status_code=204)
def delete_deal(deal_id: int):
    svc.delete_deal(deal_id)
