from fastapi import APIRouter

from backend.schemas import ContactIn
from backend.services import contacts as svc

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.get("")
def list_contacts():
    return svc.list_contacts()


@router.post("", status_code=201)
def create_contact(body: ContactIn):
    return svc.create_contact(body)


@router.get("/{contact_id}")
def get_contact(contact_id: int):
    return svc.get_contact(contact_id)


@router.put("/{contact_id}")
def update_contact(contact_id: int, body: ContactIn):
    return svc.update_contact(contact_id, body)


@router.get("/{contact_id}/delete-impact")
def delete_impact(contact_id: int):
    return svc.delete_impact(contact_id)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int):
    svc.delete_contact(contact_id)
