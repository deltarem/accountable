from fastapi import APIRouter

from backend.schemas import OrganizationIn
from backend.services import organizations as svc

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.get("")
def list_organizations():
    return svc.list_organizations()


@router.post("", status_code=201)
def create_organization(body: OrganizationIn):
    return svc.create_organization(body)


@router.get("/{org_id}")
def get_organization(org_id: int):
    return svc.get_organization(org_id)


@router.put("/{org_id}")
def update_organization(org_id: int, body: OrganizationIn):
    return svc.update_organization(org_id, body)


@router.get("/{org_id}/delete-impact")
def delete_impact(org_id: int):
    return svc.delete_impact(org_id)


@router.delete("/{org_id}", status_code=204)
def delete_organization(org_id: int):
    svc.delete_organization(org_id)
