"""
Projects & Team Leadership API Router
Handles project creation, updates, team leader approval workflows,
employee assignments, progress monitoring, and analytical reporting.
"""

from datetime import datetime, timezone, date
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.dependencies.auth import get_current_user, get_current_admin
from app.services.firestore_service import firestore_service

router = APIRouter(prefix="/projects", tags=["Projects & Team Leadership"])


# ============================================================================
# Pydantic Request / Response Schemas
# ============================================================================

class ProjectCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, description="Project Name")
    description: Optional[str] = ""
    department: Optional[str] = "Operations"
    team_id: Optional[str] = None
    team_name: Optional[str] = None
    team_leader: Optional[str] = None
    team_leader_id: Optional[str] = None
    assigned_employees: Optional[List[str]] = []
    start_date: Optional[str] = None
    deadline: str = Field(..., description="Project Deadline (YYYY-MM-DD)")
    priority: Optional[str] = "High"  # High, Medium, Low
    status: Optional[str] = "Planning"  # Planning, In Progress, On Track, At Risk, Completed
    progress: Optional[int] = 0  # 0 to 100
    proposal_pdf: Optional[str] = None  # Base64 data URL or file link
    proposal_pdf_name: Optional[str] = None


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    team_id: Optional[str] = None
    team_name: Optional[str] = None
    team_leader: Optional[str] = None
    team_leader_id: Optional[str] = None
    assigned_employees: Optional[List[str]] = None
    start_date: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    proposal_pdf: Optional[str] = None
    proposal_pdf_name: Optional[str] = None


class TeamLeaderAssignRequest(BaseModel):
    leader_name: str
    leader_id: Optional[str] = None
    leader_email: Optional[str] = None
    approval_status: Optional[str] = "PENDING"  # PENDING, APPROVED, REJECTED
    remarks: Optional[str] = None


class TeamLeaderApprovalRequest(BaseModel):
    approval_status: str = Field(..., pattern="^(APPROVED|REJECTED|PENDING)$")
    remarks: Optional[str] = None


class EmployeeAssignRequest(BaseModel):
    employees: List[str] = Field(..., description="List of employee IDs or full names")


class ProgressUpdateRequest(BaseModel):
    progress: int = Field(..., ge=0, le=100)
    status: Optional[str] = None
    milestone_note: Optional[str] = None


# ============================================================================
# Helpers
# ============================================================================

def format_project(doc: dict) -> dict:
    return {
        "id": doc.get("id"),
        "name": doc.get("name", "Untitled Project"),
        "description": doc.get("description", ""),
        "department": doc.get("department", "Operations"),
        "team_id": doc.get("team_id"),
        "team_name": doc.get("team_name") or "Core Team",
        "team_leader": doc.get("team_leader") or "Unassigned",
        "team_leader_id": doc.get("team_leader_id"),
        "team_leader_approval_status": doc.get("team_leader_approval_status", "PENDING"),
        "team_leader_remarks": doc.get("team_leader_remarks", ""),
        "assigned_employees": doc.get("assigned_employees", []),
        "employee_count": len(doc.get("assigned_employees", [])),
        "start_date": doc.get("start_date") or date.today().isoformat(),
        "deadline": doc.get("deadline", ""),
        "priority": doc.get("priority", "Medium"),
        "status": doc.get("status", "Planning"),
        "progress": int(doc.get("progress", 0)),
        "proposal_pdf": doc.get("proposal_pdf"),
        "proposal_pdf_name": doc.get("proposal_pdf_name"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


def get_approved_team_leaders() -> List[dict]:
    """Retrieve only registered and Admin/HR-approved Team Leaders."""
    tls = firestore_service.list_documents("team_leaders") or []
    approved = []
    for tl in tls:
        st = str(tl.get("approval_status", "")).strip().upper()
        if st == "APPROVED" and tl.get("is_active", True):
            name = tl.get("full_name") or tl.get("name") or "Team Leader"
            approved.append({
                "id": tl.get("team_leader_id") or tl.get("id"),
                "name": name,
                "email": tl.get("email"),
                "phone": tl.get("phone", "--"),
                "department": tl.get("department", "Engineering"),
                "specialization": tl.get("specialization", "Technical Leadership"),
            })
    approved.sort(key=lambda x: x["name"].lower())
    return approved


def get_approved_employees_list() -> List[dict]:
    """Retrieve only registered and Admin/HR-approved staff members."""
    emps = firestore_service.list_documents("employees") or []
    approved = []
    for e in emps:
        emp_id = str(e.get("employee_id") or e.get("id") or "")
        desig = str(e.get("designation") or e.get("role") or "")
        # Exclude administrative accounts
        if desig in ("Administrator", "HR Manager", "Project HR Lead") or emp_id.startswith(("ADM-", "HR-")):
            continue
        st = str(e.get("status") or "").strip().lower()
        app_st = str(e.get("approval_status") or "").strip().upper()
        if st in ("approved", "active") and app_st not in ("PENDING", "REJECTED"):
            name = e.get("full_name") or e.get("name") or "Staff Member"
            approved.append({
                "id": emp_id,
                "name": name,
                "email": e.get("email"),
                "phone": e.get("phone", "--"),
                "department": e.get("department", "Operations"),
                "designation": desig or "Staff Member",
            })
    approved.sort(key=lambda x: x["name"].lower())
    return approved


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/approved-leaders", response_model=List[dict])
def list_approved_leaders(current_user=Depends(get_current_user)):
    """Return only registered and Admin-approved Team Leaders."""
    return get_approved_team_leaders()


@router.get("/approved-employees", response_model=List[dict])
def list_approved_employees(current_user=Depends(get_current_user)):
    """Return only registered and approved Employees (excludes admins & HRs)."""
    return get_approved_employees_list()

@router.get("", response_model=List[dict])
def list_projects(
    status_filter: Optional[str] = None,
    department: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """5. View Projects: List all projects with optional filtering."""
    docs = firestore_service.list_documents("projects")
    if not docs:
        docs = []

    res = []
    for d in docs:
        item = format_project(d)
        if status_filter and item["status"].lower() != status_filter.lower():
            continue
        if department and item["department"].lower() != department.lower():
            continue
        res.append(item)

    res.sort(key=lambda p: (p["progress"], p["deadline"]))
    return res


@router.post("", status_code=status.HTTP_201_CREATED, response_model=dict)
def create_project(
    data: ProjectCreateRequest,
    current_user=Depends(get_current_admin),
):
    """4. Add Project: Create a new project with strict approved leader & employees validation."""
    approved_leaders = get_approved_team_leaders()
    approved_leader_map = {l["name"].strip().lower(): l for l in approved_leaders}
    approved_employees = get_approved_employees_list()
    approved_emp_map = {e["name"].strip().lower(): e for e in approved_employees}

    tl_name = data.team_leader.strip() if data.team_leader else "Unassigned"
    tl_id = data.team_leader_id

    # Validate Team Leader selection
    if tl_name and tl_name != "Unassigned":
        if tl_name.lower() not in approved_leader_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Team Leader '{tl_name}' is not registered or not Admin/HR-approved."
            )
        matched_leader = approved_leader_map[tl_name.lower()]
        tl_name = matched_leader["name"]
        tl_id = matched_leader["id"]

    # Validate and deduplicate assigned employees
    validated_assigned = []
    if data.assigned_employees:
        seen = set()
        for emp_raw in data.assigned_employees:
            clean_name = emp_raw.strip()
            if not clean_name or clean_name.lower() in seen:
                continue
            if clean_name.lower() not in approved_emp_map:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Employee '{clean_name}' is not a registered and approved staff member."
                )
            seen.add(clean_name.lower())
            validated_assigned.append(approved_emp_map[clean_name.lower()]["name"])

    now_iso = datetime.now(timezone.utc).isoformat()
    doc_id = f"PRJ-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"

    project_data = {
        "id": doc_id,
        "name": data.name.strip(),
        "description": data.description.strip() if data.description else "",
        "department": data.department.strip() if data.department else "Operations",
        "team_id": data.team_id,
        "team_name": data.team_name or "Core Team",
        "team_leader": tl_name,
        "team_leader_id": tl_id,
        "team_leader_approval_status": "APPROVED" if tl_name != "Unassigned" else "PENDING",
        "team_leader_remarks": "",
        "assigned_employees": validated_assigned,
        "start_date": data.start_date or date.today().isoformat(),
        "deadline": data.deadline,
        "priority": data.priority or "High",
        "status": data.status or "Planning",
        "progress": data.progress or 0,
        "proposal_pdf": data.proposal_pdf,
        "proposal_pdf_name": data.proposal_pdf_name,
        "created_by": getattr(current_user, "email", "project.hr@arshith.com"),
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    firestore_service.create_document("projects", project_data)

    # In-app notification to Team Leader
    if tl_name != "Unassigned" and tl_id:
        notif_id = f"NOTIF-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
        firestore_service.create_document("employee_notifications", {
            "id": notif_id,
            "recipient_id": tl_id,
            "recipient_name": tl_name,
            "type": "PROJECT_ASSIGNMENT",
            "title": f"New Project Assigned: {project_data['name']}",
            "message": f"You have been assigned as Team Leader for project '{project_data['name']}'.",
            "project_id": doc_id,
            "is_read": False,
            "created_at": now_iso,
        })

    # In-app notification to each assigned employee
    for emp_name in validated_assigned:
        notif_id = f"NOTIF-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
        firestore_service.create_document("employee_notifications", {
            "id": notif_id,
            "recipient_id": emp_name.lower(),
            "recipient_name": emp_name,
            "type": "PROJECT_ASSIGNMENT",
            "title": f"Assigned to Project: {project_data['name']}",
            "message": f"You have been assigned to project '{project_data['name']}' led by {tl_name}.",
            "project_id": doc_id,
            "is_read": False,
            "created_at": now_iso,
        })

    return format_project(project_data)


@router.get("/team-leaders/approvals", response_model=List[dict])
def list_team_leader_approvals(current_user=Depends(get_current_admin)):
    """2. Approve / Reject Team Leader: List all team leader candidates & approval status."""
    projects = firestore_service.list_documents("projects") or []
    teams = firestore_service.list_documents("teams") or []
    team_leaders = firestore_service.list_documents("team_leaders") or []

    leaders = []

    # 1. Authoritative registered Team Leaders
    for tl in team_leaders:
        tl_name = tl.get("full_name") or tl.get("name") or "Team Leader"
        matching_proj = next((p for p in projects if p.get("team_leader") == tl_name), None)
        leaders.append({
            "id": tl.get("id"),
            "source_type": "registration",
            "candidate_id": tl.get("id"),
            "project_id": matching_proj.get("id") if matching_proj else None,
            "project_name": matching_proj.get("name") if matching_proj else "Unassigned Candidate",
            "team_id": None,
            "team_name": matching_proj.get("team_name") if matching_proj else "Candidate Roster",
            "leader_name": tl_name,
            "leader_id": tl.get("team_leader_id") or tl.get("id"),
            "email": tl.get("email"),
            "phone": tl.get("phone", "--"),
            "department": tl.get("department", "Engineering"),
            "specialization": tl.get("specialization", "Technical Leadership"),
            "experience_years": tl.get("experience_years", "3+ Years"),
            "approval_status": tl.get("approval_status", "PENDING"),
            "remarks": tl.get("rejection_reason") or tl.get("remarks", ""),
            "updated_at": tl.get("updated_at") or tl.get("registered_at"),
            "registered_at": tl.get("registered_at") or tl.get("created_at"),
        })

    return leaders


@router.patch("/{record_id}/team-leader-approval", response_model=dict)
def approve_reject_team_leader(
    record_id: str,
    data: TeamLeaderApprovalRequest,
    current_user=Depends(get_current_admin),
):
    """2. Approve / Reject Team Leader: Update approval status across candidates, users, and projects."""
    now_iso = datetime.now(timezone.utc).isoformat()
    approver = getattr(current_user, "email", "project.hr@arshith.com")
    is_approved = data.approval_status == "APPROVED"

    # Check if record_id is a team_leader candidate
    tl = firestore_service.get_document("team_leaders", record_id)
    if not tl:
        # Check by team_leader_id
        for candidate in firestore_service.list_documents("team_leaders") or []:
            if candidate.get("team_leader_id") == record_id or candidate.get("email") == record_id:
                tl = candidate
                record_id = candidate.get("id")
                break

    if tl:
        tl["approval_status"] = data.approval_status
        tl["is_active"] = is_approved
        tl["reviewed_by"] = approver
        tl["reviewed_at"] = now_iso
        if not is_approved:
            tl["rejection_reason"] = data.remarks or "Application rejected by Project HR."
        else:
            tl["rejection_reason"] = None
        tl["updated_at"] = now_iso
        firestore_service.update_document("team_leaders", record_id, tl)

        # Sync users collection
        clean_email = str(tl.get("email", "")).lower().strip()
        if clean_email:
            for u in firestore_service.list_documents("users", [("email", "==", clean_email)]) or []:
                u["approval_status"] = data.approval_status
                u["is_active"] = is_approved
                u["updated_at"] = now_iso
                firestore_service.update_document("users", u.get("id"), u)

        # Sync matching project if any
        tl_name = tl.get("full_name") or tl.get("name")
        for p in firestore_service.list_documents("projects") or []:
            if p.get("team_leader") == tl_name:
                p["team_leader_approval_status"] = data.approval_status
                p["team_leader_remarks"] = data.remarks or ""
                p["updated_at"] = now_iso
                firestore_service.update_document("projects", p.get("id"), p)

        return {
            "id": record_id,
            "status": "success",
            "message": f"Team Leader candidate {tl_name} {data.approval_status.lower()} successfully.",
            "approval_status": data.approval_status
        }

    # Otherwise treat as project_id
    proj_id = record_id.replace("TL-PRJ-", "")
    proj = firestore_service.get_document("projects", proj_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Team leader / project record {record_id} not found.")

    proj["team_leader_approval_status"] = data.approval_status
    proj["team_leader_remarks"] = data.remarks or ""
    proj["updated_at"] = now_iso

    firestore_service.update_document("projects", proj_id, proj)
    return format_project(proj)


@router.post("/{project_id}/team-leader", response_model=dict)
def assign_team_leader(
    project_id: str,
    data: TeamLeaderAssignRequest,
    current_user=Depends(get_current_admin),
):
    """7. Assign Team Leaders: Assign approved team leader to project."""
    proj = firestore_service.get_document("projects", project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")

    approved_leaders = get_approved_team_leaders()
    approved_map = {l["name"].strip().lower(): l for l in approved_leaders}

    raw_name = data.leader_name.strip()
    if raw_name.lower() not in approved_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team Leader '{raw_name}' is not registered or not Admin/HR-approved."
        )

    matched = approved_map[raw_name.lower()]
    now_iso = datetime.now(timezone.utc).isoformat()
    proj["team_leader"] = matched["name"]
    proj["team_leader_id"] = matched["id"]
    proj["team_leader_approval_status"] = "APPROVED"
    proj["team_leader_remarks"] = data.remarks or ""
    proj["updated_at"] = now_iso

    firestore_service.update_document("projects", project_id, proj)

    # In-app notification to the assigned team leader
    notif_id = f"NOTIF-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
    firestore_service.create_document("employee_notifications", {
        "id": notif_id,
        "recipient_id": matched["id"],
        "recipient_name": matched["name"],
        "type": "PROJECT_ASSIGNMENT",
        "title": f"New Project Assigned: {proj.get('name')}",
        "message": f"You have been assigned as Team Leader for project '{proj.get('name')}'.",
        "project_id": project_id,
        "is_read": False,
        "created_at": now_iso,
    })

    return format_project(proj)


@router.post("/{project_id}/assign-employees", response_model=dict)
def assign_employees(
    project_id: str,
    data: EmployeeAssignRequest,
    current_user=Depends(get_current_admin),
):
    """8. Assign Employees: Assign registered & approved employee staff members to project."""
    proj = firestore_service.get_document("projects", project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")

    approved_employees = get_approved_employees_list()
    approved_map = {e["name"].strip().lower(): e for e in approved_employees}

    validated_employees = []
    seen = set()
    for e in data.employees:
        clean = e.strip()
        if not clean or clean.lower() in seen:
            continue
        if clean.lower() not in approved_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee '{clean}' is not an approved registered staff member."
            )
        seen.add(clean.lower())
        validated_employees.append(approved_map[clean.lower()]["name"])

    now_iso = datetime.now(timezone.utc).isoformat()
    proj["assigned_employees"] = sorted(validated_employees)
    proj["updated_at"] = now_iso

    firestore_service.update_document("projects", project_id, proj)

    # In-app notifications to newly assigned employees
    tl_name = proj.get("team_leader") or "Team Leader"
    for emp_name in validated_employees:
        notif_id = f"NOTIF-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
        firestore_service.create_document("employee_notifications", {
            "id": notif_id,
            "recipient_id": emp_name.lower(),
            "recipient_name": emp_name,
            "type": "PROJECT_ASSIGNMENT",
            "title": f"Assigned to Project: {proj.get('name')}",
            "message": f"You have been assigned to project '{proj.get('name')}' led by {tl_name}.",
            "project_id": project_id,
            "is_read": False,
            "created_at": now_iso,
        })

    return format_project(proj)


@router.patch("/{project_id}/progress", response_model=dict)
def update_project_progress(
    project_id: str,
    data: ProgressUpdateRequest,
    current_user=Depends(get_current_admin),
):
    """10. Monitor Project Progress: Update project completion % and status."""
    proj = firestore_service.get_document("projects", project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    proj["progress"] = data.progress
    if data.status:
        proj["status"] = data.status
    elif data.progress >= 100:
        proj["status"] = "Completed"
    elif data.progress > 0 and proj.get("status") == "Planning":
        proj["status"] = "In Progress"

    proj["updated_at"] = now_iso
    firestore_service.update_document("projects", project_id, proj)
    return format_project(proj)


@router.get("/reports/summary", response_model=dict)
def get_project_reports(current_user=Depends(get_current_user)):
    """11. View Project Reports: Comprehensive summary metrics & analytics."""
    projects = firestore_service.list_documents("projects") or []
    teams = firestore_service.list_documents("teams") or []

    total_projects = len(projects)
    completed_projects = sum(1 for p in projects if p.get("status") == "Completed" or int(p.get("progress", 0)) >= 100)
    in_progress_projects = sum(1 for p in projects if p.get("status") in ("In Progress", "On Track"))
    at_risk_projects = sum(1 for p in projects if p.get("status") == "At Risk")
    planning_projects = sum(1 for p in projects if p.get("status") == "Planning")

    avg_progress = (
        round(sum(int(p.get("progress", 0)) for p in projects) / total_projects, 1)
        if total_projects > 0 else 0
    )

    # Department distribution
    dept_map = {}
    for p in projects:
        dept = p.get("department", "Operations")
        dept_map[dept] = dept_map.get(dept, 0) + 1

    # Team leaders summary
    all_leaders = set()
    for p in projects:
        if p.get("team_leader") and p.get("team_leader") != "Unassigned":
            all_leaders.add(p.get("team_leader"))
    for t in teams:
        if t.get("leader") and t.get("leader") != "Unassigned":
            all_leaders.add(t.get("leader"))

    # Total assigned workforce
    all_assigned = set()
    for p in projects:
        for e in p.get("assigned_employees", []):
            if e:
                all_assigned.add(e)

    return {
        "total_projects": total_projects,
        "completed_projects": completed_projects,
        "in_progress_projects": in_progress_projects,
        "at_risk_projects": at_risk_projects,
        "planning_projects": planning_projects,
        "average_progress": avg_progress,
        "total_teams": len(teams),
        "total_team_leaders": len(all_leaders),
        "total_assigned_workforce": len(all_assigned),
        "department_distribution": dept_map,
        "recent_projects": [format_project(p) for p in projects[:6]],
    }


@router.get("/{project_id}", response_model=dict)
def get_project(project_id: str, current_user=Depends(get_current_user)):
    """5. View Project Details."""
    proj = firestore_service.get_document("projects", project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")
    return format_project(proj)


@router.put("/{project_id}", response_model=dict)
def update_project(
    project_id: str,
    data: ProjectUpdateRequest,
    current_user=Depends(get_current_admin),
):
    """6. Edit Project."""
    proj = firestore_service.get_document("projects", project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    fields = data.dict(exclude_unset=True)
    for k, v in fields.items():
        if v is not None:
            proj[k] = v

    proj["updated_at"] = now_iso
    firestore_service.update_document("projects", project_id, proj)
    return format_project(proj)


@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
def delete_project(
    project_id: str,
    current_user=Depends(get_current_admin),
):
    """6. Delete Project."""
    proj = firestore_service.get_document("projects", project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")

    firestore_service.delete_document("projects", project_id)
    return {"success": True, "message": f"Project {project_id} successfully deleted."}

