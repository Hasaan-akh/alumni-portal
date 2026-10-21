async function init() {
  const me = await requireAccess("admin");
  if (!me) return;   

  
}

init();
function el(tag, text) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  return e;
}

async function loadPending() {
  const list = document.getElementById("pendingList");
  list.textContent = "Loading...";

  const { data, error } = await db.rpc("admin_pending_users");
  if (error) { list.textContent = "Error: " + error.message; return; }
  if (!data.length) { list.textContent = "No pending users."; return; }

  list.textContent = "";
  data.forEach(u => {
    const row = el("div");
    row.appendChild(el("span",
      u.full_name + " | " + u.email + " | Batch " + (u.batch || "-") +
      " | " + (u.graduation_year || "-") + " | Enrollment " + (u.enrollment_no || "-") + " "));

    const verify = el("button", "Verify");
    verify.onclick = async () => {
      const { error } = await db.rpc("admin_verify_user", { target: u.id });
      if (error) alert(error.message);
      loadPending();
    };

    const remove = el("button", "Remove");
    remove.onclick = async () => {
      if (!confirm("Remove " + u.full_name + "? This deletes their account.")) return;
      const { error } = await db.rpc("admin_remove_user", { target: u.id });
      if (error) alert(error.message);
      loadPending();
    };

    row.append(verify, remove);
    list.appendChild(row);
  });
}

async function init() {
  const me = await requireAccess("admin");
  if (!me) return;
  loadPending();
}

init();