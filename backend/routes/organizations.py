from fastapi import APIRouter

from backend.auth import SignedIn
from backend.schemas import OrganizationIn
from backend.services import organizations as svc

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("")
def list_organizations():
    return svc.list_organizations()


@router.post("", status_code=201)
def create_organization(body: OrganizationIn, user: SignedIn):
    return svc.create_organization(body, user.id)


@router.get("/{org_id}")
def get_organization(org_id: int):
    return svc.get_organization(org_id)


@router.put("/{org_id}")
def update_organization(org_id: int, body: OrganizationIn, user: SignedIn):
    return svc.update_organization(org_id, body, user.id)


@router.get("/{org_id}/delete-impact")
def delete_impact(org_id: int):
    return svc.delete_impact(org_id)


@router.delete("/{org_id}", status_code=204)
def delete_organization(org_id: int):
    svc.delete_organization(org_id)
