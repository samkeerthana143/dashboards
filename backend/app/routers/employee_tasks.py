import logging
import base64
from datetime import date, datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, Field

from app.core.config import settings
from app.dependencies.auth import get_current_user
from app.services.firestore_service import firestore_service

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/employee-tasks", tags=["Employee Tasks & Sprints"])


# ============================================================================
# Pydantic Request Models
# ============================================================================

class TaskStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(TODO|IN_PROGRESS|SUBMITTED)$")
    progress: int = Field(..., ge=0, le=100)
    notes: Optional[str] = ""


class TaskSubmitDeliverablesRequest(BaseModel):
    submission_notes: str = Field(..., min_length=3)
    attachments: Optional[List[Dict[str, Any]]] = []
    progress: Optional[int] = 100


class TaskResubmitRequest(BaseModel):
    resubmission_notes: str = Field(..., min_length=3)
    attachments: Optional[List[Dict[str, Any]]] = []
    progress: Optional[int] = 100


class DailyWorkCreateRequest(BaseModel):
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    task_id: Optional[str] = None
    task_title: Optional[str] = None
    date: Optional[str] = None
    hours_worked: float = Field(..., gt=0, le=24)
    summary: str = Field(..., min_length=5)
    blockers: Optional[str] = "None"
    attachments: Optional[List[Dict[str, Any]]] = []


class AttachmentUploadRequest(BaseModel):
    file_name: str
    file_type: str
    data_url: str  # Base64 data URI: data:image/png;base64,...


# ============================================================================
# Helpers
# ============================================================================

def _resolve_employee(current_user) -> tuple:
    """Returns (emp_id, emp_name, emp_email)."""
    emp_id = getattr(current_user, "employee_id", None) or getattr(current_user, "employeeId", None) or getattr(current_user, "id", None) or ""
    emp_name = getattr(current_user, "name", None) or getattr(current_user, "full_name", None) or ""
    emp_email = getattr(current_user, "email", "") or ""

    if not emp_id or not emp_name:
        if emp_email:
            matches = firestore_service.list_documents("employees", [("email", "==", emp_email)])
            if matches:
                emp = matches[0]
                emp_id = emp_id or emp.get("employee_id") or emp.get("id")
                emp_name = emp_name or emp.get("full_name") or emp.get("name")
            else:
                u_matches = firestore_service.list_documents("users", [("email", "==", emp_email)])
                if u_matches:
                    u = u_matches[0]
                    emp_id = emp_id or u.get("employee_id") or u.get("id") or u.get("uid")
                    emp_name = emp_name or u.get("name") or u.get("full_name")
    
    if not emp_name:
        emp_name = emp_email.split("@")[0].title() if emp_email else "Employee"
    if not emp_id:
        emp_id = "EMP-1001"
    if not emp_email:
        emp_email = "employee@arshith.com"

    return str(emp_id).strip(), str(emp_name).strip(), str(emp_email).strip().lower()


def _calculate_urgency(deadline_str: str, status_str: str) -> dict:
    """Calculates days remaining and urgency badge for a deadline."""
    if status_str.upper() in ("APPROVED", "COMPLETED"):
        return {
            "days_left": 0,
            "urgency_badge": "Completed",
            "urgency_level": "success",
            "is_overdue": False,
        }

    if not deadline_str:
        return {
            "days_left": 999,
            "urgency_badge": "No Deadline",
            "urgency_level": "info",
            "is_overdue": False,
        }

    try:
        # Parse ISO or YYYY-MM-DD
        deadline_date = datetime.strptime(deadline_str.split("T")[0], "%Y-%m-%d").date()
        today = date.today()
        diff = (deadline_date - today).days

        if diff < 0:
            overdue_days = abs(diff)
            badge = f"Overdue by {overdue_days}d" if overdue_days > 1 else "Overdue by 1 day"
            return {
                "days_left": diff,
                "urgency_badge": badge,
                "urgency_level": "critical",
                "is_overdue": True,
            }
        elif diff == 0:
            return {
                "days_left": 0,
                "urgency_badge": "Due Today",
                "urgency_level": "critical",
                "is_overdue": False,
            }
        elif diff == 1:
            return {
                "days_left": 1,
                "urgency_badge": "Due Tomorrow",
                "urgency_level": "warning",
                "is_overdue": False,
            }
        elif diff <= 4:
            return {
                "days_left": diff,
                "urgency_badge": f"Due in {diff} days",
                "urgency_level": "warning",
                "is_overdue": False,
            }
        else:
            return {
                "days_left": diff,
                "urgency_badge": f"Due in {diff} days",
                "urgency_level": "info",
                "is_overdue": False,
            }
    except Exception:
        return {
            "days_left": 999,
            "urgency_badge": "Upcoming",
            "urgency_level": "info",
            "is_overdue": False,
        }


def _format_employee_task(t: dict) -> dict:
    st = str(t.get("status", "TODO")).strip().upper()
    urgency = _calculate_urgency(t.get("deadline", ""), st)
    return {
        "id": t.get("id"),
        "project_id": t.get("project_id"),
        "project_name": t.get("project_name") or "Sprint Project",
        "title": t.get("title", "Untitled Task"),
        "description": t.get("description", ""),
        "team_leader_name": t.get("team_leader_name") or "Team Leader",
        "team_leader_id": t.get("team_leader_id"),
        "assigned_to": t.get("assigned_to", "Me"),
        "assigned_to_id": t.get("assigned_to_id"),
        "deadline": t.get("deadline", ""),
        "priority": t.get("priority", "Medium"),
        "status": st,
        "progress": int(t.get("progress", 0)),
        "review_status": t.get("review_status", "PENDING"),
        "rework_notes": t.get("rework_notes", ""),
        "feedback": t.get("feedback", ""),
        "attachments": t.get("attachments", []),
        "submission_notes": t.get("submission_notes", ""),
        "submitted_at": t.get("submitted_at"),
        "resubmission_notes": t.get("resubmission_notes", ""),
        "resubmitted_at": t.get("resubmitted_at"),
        "estimated_hours": float(t.get("estimated_hours", 8.0)),
        "created_at": t.get("created_at"),
        "updated_at": t.get("updated_at"),
        # Computed urgency
        "days_left": urgency["days_left"],
        "urgency_badge": urgency["urgency_badge"],
        "urgency_level": urgency["urgency_level"],
        "is_overdue": urgency["is_overdue"],
    }


# ============================================================================
# 9. View Team Details
# ============================================================================

@router.get("/team", response_model=dict)
def get_my_team_details(current_user=Depends(get_current_user)):
    """
    Req 9. View Team Details.
    Returns:
      - Active project details
      - Team Leader contact and specialization
      - Co-workers / sprint teammates with their roles and designations
    """
    emp_id, emp_name, emp_email = _resolve_employee(current_user)

    # 1. Fetch all projects
    projects = firestore_service.list_documents("projects") or []
    my_project = None

    # Search strictly for project that includes this employee
    for p in projects:
        assigned_list = [str(x).strip().lower() for x in p.get("assigned_employees", [])]
        if (
            emp_name.lower() in assigned_list
            or any(emp_name.lower() in a for a in assigned_list)
            or emp_email.lower() in assigned_list
        ):
            my_project = p
            break

    # If employee is not assigned to any project, return unassigned state cleanly
    if not my_project:
        return {
            "project": None,
            "team_name": "No Assigned Project",
            "team_leader": None,
            "teammates": [{
                "id": emp_id,
                "name": emp_name,
                "email": emp_email,
                "phone": "--",
                "department": "Operations",
                "designation": "Staff Member",
                "is_current_user": True,
                "total_tasks": 0,
                "completed_tasks": 0,
            }],
            "current_employee": {
                "id": emp_id,
                "name": emp_name,
                "email": emp_email,
            },
        }

    # 2. Resolve Team Leader details
    tl_info = None
    p_tl_name = my_project.get("team_leader")
    p_tl_id = my_project.get("team_leader_id")

    if p_tl_name and p_tl_name != "Unassigned":
        tls = firestore_service.list_documents("team_leaders") or []
        for tl in tls:
            if (p_tl_id and tl.get("id") == p_tl_id) or (p_tl_name and str(tl.get("full_name") or tl.get("name", "")).strip().lower() == p_tl_name.strip().lower()):
                tl_info = {
                    "name": tl.get("full_name") or tl.get("name") or p_tl_name,
                    "email": tl.get("email") or "teamlead@arshith.com",
                    "phone": tl.get("phone") or "--",
                    "department": tl.get("department") or my_project.get("department", "Engineering"),
                    "specialization": tl.get("specialization") or "Technical Leadership",
                    "role": "Team Leader",
                }
                break
        if not tl_info:
            tl_info = {
                "name": p_tl_name,
                "email": "teamlead@arshith.com",
                "phone": "--",
                "department": my_project.get("department", "Engineering"),
                "specialization": "Technical Leadership",
                "role": "Team Leader",
            }

    # 3. Resolve Teammates strictly belonging to this project
    all_employees = firestore_service.list_documents("employees") or []
    all_tasks = firestore_service.list_documents("project_tasks") or []

    assigned_names = set(str(name).strip().lower() for name in my_project.get("assigned_employees", []) if name)

    teammates = []
    for emp in all_employees:
        m_name = emp.get("full_name") or emp.get("name") or ""
        m_id = emp.get("employee_id") or emp.get("employeeId") or emp.get("id") or ""
        m_lower = m_name.lower().strip()

        # Strict match: must be assigned to this project
        if m_lower in assigned_names or any(m_lower in a or a in m_lower for a in assigned_names):
            m_tasks = [t for t in all_tasks if str(t.get("assigned_to", "")).lower() == m_lower]
            teammates.append({
                "id": m_id,
                "name": m_name,
                "email": emp.get("email", "--"),
                "phone": emp.get("phone", "--"),
                "department": emp.get("department") or my_project.get("department", "Engineering"),
                "designation": emp.get("designation", "Staff Member"),
                "is_current_user": (m_id == emp_id or m_lower == emp_name.lower()),
                "total_tasks": len(m_tasks),
                "completed_tasks": sum(1 for t in m_tasks if t.get("status") == "APPROVED"),
            })

    # Ensure current user is present
    if not any(t["is_current_user"] for t in teammates):
        teammates.insert(0, {
            "id": emp_id,
            "name": emp_name,
            "email": emp_email,
            "phone": "--",
            "department": my_project.get("department", "Engineering"),
            "designation": "Staff Member",
            "is_current_user": True,
            "total_tasks": len([t for t in all_tasks if str(t.get("assigned_to", "")).lower() == emp_name.lower()]),
            "completed_tasks": 0,
        })

    return {
        "project": {
            "id": my_project.get("id"),
            "name": my_project.get("name"),
            "description": my_project.get("description", ""),
            "department": my_project.get("department", "Engineering"),
            "status": my_project.get("status", "In Progress"),
            "priority": my_project.get("priority", "High"),
            "deadline": my_project.get("deadline", ""),
            "progress": int(my_project.get("progress", 0)),
        },
        "team_name": my_project.get("team_name") or "Project Sprint Team",
        "team_leader": tl_info,
        "teammates": teammates,
        "current_employee": {
            "id": emp_id,
            "name": emp_name,
            "email": emp_email,
        },
    }


# ============================================================================
# 10. View Assigned Tasks & 16. View Deadlines
# ============================================================================

@router.get("/tasks", response_model=List[dict])
def get_my_assigned_tasks(
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """
    Req 10. View Assigned Tasks.
    Req 16. View Deadlines.
    Returns strictly sprint tasks assigned to current employee with real-time urgency calculations.
    """
    emp_id, emp_name, emp_email = _resolve_employee(current_user)
    docs = firestore_service.list_documents("project_tasks") or []

    tasks = []
    for d in docs:
        assigned_name = str(d.get("assigned_to", "")).strip().lower()
        assigned_id = str(d.get("assigned_to_id", "")).strip()

        # Strict match employee
        matches = False
        if assigned_id and assigned_id == emp_id:
            matches = True
        elif emp_name and (emp_name.lower() == assigned_name or (len(emp_name) >= 3 and emp_name.lower() in assigned_name) or (len(assigned_name) >= 3 and assigned_name in emp_name.lower())):
            matches = True
        elif emp_email and emp_email.split("@")[0].lower() in assigned_name:
            matches = True

        if matches:
            item = _format_employee_task(d)
            if status_filter and item["status"].lower() != status_filter.lower():
                continue
            if priority_filter and item["priority"].lower() != priority_filter.lower():
                continue
            tasks.append(item)

    # Sort priority: REWORK first, then Overdue, then nearest deadline
    tasks.sort(key=lambda t: (
        0 if t["status"] == "REWORK" else (1 if t["is_overdue"] else 2),
        t["days_left"],
    ))
    return tasks


@router.get("/deadlines", response_model=dict)
def get_deadlines_overview(current_user=Depends(get_current_user)):
    """
    Req 16. View Deadlines.
    Returns categorized deadline breakdown: overdue, due today, due this week, upcoming, and completed.
    """
    tasks = get_my_assigned_tasks(current_user=current_user)

    overdue = [t for t in tasks if t["is_overdue"] and t["status"] != "APPROVED"]
    due_today = [t for t in tasks if t["days_left"] == 0 and t["status"] != "APPROVED"]
    due_this_week = [t for t in tasks if 1 <= t["days_left"] <= 7 and t["status"] != "APPROVED"]
    upcoming = [t for t in tasks if t["days_left"] > 7 and t["status"] != "APPROVED"]
    completed = [t for t in tasks if t["status"] == "APPROVED"]

    return {
        "overdue_count": len(overdue),
        "due_today_count": len(due_today),
        "due_this_week_count": len(due_this_week),
        "upcoming_count": len(upcoming),
        "completed_count": len(completed),
        "overdue_tasks": overdue,
        "due_today_tasks": due_today,
        "due_this_week_tasks": due_this_week,
        "upcoming_tasks": upcoming,
        "completed_tasks": completed,
        "all_tasks": tasks,
    }


# ============================================================================
# 11. Update Task Status
# ============================================================================

@router.patch("/tasks/{task_id}/status", response_model=dict)
def update_task_status(
    task_id: str,
    data: TaskStatusUpdateRequest,
    current_user=Depends(get_current_user),
):
    """
    Req 11. Update Task Status (TODO -> IN_PROGRESS -> SUBMITTED) and progress percentage (0-100%).
    """
    emp_id, emp_name, emp_email = _resolve_employee(current_user)
    task = firestore_service.get_document("project_tasks", task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    task["status"] = data.status.upper()
    task["progress"] = data.progress
    task["updated_at"] = now_iso
    if data.notes:
        task["status_notes"] = data.notes.strip()

    firestore_service.update_document("project_tasks", task_id, task)

    # Log in audit
    logger.info(f"Task {task_id} status updated to {data.status} ({data.progress}%) by {emp_name}")

    return _format_employee_task(task)


# ============================================================================
# 12. Submit Daily Work & 13. Upload Documents / Screenshots
# ============================================================================

@router.post("/tasks/{task_id}/submit", response_model=dict)
def submit_task_deliverables(
    task_id: str,
    data: TaskSubmitDeliverablesRequest,
    current_user=Depends(get_current_user),
):
    """
    Req 11, 12, 13. Submit Task Deliverables with work summary and proof attachments / screenshots.
    Marks task SUBMITTED and sends to Team Leader review queue.
    """
    emp_id, emp_name, emp_email = _resolve_employee(current_user)
    task = firestore_service.get_document("project_tasks", task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

    now_iso = datetime.now(timezone.utc).isoformat()

    existing_attachments = task.get("attachments", []) or []
    new_attachments = existing_attachments + (data.attachments or [])

    task["status"] = "SUBMITTED"
    task["progress"] = 100
    task["review_status"] = "PENDING"
    task["submission_notes"] = data.submission_notes.strip()
    task["attachments"] = new_attachments
    task["submitted_at"] = now_iso
    task["updated_at"] = now_iso

    firestore_service.update_document("project_tasks", task_id, task)

    # Create in-app notification for Team Leader
    tl_id = task.get("team_leader_id")
    if not tl_id and task.get("project_id"):
        proj = firestore_service.get_document("projects", task.get("project_id"))
        if proj:
            tl_id = proj.get("team_leader_id") or proj.get("team_leader")
    tl_id = tl_id or "TL-ALL"
    notif_id = f"NOTIF-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
    firestore_service.create_document("employee_notifications", {
        "id": notif_id,
        "recipient_id": tl_id,
        "type": "TASK_SUBMISSION",
        "title": f"Task Submitted: {task.get('title')}",
        "message": f"{emp_name} has submitted task '{task.get('title')}' for your review.",
        "task_id": task_id,
        "is_read": False,
        "created_at": now_iso,
    })

    return _format_employee_task(task)


@router.get("/daily-work", response_model=List[dict])
def list_my_daily_work_updates(current_user=Depends(get_current_user)):
    """
    Req 12. Submit Daily Work - View past submissions.
    """
    emp_id, emp_name, emp_email = _resolve_employee(current_user)
    docs = firestore_service.list_documents("employee_daily_updates") or []

    res = []
    for d in docs:
        d_emp = str(d.get("employee_name", "")).strip().lower()
        d_id = str(d.get("employee_id", "")).strip()

        if d_id == emp_id or (emp_name and emp_name.lower() in d_emp) or (emp_email and emp_email.lower() == str(d.get("employee_email", "")).lower()):
            res.append({
                "id": d.get("id"),
                "date": d.get("date") or str(date.today()),
                "project_id": d.get("project_id", ""),
                "project_name": d.get("project_name", "Sprint Project"),
                "task_id": d.get("task_id", ""),
                "task_title": d.get("task_title", "General Sprint Development"),
                "hours_worked": float(d.get("hours_worked", 8.0)),
                "summary": d.get("summary", ""),
                "blockers": d.get("blockers", "None"),
                "status": d.get("status", "Submitted"),
                "attachments": d.get("attachments", []),
                "created_at": d.get("created_at"),
            })

    res.sort(key=lambda x: str(x.get("date") or ""), reverse=True)
    return res


@router.post("/daily-work", status_code=status.HTTP_201_CREATED, response_model=dict)
def submit_daily_work_report(
    data: DailyWorkCreateRequest,
    current_user=Depends(get_current_user),
):
    """
    Req 12. Submit Daily Work.
    Req 13. Upload Documents / Screenshots with daily standup updates.
    """
    emp_id, emp_name, emp_email = _resolve_employee(current_user)
    now_iso = datetime.now(timezone.utc).isoformat()
    today_str = data.date or str(date.today())
    doc_id = f"EDW-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"

    update_doc = {
        "id": doc_id,
        "employee_id": emp_id,
        "employee_name": emp_name,
        "employee_email": emp_email,
        "project_id": data.project_id or "PRJ-101",
        "project_name": data.project_name or "Arshith Connect Mobile Native App",
        "task_id": data.task_id or "",
        "task_title": data.task_title or "Sprint Core Development",
        "date": today_str,
        "hours_worked": data.hours_worked,
        "summary": data.summary.strip(),
        "blockers": data.blockers.strip() if data.blockers else "None",
        "status": "Submitted",
        "attachments": data.attachments or [],
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    firestore_service.create_document("employee_daily_updates", update_doc)
    logger.info(f"Daily work update {doc_id} created by {emp_name} ({data.hours_worked} hrs)")

    return update_doc


@router.post("/upload-attachment", response_model=dict)
def upload_document_or_screenshot(
    data: AttachmentUploadRequest,
    current_user=Depends(get_current_user),
):
    """
    Req 13. Upload Documents / Screenshots.
    Accepts base64 document or screenshot image, creates verifiable attachment payload.
    """
    emp_id, emp_name, _ = _resolve_employee(current_user)
    attach_id = f"ATT-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
    now_iso = datetime.now(timezone.utc).isoformat()

    attachment_meta = {
        "id": attach_id,
        "file_name": data.file_name,
        "file_type": data.file_type,
        "data_url": data.data_url,
        "uploaded_by": emp_name,
        "uploaded_at": now_iso,
    }

    return {
        "attachment": attachment_meta,
        "message": f"File '{data.file_name}' uploaded successfully as proof of work.",
    }


# ============================================================================
# 14. View Task Feedback & 15. Resubmit Tasks
# ============================================================================

@router.get("/feedback", response_model=List[dict])
def get_task_feedback_list(current_user=Depends(get_current_user)):
    """
    Req 14. View Task Feedback.
    Returns all tasks that have feedback or rework notes from Team Leader.
    """
    tasks = get_my_assigned_tasks(current_user=current_user)
    reviewed_tasks = [
        t for t in tasks
        if t.get("feedback") or t.get("rework_notes") or t.get("status") in ("REWORK", "APPROVED")
    ]
    return reviewed_tasks


@router.post("/tasks/{task_id}/resubmit", response_model=dict)
def resubmit_task_after_rework(
    task_id: str,
    data: TaskResubmitRequest,
    current_user=Depends(get_current_user),
):
    """
    Req 15. Resubmit Tasks.
    When a task is returned for rework by the Team Leader, employee updates deliverables,
    attaches new proof screenshots, writes resubmission notes, and resubmits to TL review queue.
    """
    emp_id, emp_name, emp_email = _resolve_employee(current_user)
    task = firestore_service.get_document("project_tasks", task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

    now_iso = datetime.now(timezone.utc).isoformat()

    existing_attachments = task.get("attachments", []) or []
    new_attachments = existing_attachments + (data.attachments or [])

    # Update task status back to SUBMITTED
    task["status"] = "SUBMITTED"
    task["review_status"] = "PENDING"
    task["progress"] = data.progress or 100
    task["resubmission_notes"] = data.resubmission_notes.strip()
    task["attachments"] = new_attachments
    task["resubmitted_at"] = now_iso
    task["updated_at"] = now_iso

    # Append to review history if present
    history = task.get("history", []) or []
    history.append({
        "action": "RESUBMITTED",
        "by": emp_name,
        "timestamp": now_iso,
        "notes": data.resubmission_notes.strip(),
    })
    task["history"] = history

    firestore_service.update_document("project_tasks", task_id, task)

    # In-app notification for Team Leader
    tl_id = task.get("team_leader_id")
    if not tl_id and task.get("project_id"):
        proj = firestore_service.get_document("projects", task.get("project_id"))
        if proj:
            tl_id = proj.get("team_leader_id") or proj.get("team_leader")
    tl_id = tl_id or "TL-ALL"
    notif_id = f"NOTIF-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
    firestore_service.create_document("employee_notifications", {
        "id": notif_id,
        "recipient_id": tl_id,
        "type": "TASK_RESUBMISSION",
        "title": f"Task Resubmitted: {task.get('title')}",
        "message": f"{emp_name} has revised and resubmitted task '{task.get('title')}' for review.",
        "task_id": task_id,
        "is_read": False,
        "created_at": now_iso,
    })

    return _format_employee_task(task)


# ============================================================================
# 17. View Notifications
# ============================================================================

@router.get("/notifications", response_model=List[dict])
def get_employee_notifications(current_user=Depends(get_current_user)):
    """
    Req 17. View Notifications.
    Returns in-app notifications for task assignments, rework alerts, approvals, and deadlines.
    """
    emp_id, emp_name, emp_email = _resolve_employee(current_user)

    # Fetch stored notifications
    all_notifs = firestore_service.list_documents("employee_notifications") or []
    user_notifs = [
        n for n in all_notifs
        if str(n.get("recipient_id")) in (emp_id, emp_name.lower(), "all")
        or emp_name.lower() in str(n.get("recipient_name", "")).lower()
    ]

    # Dynamically generate contextual notifications from active tasks if empty
    tasks = get_my_assigned_tasks(current_user=current_user)
    dynamic_notifs = []
    now_iso = datetime.now(timezone.utc).isoformat()

    for t in tasks:
        if t["status"] == "REWORK":
            dynamic_notifs.append({
                "id": f"dyn-rework-{t['id']}",
                "type": "REWORK_ALERT",
                "title": f"Rework Requested: {t['title']}",
                "message": t["rework_notes"] or "Team Leader requested corrections. Please review and resubmit.",
                "task_id": t["id"],
                "urgency": "critical",
                "is_read": False,
                "created_at": t.get("updated_at") or now_iso,
            })
        elif t["status"] == "APPROVED":
            dynamic_notifs.append({
                "id": f"dyn-approved-{t['id']}",
                "type": "TASK_APPROVED",
                "title": f"Task Approved: {t['title']}",
                "message": t["feedback"] or "Your task deliverable has been approved with distinction.",
                "task_id": t["id"],
                "urgency": "success",
                "is_read": True,
                "created_at": t.get("updated_at") or now_iso,
            })
        elif t["is_overdue"]:
            dynamic_notifs.append({
                "id": f"dyn-overdue-{t['id']}",
                "type": "DEADLINE_ALERT",
                "title": f"Overdue Task: {t['title']}",
                "message": f"Task was due on {t['deadline']}. Please submit deliverables urgently.",
                "task_id": t["id"],
                "urgency": "warning",
                "is_read": False,
                "created_at": now_iso,
            })

    combined = user_notifs + dynamic_notifs
    combined.sort(key=lambda x: (x.get("is_read", False), str(x.get("created_at") or "")), reverse=True)
    return combined


@router.patch("/notifications/{notification_id}/read", response_model=dict)
def mark_notification_read(notification_id: str, current_user=Depends(get_current_user)):
    """
    Req 17. Mark notification as read.
    """
    notif = firestore_service.get_document("employee_notifications", notification_id)
    if notif:
        notif["is_read"] = True
        firestore_service.update_document("employee_notifications", notification_id, notif)
    return {"id": notification_id, "is_read": True}


# ============================================================================
# 18. View My Performance
# ============================================================================

@router.get("/my-performance", response_model=dict)
def get_my_performance_scorecard(current_user=Depends(get_current_user)):
    """
    Req 18. View My Performance.
    Calculates personal completion rate, on-time delivery %, rework rate %, total hours, and velocity rating.
    """
    emp_id, emp_name, _ = _resolve_employee(current_user)
    tasks = get_my_assigned_tasks(current_user=current_user)
    daily_logs = list_my_daily_work_updates(current_user=current_user)

    total_tasks = len(tasks)
    approved_tasks = sum(1 for t in tasks if t["status"] == "APPROVED")
    in_progress_tasks = sum(1 for t in tasks if t["status"] in ("TODO", "IN_PROGRESS"))
    submitted_tasks = sum(1 for t in tasks if t["status"] == "SUBMITTED")
    rework_tasks = sum(1 for t in tasks if t["status"] == "REWORK")

    # On-time delivery calculation
    on_time_count = 0
    for t in tasks:
        if t["status"] == "APPROVED" and not t["is_overdue"]:
            on_time_count += 1

    completion_rate = round((approved_tasks / total_tasks * 100), 1) if total_tasks > 0 else 100.0
    on_time_rate = round((on_time_count / approved_tasks * 100), 1) if approved_tasks > 0 else 100.0
    rework_rate = round((rework_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    total_hours = sum(float(log.get("hours_worked", 0.0)) for log in daily_logs)

    # Velocity and rating title
    if completion_rate >= 80 and rework_rate <= 15:
        badge = "Top Performer"
        rating_score = 9.6
    elif completion_rate >= 60:
        badge = "Exceeds Expectations"
        rating_score = 8.8
    else:
        badge = "Consistent Contributor"
        rating_score = 8.0

    return {
        "employee_name": emp_name,
        "employee_id": emp_id,
        "total_tasks": total_tasks,
        "approved_tasks": approved_tasks,
        "in_progress_tasks": in_progress_tasks,
        "submitted_tasks": submitted_tasks,
        "rework_tasks": rework_tasks,
        "completion_rate": completion_rate,
        "on_time_rate": on_time_rate,
        "rework_rate": rework_rate,
        "total_hours_logged": round(total_hours, 1),
        "velocity_score": rating_score,
        "performance_badge": badge,
        "recent_tasks": tasks[:5],
    }

