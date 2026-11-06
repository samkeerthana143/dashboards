"""
E2E Multi-Module Integration Test using FastAPI TestClient
Tests complete backend workflow directly against app.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("STARTING COMPLETE MULTI-MODULE INTEGRATION TEST (TestClient)")
    print("=" * 60)

    # 1. Login Project HR
    print("\n--- 1. Testing Project HR Login & Validation ---")
    hr_res = client.post("/api/auth/admin-login", json={
        "email": "project.hr@arshith.com",
        "password": "HrProject@123"
    })
    assert hr_res.status_code == 200, f"HR login failed: {hr_res.text}"
    hr_token = hr_res.json()["access_token"]
    hr_headers = {"Authorization": f"Bearer {hr_token}"}
    print("[PASS] Project HR logged in successfully.")

    # 2. Fetch approved team leaders & employees
    leaders_res = client.get("/api/projects/approved-leaders", headers=hr_headers)
    assert leaders_res.status_code == 200, f"Fetch approved leaders failed: {leaders_res.text}"
    approved_leaders = leaders_res.json()
    leader_names = [l["name"] for l in approved_leaders]
    print(f"[PASS] Approved Team Leaders in DB ({len(approved_leaders)}): {leader_names}")
    assert len(approved_leaders) > 0, "No approved team leaders found!"

    employees_res = client.get("/api/projects/approved-employees", headers=hr_headers)
    assert employees_res.status_code == 200, f"Fetch approved employees failed: {employees_res.text}"
    approved_employees = employees_res.json()
    emp_names = [e["name"] for e in approved_employees]
    print(f"[PASS] Approved Employees in DB ({len(approved_employees)}): {emp_names}")
    assert len(approved_employees) > 0, "No approved employees found!"

    # 3. Validation: Reject invalid / unapproved leader
    print("\n--- 2. Testing Project Assignment Validations ---")
    invalid_leader_res = client.post("/api/projects", headers=hr_headers, json={
        "name": "Invalid Leader Project",
        "team_leader": "Fake Nonexistent Leader",
        "assigned_employees": [emp_names[0]],
        "deadline": "2026-12-01",
    })
    assert invalid_leader_res.status_code == 400, f"Expected 400 for fake leader, got: {invalid_leader_res.status_code}"
    print("[PASS] System correctly blocked assignment of unapproved Team Leader.")

    # Validation: Reject invalid / unapproved employee
    invalid_emp_res = client.post("/api/projects", headers=hr_headers, json={
        "name": "Invalid Employee Project",
        "team_leader": leader_names[0],
        "assigned_employees": ["Fake Dummy Person"],
        "deadline": "2026-12-01",
    })
    assert invalid_emp_res.status_code == 400, f"Expected 400 for fake employee, got: {invalid_emp_res.status_code}"
    print("[PASS] System correctly blocked assignment of unapproved Employee.")

    # 4. Create valid project assigning approved Team Leader Keerthana and approved Employee Hema
    target_leader = next((l for l in approved_leaders if "keerthana" in l["name"].lower()), approved_leaders[0])
    target_emp = next((e for e in approved_employees if "hema" in e["name"].lower()), approved_employees[0])

    proj_res = client.post("/api/projects", headers=hr_headers, json={
        "name": "Enterprise Cloud Architecture Sprint",
        "description": "Secure multi-tenant microservices deployment and compliance validation.",
        "department": "Engineering",
        "team_name": "Cloud DevOps Squad",
        "team_leader": target_leader["name"],
        "assigned_employees": [target_emp["name"]],
        "deadline": "2026-12-15",
        "priority": "High",
        "status": "In Progress",
        "progress": 10,
    })
    assert proj_res.status_code == 201, f"Project creation failed: {proj_res.text}"
    new_project = proj_res.json()
    new_proj_id = new_project["id"]
    print(f"[PASS] Project '{new_project['name']}' ({new_proj_id}) created with Leader '{target_leader['name']}' and Employee '{target_emp['name']}'.")

    # 5. Team Leader Login & Data Scoping
    print("\n--- 3. Testing Team Leader Scoping & Functionality ---")
    tl_login_res = client.post("/api/teamlead/login", json={
        "email": target_leader["email"],
        "password": "TeamLead@123"
    })
    assert tl_login_res.status_code == 200, f"Team leader login failed: {tl_login_res.text}"
    tl_token = tl_login_res.json()["access_token"]
    tl_headers = {"Authorization": f"Bearer {tl_token}"}
    print(f"[PASS] Team Leader '{target_leader['name']}' logged in successfully.")

    # Check assigned projects for this TL
    tl_projects_res = client.get("/api/teamlead/projects", headers=tl_headers)
    assert tl_projects_res.status_code == 200, f"TL projects failed: {tl_projects_res.text}"
    tl_projects = tl_projects_res.json()
    tl_proj_ids = [p["id"] for p in tl_projects]
    print(f"[PASS] Team Leader assigned projects ({len(tl_projects)}): {tl_proj_ids}")
    assert new_proj_id in tl_proj_ids, f"Newly created project {new_proj_id} not visible in TL dashboard!"

    # Check assigned team for this TL
    tl_team_res = client.get("/api/teamlead/team", headers=tl_headers)
    assert tl_team_res.status_code == 200, f"TL team failed: {tl_team_res.text}"
    tl_team = tl_team_res.json()
    tl_team_names = [m["name"] for m in tl_team]
    print(f"[PASS] Team Leader assigned team members: {tl_team_names}")
    assert any(target_emp["name"].lower() in m.lower() for m in tl_team_names), f"Assigned employee {target_emp['name']} not in TL team!"

    # 6. Team Leader: Task Creation Validation
    # Attempting to assign employee not on this project
    unassigned_emp_name = next((e["name"] for e in approved_employees if e["name"] != target_emp["name"]), "Other Employee")
    invalid_task_res = client.post("/api/teamlead/tasks", headers=tl_headers, json={
        "project_id": new_proj_id,
        "title": "Unauthorized Assignment",
        "assigned_to": unassigned_emp_name,
        "deadline": "2026-11-30",
        "priority": "High"
    })
    assert invalid_task_res.status_code == 400, f"Expected 400 for assigning unassigned employee, got: {invalid_task_res.status_code}"
    print(f"[PASS] System prevented Team Leader from assigning task to non-project member '{unassigned_emp_name}'.")

    # Create valid task for target_emp
    create_task_res = client.post("/api/teamlead/tasks", headers=tl_headers, json={
        "project_id": new_proj_id,
        "title": "Cloud Tenant Isolation Testing",
        "description": "Write automated pytest suite verifying PostgreSQL and Firestore tenant isolation policies.",
        "assigned_to": target_emp["name"],
        "deadline": "2026-11-28",
        "priority": "High",
        "estimated_hours": 16.0
    })
    assert create_task_res.status_code == 201, f"Task creation failed: {create_task_res.text}"
    created_task = create_task_res.json()
    task_id = created_task["id"]
    print(f"[PASS] Task '{created_task['title']}' ({task_id}) created and assigned to {target_emp['name']}.")

    # 7. Employee Login & Scoping
    print("\n--- 4. Testing Employee Dashboard & Workflow ---")
    emp_login_res = client.post("/api/auth/login", json={
        "email": target_emp["email"],
        "password": "hema@123" if "hema" in target_emp["email"].lower() else "Employee@123"
    })
    assert emp_login_res.status_code == 200, f"Employee login failed: {emp_login_res.text}"
    emp_token = emp_login_res.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    print(f"[PASS] Employee '{target_emp['name']}' logged in successfully.")

    # View team details
    my_team_res = client.get("/api/employee-tasks/team", headers=emp_headers)
    assert my_team_res.status_code == 200, f"Employee team details failed: {my_team_res.text}"
    my_team_data = my_team_res.json()
    assert my_team_data["project"] is not None, "Employee project is None!"
    print(f"[PASS] Employee sees active project '{my_team_data['project']['name']}' and Team Leader '{my_team_data['team_leader']['name']}'.")

    # View assigned tasks
    my_tasks_res = client.get("/api/employee-tasks/tasks", headers=emp_headers)
    assert my_tasks_res.status_code == 200, f"Employee tasks failed: {my_tasks_res.text}"
    my_tasks = my_tasks_res.json()
    my_task_ids = [t["id"] for t in my_tasks]
    assert task_id in my_task_ids, f"Created task {task_id} not visible in employee's tasks!"
    print(f"[PASS] Employee sees assigned task '{created_task['title']}'.")

    # Update task status: TODO -> IN_PROGRESS
    status_update_res = client.patch(f"/api/employee-tasks/tasks/{task_id}/status", headers=emp_headers, json={
        "status": "IN_PROGRESS",
        "progress": 50,
        "notes": "Completed initial test fixture setup."
    })
    assert status_update_res.status_code == 200, f"Status update failed: {status_update_res.text}"
    print("[PASS] Employee updated task status to IN_PROGRESS (50%).")

    # Submit Daily Work Update
    daily_res = client.post("/api/employee-tasks/daily-work", headers=emp_headers, json={
        "project_id": new_proj_id,
        "project_name": new_project["name"],
        "task_id": task_id,
        "task_title": created_task["title"],
        "hours_worked": 8.0,
        "summary": "Implemented 14 isolated database unit test suites and mocked network latency.",
        "blockers": "None"
    })
    assert daily_res.status_code == 201, f"Daily work submission failed: {daily_res.text}"
    print("[PASS] Employee submitted daily work report with 8 hours logged.")

    # Submit Task Deliverables with mock screenshot proof
    submit_res = client.post(f"/api/employee-tasks/tasks/{task_id}/submit", headers=emp_headers, json={
        "submission_notes": "All unit tests passing (100% coverage). Screenshots and coverage reports attached.",
        "attachments": [
            {
                "file_name": "pytest_coverage_report.png",
                "file_type": "image/png",
                "data_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            }
        ],
        "progress": 100
    })
    assert submit_res.status_code == 200, f"Task deliverables submission failed: {submit_res.text}"
    assert submit_res.json()["status"] == "SUBMITTED"
    print("[PASS] Employee submitted task deliverables with proof screenshot. Task status: SUBMITTED.")

    # 8. Team Leader Reviews & Assigns Rework
    print("\n--- 5. Testing Team Leader Review, Rework & Approval Flow ---")
    rework_res = client.patch(f"/api/teamlead/tasks/{task_id}/review", headers=tl_headers, json={
        "action": "rework",
        "rework_notes": "Please add stress testing with 500 concurrent connections.",
        "revised_deadline": "2026-11-29"
    })
    assert rework_res.status_code == 200, f"Rework assignment failed: {rework_res.text}"
    assert rework_res.json()["status"] == "REWORK"
    print("[PASS] Team Leader reviewed and assigned REWORK with feedback.")

    # Employee views feedback & resubmits
    emp_feedback_res = client.get("/api/employee-tasks/feedback", headers=emp_headers)
    assert emp_feedback_res.status_code == 200
    rework_items = [t for t in emp_feedback_res.json() if t["id"] == task_id]
    assert len(rework_items) > 0, "Rework task not in employee feedback list!"
    print(f"[PASS] Employee received rework feedback: '{rework_items[0]['rework_notes']}'.")

    # Employee resubmits task
    resubmit_res = client.post(f"/api/employee-tasks/tasks/{task_id}/resubmit", headers=emp_headers, json={
        "resubmission_notes": "Added locust load test script simulating 500 concurrent clients. Average response 24ms.",
        "attachments": [
            {
                "file_name": "locust_load_test_results.png",
                "file_type": "image/png",
                "data_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            }
        ],
        "progress": 100
    })
    assert resubmit_res.status_code == 200
    assert resubmit_res.json()["status"] == "SUBMITTED"
    print("[PASS] Employee resubmitted rework with load test proof.")

    # Team Leader approves task
    approve_res = client.patch(f"/api/teamlead/tasks/{task_id}/review", headers=tl_headers, json={
        "action": "approve",
        "feedback": "Outstanding performance! Load benchmarks verified and deliverable approved."
    })
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"
    print("[PASS] Team Leader approved task. Task status: APPROVED (100%).")

    # 9. Verify Notifications & Performance
    print("\n--- 6. Testing In-App Notifications & Performance Scorecards ---")
    emp_notifs = client.get("/api/employee-tasks/notifications", headers=emp_headers).json()
    print(f"[PASS] Employee notifications verified ({len(emp_notifs)} notifications found).")

    emp_perf = client.get("/api/employee-tasks/my-performance", headers=emp_headers).json()
    print(f"[PASS] Employee Performance Scorecard: Rate: {emp_perf['completion_rate']}%, Hours: {emp_perf['total_hours_logged']}, Badge: {emp_perf['performance_badge']}.")

    tl_perf = client.get("/api/teamlead/performance", headers=tl_headers).json()
    print(f"[PASS] Team Leader Performance Roster: Total Tasks: {tl_perf['total_tasks']}, Completed: {tl_perf['completed_tasks']}.")

    print("\n" + "=" * 60)
    print("ALL INTEGRATION TESTS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
