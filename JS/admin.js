function el(tag, text) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  return e;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString();
}

function refreshAll() {
  loadPending();
  loadReports();
  loadUsers();
}

async function removeUser(id, name) {
  if (!confirm("Remove " + name + "? This deletes their account, jobs and reports.")) return;
  const { error } = await db.rpc("admin_remove_user", { target: id });
  if (error) alert(error.message);
  refreshAll();
}

// ---------- Pending users ----------

async function loadPending() {
  const list = document.getElementById("pendingList");
  const { data, error } = await db.rpc("admin_pending_users");
  if (error) { list.textContent = "Error: " + error.message; return; }

  document.getElementById("pendingTitle").textContent = "Pending users (" + data.length + ")";
  list.textContent = "";
  if (!data.length) { list.textContent = "No pending users."; return; }

  data.forEach(u => {
    const row = el("div");
    row.appendChild(el("span",
      u.full_name + " | " + u.email + " | Batch " + (u.batch || "-") +
      " | " + (u.graduation_year || "-") + " | Enrollment " + (u.enrollment_no || "-") + " "));

    const verify = el("button", "Verify");
    verify.onclick = async () => {
      const { error } = await db.rpc("admin_verify_user", { target: u.id });
      if (error) alert(error.message);
      refreshAll();
    };

    const remove = el("button", "Remove");
    remove.onclick = () => removeUser(u.id, u.full_name);

    row.append(verify, remove);
    list.appendChild(row);
  });
}

// ---------- Reports ----------

async function setReportStatus(id, status) {
  const { error } = await db.rpc("admin_set_report_status", { report: id, new_status: status });
  if (error) alert(error.message);
  loadReports();
}

async function deleteJob(id) {
  if (!confirm("Delete this job permanently?")) return;
  const { error } = await db.from("jobs").delete().eq("id", id);
  if (error) alert("Could not delete: " + error.message);
  refreshAll();
}

async function loadReports() {
  const list = document.getElementById("reportList");
  const { data, error } = await db.rpc("admin_reports");
  if (error) { list.textContent = "Error: " + error.message; return; }

  const open = data.filter(r => r.status === "open").length;
  document.getElementById("reportTitle").textContent = "Reports (" + open + " open)";
  list.textContent = "";
  if (!data.length) { list.textContent = "No reports."; return; }

  data.forEach(r => {
    const row = el("div");
    const what = (r.target_type === "profile" ? "Profile: " : "Job: ") +
      (r.target_name || "(deleted)") + (r.target_company ? " at " + r.target_company : "");
    row.appendChild(el("span",
      "[" + r.status + "] " + what + " | Reason: " + r.reason +
      " | Reported by " + r.reporter_name + " on " + formatDate(r.created_at) + " "));

    if (r.status === "open") {
      const resolve = el("button", "Resolve");
      resolve.onclick = () => setReportStatus(r.id, "resolved");
      const dismiss = el("button", "Dismiss");
      dismiss.onclick = () => setReportStatus(r.id, "dismissed");
      row.append(resolve, dismiss);
    } else {
      const reopen = el("button", "Reopen");
      reopen.onclick = () => setReportStatus(r.id, "open");
      row.appendChild(reopen);
    }

    if (r.target_type === "profile") {
      const view = el("a", "View profile");
      view.href = "profile.html?id=" + encodeURIComponent(r.target_id);
      const remove = el("button", "Remove user");
      remove.onclick = () => removeUser(r.target_id, r.target_name || "this user");
      row.append(document.createTextNode(" "), view, remove);
    } else {
      const del = el("button", "Delete job");
      del.onclick = () => deleteJob(r.target_id);
      row.appendChild(del);
    }

    list.appendChild(row);
  });
}

// ---------- All users ----------

async function loadUsers() {
  const list = document.getElementById("userList");
  const { data, error } = await db.rpc("admin_all_users");
  if (error) { list.textContent = "Error: " + error.message; return; }

  document.getElementById("usersTitle").textContent = "All users (" + data.length + ")";
  list.textContent = "";
  if (!data.length) { list.textContent = "No users."; return; }

  data.forEach(u => {
    const row = el("div");
    row.appendChild(el("span",
      u.full_name + " | " + u.email + " | " + u.role +
      " | " + (u.is_verified ? "Verified" : "Pending") +
      " | Batch " + (u.batch || "-") + " | " + (u.graduation_year || "-") +
      " | Enrollment " + (u.enrollment_no || "-") + " "));

    if (u.role !== "admin") {
      const remove = el("button", "Remove");
      remove.onclick = () => removeUser(u.id, u.full_name);
      row.appendChild(remove);
    }
    list.appendChild(row);
  });
}

async function init() {
  const me = await requireAccess("admin");
  if (!me) return;
  refreshAll();
}

init();