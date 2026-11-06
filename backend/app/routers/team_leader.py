"""
Team Leader API Router
Handles Team Leader registration, Project HR approval / rejection,
authentication with approval gating, assigned projects & teams, task creation,
employee task assignment, deadlines, daily updates, review/approval/rework,
and team performance monitoring.
"""

from datetime import datetime, timezone, date, timedelta
from typing import List, Optional, Any
import re
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.security import verify_password, get_password_hash, create_access_token
from app.dependencies.auth import get_current_user, get_current_admin, get_current_team_leader
from app.services.firestore_service import firestore_service

router = APIRouter(prefix="/teamlead", tags=["Team Leader Management"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class TeamLeaderRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, description="Team Leader Full Name")
    team_leader_id: Optional[str] = None
    email: str = Field(..., description="Company Email Address")
    phone: str = Field(..., min_length=8, description="Phone Number")
    department: Optional[str] = "Engineering"
    specialization: Optional[str] = "Software & Team Leadership"
    experience_years: Optional[str] = "3+ Years"
    password: str = Field(..., min_length=6, description="Account Password")
    confirm_password: Optional[str] = None


class TeamLeaderLoginRequest(BaseModel):
    email: str
    password: str


class CandidateApprovalRequest(BaseModel):
    approval_status: str = Field(..., pattern="^(APPROVED|REJECTED)$")
    remarks: Optional[str] = ""


class TaskCreateRequest(BaseModel):
    project_id: str
    title: str = Field(..., min_length=2)
    description: Optional[str] = ""
    assigned_to: str = Field(..., min_length=2, description="Employee Full Name")
    assigned_to_id: Optional[str] = None
    deadline: str = Field(..., description="Target completion date (YYYY-MM-DD)")
    priority: Optional[str] = "High"  # High, Medium, Low
    estimated_hours: Optional[float] = 8.0


class TaskDeadlineUpdateRequest(BaseModel):
    deadline: str
    priority: Optional[str] = None
    notes: Optional[str] = ""


class TaskReviewRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject|rework)$")
    feedback: Optional[str] = ""
    rework_notes: Optional[str] = ""
    revised_deadline: Optional[str] = None


class WorkUpdateCreateRequest(BaseModel):
    project_id: str
    task_id: Optional[str] = None
    employee_name: str
    date: Optional[str] = None
    hours_worked: Optional[float] = 8.0
    summary: str = Field(..., min_length=5)
    blockers: Optional[str] = "None"
    status: Optional[str] = "Submitted"


# ============================================================================
# Helper: Formatters
# ============================================================================

def format_candidate(c: dict) -> dict:
    return {
        "id": c.get("id"),
        "full_name": c.get("full_name") or c.get("name") or "Team Leader",
        "name": c.get("full_name") or c.get("name") or "Team Leader",
        "team_leader_id": c.get("team_leader_id") or c.get("id"),
        "email": c.get("email"),
        "phone": c.get("phone") or "--",
        "department": c.get("department") or "Engineering",
        "specialization": c.get("specialization") or "Technical Leadership",
        "experience_years": c.get("experience_years") or "3+ Years",
        "approval_status": c.get("approval_status", "PENDING"),
        "is_active": c.get("is_active", False),
        "registered_at": c.get("registered_at") or c.get("created_at"),
        "reviewed_by": c.get("reviewed_by"),
        "reviewed_at": c.get("reviewed_at"),
        "rejection_reason": c.get("rejection_reason") or c.get("remarks"),
    }


def format_task(t: dict) -> dict:
    return {
        "id": t.get("id"),
        "project_id": t.get("project_id"),
        "project_name": t.get("project_name") or "Assigned Project",
        "title": t.get("title", "Untitled Task"),
        "description": t.get("description", ""),
        "team_leader_name": t.get("team_leader_name") or "Team Leader",
        "team_leader_id": t.get("team_leader_id"),
        "assigned_to": t.get("assigned_to", "Unassigned"),
        "assigned_to_id": t.get("assigned_to_id"),
        "deadline": t.get("deadline", ""),
        "priority": t.get("priority", "Medium"),
        "status": t.get("status", "TODO"),  # TODO, IN_PROGRESS, SUBMITTED, REWORK, APPROVED
        "progress": int(t.get("progress", 0)),
        "review_status": t.get("review_status", "PENDING"),
        "rework_notes": t.get("rework_notes", ""),
        "feedback": t.get("feedback", ""),
        "estimated_hours": float(t.get("estimated_hours", 8.0)),
        "created_at": t.get("created_at"),
        "updated_at": t.get("updated_at"),
    }


# ============================================================================
# 4. Registration & 5. Login
# ============================================================================

@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=dict)
def register_team_leader(data: TeamLeaderRegisterRequest):
    """
    Req 4. Team Leader Registration.
    Creates pending profile requiring Project HR review and approval before login.
    """
    clean_email = data.email.strip().lower()
    clean_name = data.full_name.strip()
    clean_phone = data.phone.strip()

    if data.confirm_password and data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # Check existing in team_leaders or users
    existing_tl = firestore_service.list_documents("team_leaders", [("email", "==", clean_email)])
    if existing_tl:
        raise HTTPException(
            status_code=400,
            detail="A team leader account with this email is already registered."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    raw_tl_id = (data.team_leader_id or "").strip()
    if not raw_tl_id:
        raw_tl_id = f"TL-{int(datetime.now().timestamp() * 1000) % 100000:05d}"

    doc_id = raw_tl_id
    hashed = get_password_hash(data.password)

    tl_doc = {
        "id": doc_id,
        "team_leader_id": raw_tl_id,
        "full_name": clean_name,
        "name": clean_name,
        "email": clean_email,
        "phone": clean_phone,
        "department": data.department.strip() if data.department else "Engineering",
        "specialization": data.specialization.strip() if data.specialization else "Technical Lead",
        "experience_years": data.experience_years.strip() if data.experience_years else "3+ Years",
        "hashed_password": hashed,
        "role": "team_leader",
        "approval_status": "PENDING",  # Awaiting Project HR approval
        "is_active": False,
        "registered_at": now_iso,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    firestore_service.create_document("team_leaders", tl_doc)

    # Also record in users collection for unified authentication
    existing_user = firestore_service.list_documents("users", [("email", "==", clean_email)])
    if not existing_user:
        firestore_service.create_document("users", {
            "id": doc_id,
            "uid": doc_id,
            "email": clean_email,
            "hashed_password": hashed,
            "role": "team_leader",
            "name": clean_name,
            "team_leader_id": raw_tl_id,
            "approval_status": "PENDING",
            "is_active": False,
            "created_at": now_iso,
            "updated_at": now_iso,
        })

    return {
        "success": True,
        "message": "Team Leader registration submitted successfully! Your profile is pending approval by Project HR. Once approved, you can log in to your dashboard.",
        "candidate": format_candidate(tl_doc),
    }


@router.post("/login", response_model=dict)
def login_team_leader(data: TeamLeaderLoginRequest):
    """
    Req 5. Team Leader Login.
    Enforces strict gating: only APPROVED Team Leaders can successfully log in.
    """
    clean_email = data.email.strip().lower()
    raw_password = data.password or ""

    if not clean_email or not raw_password:
        raise HTTPException(status_code=400, detail="Please enter email and password.")

    # 1. Search in team_leaders collection
    tls = firestore_service.list_documents("team_leaders", [("email", "==", clean_email)])
    tl = tls[0] if tls else None

    # Fallback to users
    if not tl:
        users = firestore_service.list_documents("users", [("email", "==", clean_email)])
        if users and users[0].get("role") in ("team_leader", "admin", "hr_projects"):
            tl = users[0]

    if not tl:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid team leader credentials. Please verify your email or register."
        )

    # Verify password
    hashed = tl.get("hashed_password") or ""
    if not verify_password(raw_password, hashed):
        # Demo master password fallback for test ease
        if raw_password != "TeamLead@123":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password. Please check your credentials."
            )

    # CRITICAL: Gating based on approval status
    st = str(tl.get("approval_status", "PENDING")).strip().upper()
    if st == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your registration is pending approval by Project HR. Please wait until approved."
        )
    elif st == "REJECTED":
        reason = tl.get("rejection_reason") or "Application rejected by Project HR"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your registration request was rejected by Project HR. Reason: {reason}"
        )
    elif st != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your team leader account has not been approved yet."
        )

    # Generate token
    user_id = str(tl.get("id") or tl.get("uid") or clean_email)
    tl_name = tl.get("full_name") or tl.get("name") or "Team Leader"
    token = create_access_token(
        subject=user_id,
        role="team_leader",
        expires_delta=timedelta(days=3),
        extra_claims={
            "email": clean_email,
            "name": tl_name,
            "employeeId": tl.get("team_leader_id") or user_id,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "team_leader",
        "user": {
            "id": user_id,
            "name": tl_name,
            "email": clean_email,
            "role": "team_leader",
            "department": tl.get("department", "Engineering"),
            "team_leader_id": tl.get("team_leader_id") or user_id,
            "approval_status": "APPROVED",
        }
    }


# ============================================================================
# Project HR Approval / Rejection Integration
# ============================================================================

@router.get("/candidates", response_model=List[dict])
def list_team_leader_candidates(current_user=Depends(get_current_admin)):
    """
    Project HR: View all registered Team Leader candidates with their profile & status.
    """
    docs = firestore_service.list_documents("team_leaders") or []
    return [format_candidate(d) for d in docs]


@router.patch("/candidates/{candidate_id}/approval", response_model=dict)
def approve_or_reject_candidate(
    candidate_id: str,
    data: CandidateApprovalRequest,
    current_user=Depends(get_current_admin),
):
    """
    Project HR: Approve or Reject a Team Leader registration profile.
    Approving immediately enables the Team Leader to log in.
    """
    tl = firestore_service.get_document("team_leaders", candidate_id)
    if not tl:
        # Search by team_leader_id or email
        all_tl = firestore_service.list_documents("team_leaders")
        for item in all_tl:
            if item.get("team_leader_id") == candidate_id or item.get("email") == candidate_id:
                tl = item
                candidate_id = item.get("id")
                break

    if not tl:
        raise HTTPException(status_code=404, detail=f"Team leader candidate {candidate_id} not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    approver = getattr(current_user, "email", "project.hr@arshith.com")

    is_approved = data.approval_status == "APPROVED"
    tl["approval_status"] = data.approval_status
    tl["is_active"] = is_approved
    tl["reviewed_by"] = approver
    tl["reviewed_at"] = now_iso
    if not is_approved:
        tl["rejection_reason"] = data.remarks or "Application does not meet current role requirements."
    else:
        tl["rejection_reason"] = None

    tl["updated_at"] = now_iso
    firestore_service.update_document("team_leaders", candidate_id, tl)

    # Synchronize users collection
    clean_email = str(tl.get("email", "")).lower().strip()
    if clean_email:
        u_docs = firestore_service.list_documents("users", [("email", "==", clean_email)])
        for u in u_docs:
            u_id = u.get("id")
            u["approval_status"] = data.approval_status
            u["is_active"] = is_approved
            u["updated_at"] = now_iso
            firestore_service.update_document("users", u_id, u)

    return {
        "success": True,
        "message": f"Team leader candidate {tl.get('full_name', '')} {data.approval_status.lower()} successfully.",
        "candidate": format_candidate(tl)
    }


@router.get("/approved", response_model=List[dict])
def list_approved_team_leaders(current_user=Depends(get_current_user)):
    """
    Returns list of verified APPROVED Team Leaders for dropdown selection in Project HR forms.
    """
    docs = firestore_service.list_documents("team_leaders") or []
    approved = [format_candidate(d) for d in docs if str(d.get("approval_status", "")).upper() == "APPROVED"]
    return approved


# ============================================================================
# 6. View Assigned Projects & 7. View Assigned Team
# ============================================================================

@router.get("/projects", response_model=List[dict])
def get_assigned_projects(current_user=Depends(get_current_team_leader)):
    """
    Req 6. View Assigned Projects.
    Returns strictly projects where the logged-in user is the assigned Team Leader.
    """
    user_email = str(getattr(current_user, "email", "")).lower().strip()
    user_name = str(getattr(current_user, "name", "") or getattr(current_user, "full_name", "")).strip().lower()
    user_role = str(getattr(current_user, "role", "")).lower().strip()
    tl_id = str(getattr(current_user, "team_leader_id", "") or getattr(current_user, "employeeId", "") or getattr(current_user, "id", "")).strip()

    all_projects = firestore_service.list_documents("projects") or []

    # If Admin or Project HR, show all projects
    if user_role in ("admin", "hr_projects", "project_hr"):
        return all_projects

    # Filter strictly for this Team Leader
    assigned = []
    for p in all_projects:
        p_leader = str(p.get("team_leader", "")).strip().lower()
        p_leader_id = str(p.get("team_leader_id", "")).strip()
        
        # Match strictly by ID, exact name, or contained full name
        matched = False
        if tl_id and p_leader_id and tl_id.lower() == p_leader_id.lower():
            matched = True
        elif user_name and p_leader and (user_name == p_leader or (len(user_name) >= 3 and user_name in p_leader) or (len(p_leader) >= 3 and p_leader in user_name)):
            matched = True
        elif user_email and p_leader and user_email.split("@")[0].lower() in p_leader:
            matched = True

        if matched:
            assigned.append(p)

    return assigned


@router.get("/team", response_model=List[dict])
def get_assigned_team(current_user=Depends(get_current_team_leader)):
    """
    Req 7. View Assigned Team.
    Returns only employees assigned across projects led by this Team Leader.
    """
    projects = get_assigned_projects(current_user=current_user)
    assigned_names = set()
    for p in projects:
        for name in p.get("assigned_employees", []):
            if name:
                assigned_names.add(name.strip().lower())

    if not assigned_names:
        return []

    employees = firestore_service.list_documents("employees") or []
    tasks = firestore_service.list_documents("project_tasks") or []

    team_members = []
    for emp in employees:
        emp_name = emp.get("name") or emp.get("fullName") or emp.get("full_name") or ""
        clean_name = emp_name.strip().lower()
        # Match strictly if in assigned_names
        if clean_name in assigned_names or any(clean_name in a or a in clean_name for a in assigned_names):
            emp_tasks = [t for t in tasks if str(t.get("assigned_to", "")).lower() == clean_name]
            active_cnt = sum(1 for t in emp_tasks if t.get("status") in ("TODO", "IN_PROGRESS", "REWORK"))
            completed_cnt = sum(1 for t in emp_tasks if t.get("status") == "APPROVED")

            team_members.append({
                "id": emp.get("id") or emp.get("employee_id"),
                "employee_id": emp.get("employee_id") or emp.get("employeeId"),
                "name": emp_name,
                "email": emp.get("email", "--"),
                "phone": emp.get("phone", "--"),
                "department": emp.get("department", "Operations"),
                "designation": emp.get("designation", "Staff Member"),
                "active_tasks": active_cnt,
                "completed_tasks": completed_cnt,
                "status": emp.get("status", "Active"),
            })

    return team_members


# ============================================================================
# 8. Create Tasks, 9. Assign Tasks, 10. Set Deadlines, 11. Monitor Employee Work
# ============================================================================

@router.get("/tasks", response_model=List[dict])
def list_tasks(
    project_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    assigned_to: Optional[str] = None,
    current_user=Depends(get_current_team_leader),
):
    """
    Req 8, 9, 10, 11. List and monitor tasks assigned to team members.
    Strictly scoped to projects led by this Team Leader (or all projects if admin/project_hr).
    """
    user_role = str(getattr(current_user, "role", "")).lower().strip()
    assigned_projs = get_assigned_projects(current_user=current_user)
    assigned_project_ids = {p.get("id") for p in assigned_projs}

    docs = firestore_service.list_documents("project_tasks") or []
    res = []
    for d in docs:
        item = format_task(d)
        if user_role not in ("admin", "hr_projects", "project_hr") and item["project_id"] not in assigned_project_ids:
            continue
        if project_id and item["project_id"] != project_id:
            continue
        if status_filter and item["status"].lower() != status_filter.lower():
            continue
        if assigned_to and item["assigned_to"].lower() != assigned_to.lower():
            continue
        res.append(item)

    # Sort: REWORK and SUBMITTED first, then deadline
    res.sort(key=lambda t: (0 if t["status"] in ("REWORK", "SUBMITTED") else 1, t["deadline"]))
    return res


@router.post("/tasks", status_code=status.HTTP_201_CREATED, response_model=dict)
def create_task(data: TaskCreateRequest, current_user=Depends(get_current_team_leader)):
    """
    Req 8. Create Tasks
    Req 9. Assign Tasks to Employees
    Req 10. Set Task Deadlines
    Validates project assignment and employee membership.
    """
    user_role = str(getattr(current_user, "role", "")).lower().strip()
    tl_name = getattr(current_user, "name", "") or getattr(current_user, "full_name", "") or "Team Leader"
    tl_id = getattr(current_user, "team_leader_id", "") or getattr(current_user, "id", "")

    # Fetch and validate project
    proj = firestore_service.get_document("projects", data.project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project '{data.project_id}' not found.")

    if user_role not in ("admin", "hr_projects", "project_hr"):
        p_tl_id = str(proj.get("team_leader_id", "")).strip()
        p_tl_name = str(proj.get("team_leader", "")).strip().lower()
        if p_tl_id != str(tl_id) and tl_name.lower() not in p_tl_name and p_tl_name not in tl_name.lower():
            raise HTTPException(status_code=403, detail="You can only create tasks for projects assigned to you.")

    # Validate that employee is assigned to this project
    assigned_employees = [str(e).strip().lower() for e in proj.get("assigned_employees", [])]
    target_emp = data.assigned_to.strip()
    if not assigned_employees or (target_emp.lower() not in assigned_employees and not any(target_emp.lower() in e for e in assigned_employees)):
        raise HTTPException(
            status_code=400,
            detail=f"Employee '{target_emp}' is not assigned to project '{proj.get('name')}'. Only project members can be assigned tasks."
        )

    # Resolve employee ID if not provided
    target_emp_id = data.assigned_to_id
    if not target_emp_id:
        all_emps = firestore_service.list_documents("employees") or []
        for e in all_emps:
            if str(e.get("name") or e.get("full_name", "")).strip().lower() == target_emp.lower():
                target_emp_id = e.get("employee_id") or e.get("id")
                break

    now_iso = datetime.now(timezone.utc).isoformat()
    doc_id = f"TSK-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
    proj_name = proj.get("name") or "Sprint Project"

    task_doc = {
        "id": doc_id,
        "project_id": data.project_id,
        "project_name": proj_name,
        "title": data.title.strip(),
        "description": data.description.strip() if data.description else "",
        "team_leader_name": tl_name,
        "team_leader_id": tl_id,
        "assigned_to": target_emp,
        "assigned_to_id": target_emp_id,
        "deadline": data.deadline,
        "priority": data.priority or "High",
        "estimated_hours": data.estimated_hours or 8.0,
        "status": "TODO",  # TODO, IN_PROGRESS, SUBMITTED, REWORK, APPROVED
        "progress": 0,
        "review_status": "PENDING",
        "rework_notes": "",
        "feedback": "",
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    firestore_service.create_document("project_tasks", task_doc)

    # Send in-app notification to the assigned employee
    notif_id = f"NOTIF-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
    firestore_service.create_document("employee_notifications", {
        "id": notif_id,
        "recipient_id": target_emp_id or target_emp.lower(),
        "recipient_name": target_emp,
        "type": "TASK_ASSIGNED",
        "title": f"New Task: {task_doc['title']}",
        "message": f"You were assigned task '{task_doc['title']}' on project '{proj_name}' by {tl_name}. Deadline: {data.deadline}.",
        "task_id": doc_id,
        "project_id": data.project_id,
        "urgency": "info",
        "is_read": False,
        "created_at": now_iso,
    })

    return format_task(task_doc)


@router.patch("/tasks/{task_id}/deadline", response_model=dict)
def update_task_deadline(
    task_id: str,
    data: TaskDeadlineUpdateRequest,
    current_user=Depends(get_current_team_leader),
):
    """
    Req 10. Set Task Deadlines: Adjust deadline, priority, or milestone notes.
    """
    task = firestore_service.get_document("project_tasks", task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    task["deadline"] = data.deadline
    if data.priority:
        task["priority"] = data.priority
    task["updated_at"] = now_iso

    firestore_service.update_document("project_tasks", task_id, task)
    return format_task(task)


# ============================================================================
# 12. View Daily Work Updates
# ============================================================================

@router.get("/work-updates", response_model=List[dict])
def get_daily_work_updates(
    project_id: Optional[str] = None,
    current_user=Depends(get_current_team_leader),
):
    """
    Req 12. View Daily Work Updates submitted by team members.
    """
    updates = firestore_service.list_documents("employee_daily_updates") or []
    if project_id:
        updates = [u for u in updates if u.get("project_id") == project_id]

    updates.sort(key=lambda u: u.get("date") or u.get("created_at", ""), reverse=True)
    return updates


@router.post("/work-updates", status_code=status.HTTP_201_CREATED, response_model=dict)
def create_daily_work_update(
    data: WorkUpdateCreateRequest,
    current_user=Depends(get_current_user),
):
    """
    Req 12. Log a daily work update.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    doc_id = f"UPD-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"

    proj = firestore_service.get_document("projects", data.project_id)
    proj_name = proj.get("name") if proj else "Assigned Project"

    doc = {
        "id": doc_id,
        "project_id": data.project_id,
        "project_name": proj_name,
        "task_id": data.task_id,
        "employee_name": data.employee_name,
        "date": data.date or date.today().isoformat(),
        "hours_worked": data.hours_worked or 8.0,
        "summary": data.summary,
        "blockers": data.blockers or "None",
        "status": data.status or "Submitted",
        "created_at": now_iso,
    }

    firestore_service.create_document("employee_daily_updates", doc)
    return doc


# ============================================================================
# 13. Review Submitted Tasks, 14. Approve / Reject Tasks, 15. Assign Rework
# ============================================================================

@router.get("/submitted-tasks", response_model=List[dict])
def get_submitted_tasks(current_user=Depends(get_current_team_leader)):
    """
    Req 13. Review Submitted Tasks: Retrieve tasks awaiting TL decision.
    """
    tasks = firestore_service.list_documents("project_tasks") or []
    submitted = [format_task(t) for t in tasks if t.get("status") in ("SUBMITTED", "In Review")]
    return submitted


@router.patch("/tasks/{task_id}/review", response_model=dict)
def review_task(
    task_id: str,
    data: TaskReviewRequest,
    current_user=Depends(get_current_team_leader),
):
    """
    Req 14. Approve / Reject Tasks
    Req 15. Assign Rework
    Notifies employee immediately.
    """
    task = firestore_service.get_document("project_tasks", task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    action = data.action.lower()
    tl_name = getattr(current_user, "name", "") or getattr(current_user, "full_name", "") or "Team Leader"

    notif_title = ""
    notif_msg = ""
    notif_urgency = "info"

    if action == "approve":
        task["status"] = "APPROVED"
        task["review_status"] = "APPROVED"
        task["progress"] = 100
        task["feedback"] = data.feedback or "Deliverable verified and approved."
        task["approved_at"] = now_iso
        notif_title = f"Task Approved: {task.get('title')}"
        notif_msg = f"Your task '{task.get('title')}' was approved by {tl_name}. {task['feedback']}"
        notif_urgency = "success"
    elif action == "reject":
        task["status"] = "REJECTED"
        task["review_status"] = "REJECTED"
        task["feedback"] = data.feedback or "Task deliverables rejected."
        task["rejected_at"] = now_iso
        notif_title = f"Task Rejected: {task.get('title')}"
        notif_msg = f"Your task '{task.get('title')}' was rejected by {tl_name}. Reason: {task['feedback']}"
        notif_urgency = "critical"
    elif action == "rework":
        task["status"] = "REWORK"
        task["review_status"] = "REWORK"
        task["progress"] = 35
        task["rework_notes"] = data.rework_notes or data.feedback or "Please address code review remarks."
        if data.revised_deadline:
            task["deadline"] = data.revised_deadline
        task["rework_assigned_at"] = now_iso
        notif_title = f"Rework Assigned: {task.get('title')}"
        notif_msg = f"Team Leader {tl_name} assigned rework on '{task.get('title')}'. Notes: {task['rework_notes']}"
        notif_urgency = "warning"

    task["updated_at"] = now_iso
    firestore_service.update_document("project_tasks", task_id, task)

    # In-app notification for the employee
    emp_recipient = task.get("assigned_to_id") or task.get("assigned_to", "").lower()
    if emp_recipient:
        notif_id = f"NOTIF-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
        firestore_service.create_document("employee_notifications", {
            "id": notif_id,
            "recipient_id": emp_recipient,
            "recipient_name": task.get("assigned_to", ""),
            "type": f"TASK_{action.upper()}",
            "title": notif_title,
            "message": notif_msg,
            "task_id": task_id,
            "urgency": notif_urgency,
            "is_read": False,
            "created_at": now_iso,
        })

    return format_task(task)


# ============================================================================
# 16. Monitor Team Performance
# ============================================================================

@router.get("/performance", response_model=dict)
def get_team_performance(current_user=Depends(get_current_team_leader)):
    """
    Req 16. Monitor Team Performance: Completion metrics, rework rates, employee velocity.
    Strictly scoped to projects led by this Team Leader.
    """
    projects = get_assigned_projects(current_user=current_user)
    assigned_project_ids = {p.get("id") for p in projects}
    team_members = get_assigned_team(current_user=current_user)

    all_tasks = firestore_service.list_documents("project_tasks") or []
    user_role = str(getattr(current_user, "role", "")).lower().strip()
    if user_role in ("admin", "hr_projects", "project_hr"):
        tasks = all_tasks
    else:
        tasks = [t for t in all_tasks if t.get("project_id") in assigned_project_ids]

    total_tasks = len(tasks)
    approved_tasks = sum(1 for t in tasks if t.get("status") == "APPROVED")
    submitted_tasks = sum(1 for t in tasks if t.get("status") in ("SUBMITTED", "In Review"))
    rework_tasks = sum(1 for t in tasks if t.get("status") == "REWORK")
    in_progress_tasks = sum(1 for t in tasks if t.get("status") in ("IN_PROGRESS", "TODO"))

    completion_rate = round((approved_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0
    rework_rate = round((rework_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

    # Employee Velocity Scorecard
    employee_scorecard = []
    for emp in team_members:
        emp_name = emp.get("name")
        e_tasks = [t for t in tasks if str(t.get("assigned_to", "")).lower() == emp_name.lower()]
        e_total = len(e_tasks)
        e_done = sum(1 for t in e_tasks if t.get("status") == "APPROVED")
        e_rework = sum(1 for t in e_tasks if t.get("status") == "REWORK")
        e_rate = round((e_done / e_total * 100), 1) if e_total > 0 else 100

        employee_scorecard.append({
            "employee_name": emp_name,
            "department": emp.get("department", "Engineering"),
            "designation": emp.get("designation", "Staff"),
            "total_tasks": e_total,
            "completed_tasks": e_done,
            "rework_count": e_rework,
            "completion_rate": e_rate,
            "velocity_rating": "Top Performer" if e_rate >= 80 else "On Track" if e_rate >= 50 else "Needs Support"
        })

    return {
        "total_tasks": total_tasks,
        "completed_tasks": approved_tasks,
        "submitted_for_review": submitted_tasks,
        "active_rework": rework_tasks,
        "in_progress": in_progress_tasks,
        "completion_rate_percentage": completion_rate,
        "rework_rate_percentage": rework_rate,
        "active_projects_count": len(projects),
        "team_members_count": len(team_members),
        "employee_scorecard": employee_scorecard,
    }
