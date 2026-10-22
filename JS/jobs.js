const PAGE_SIZE = 20;
let page = 0;
let me = null;

const val = (id) => document.getElementById(id).value.trim();

function clean(text) {
  return text.replace(/[,()%*\\]/g, " ").trim();
}

function el(tag, text) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  return e;
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString();
}

// ---------- Explore jobs ----------

function buildJobCard(j) {
  const card = el("div");
  card.appendChild(el("h3", j.title));

  const where = j.location ? " (" + j.location + ")" : "";
  card.appendChild(el("p", j.company + where));

  const details = ["Experience: " + j.experience];
  if (j.job_type) details.push(j.job_type);
  card.appendChild(el("p", details.join(" | ")));

  if (j.description) card.appendChild(el("p", j.description));
  if (j.skills) card.appendChild(el("p", "Skills: " + j.skills));

  const poster = j.profiles && j.profiles.full_name ? j.profiles.full_name : "an alumnus";
  card.appendChild(el("small", "Posted by " + poster + " on " + formatDate(j.created_at)));

  const apply = el("p");
  if (j.apply_email) {
    const a = el("a", "Email your CV: " + j.apply_email);
    a.href = "mailto:" + j.apply_email;
    apply.appendChild(a);
    apply.appendChild(document.createTextNode("  "));
  }
  if (j.apply_link && /^https?:\/\//i.test(j.apply_link)) {
    const a = el("a", "Apply online");
    a.href = j.apply_link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    apply.appendChild(a);
  }
  card.appendChild(apply);

  if (j.posted_by !== me.id) {
    const report = el("button", "Report");
    report.onclick = () => reportJob(j.id);
    card.appendChild(report);
  }
  if (me.role === "admin") {
    const del = el("button", "Delete (admin)");
    del.onclick = () => deleteJob(j.id, true);
    card.appendChild(del);
  }

  return card;
}

async function loadJobs(reset) {
  const list = document.getElementById("jobList");
  const moreBtn = document.getElementById("moreBtn");

  if (reset) { page = 0; list.textContent = ""; }
  setText("status", "Loading...");
  moreBtn.hidden = true;

  let query = db.from("jobs")
    .select("id, title, company, experience, job_type, location, description, skills, apply_email, apply_link, created_at, posted_by, profiles(full_name)")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const keyword = clean(val("f_keyword"));
  const type = val("f_type");
  const location = clean(val("f_location"));

  if (keyword) {
    query = query.or(
      "title.ilike.%" + keyword + "%,company.ilike.%" + keyword + "%,skills.ilike.%" + keyword + "%"
    );
  }
  if (type) query = query.eq("job_type", type);
  if (location) query = query.ilike("location", "%" + location + "%");

  const { data, error } = await query;
  if (error) { setText("status", "Error: " + error.message); return; }

  data.forEach(j => list.appendChild(buildJobCard(j)));
  setText("status", list.children.length === 0 ? "No jobs found." : "");
  moreBtn.hidden = data.length < PAGE_SIZE;
}

async function reportJob(jobId) {
  const reason = prompt("Why are you reporting this job? (5 to 500 characters)");
  if (reason === null) return;
  const r = reason.trim();
  if (r.length < 5 || r.length > 500) {
    alert("The reason must be between 5 and 500 characters.");
    return;
  }
  const { error } = await db.from("reports").insert({ target_job_id: jobId, reason: r });
  if (error) {
    alert(error.code === "23505"
      ? "You have already reported this job."
      : "Could not send the report: " + error.message);
  } else {
    alert("Thank you. The admin will review it.");
  }
}

async function deleteJob(jobId, isAdminAction) {
  const text = isAdminAction ? "Delete this job as admin?" : "Delete this job permanently?";
  if (!confirm(text)) return;
  const { error } = await db.from("jobs").delete().eq("id", jobId);
  if (error) return alert("Could not delete: " + error.message);
  loadJobs(true);
  loadMyJobs();
}

// ---------- Post a job ----------

function validateJob() {
  const title = val("j_title");
  const company = val("j_company");
  const experience = val("j_experience");
  const email = val("j_email");
  const link = val("j_link");

  if (title.length < 3 || title.length > 150) return "Job title must be 3 to 150 characters.";
  if (company.length < 2 || company.length > 150) return "Company must be 2 to 150 characters.";
  if (!experience || experience.length > 100) return "Experience is required (up to 100 characters).";
  if (val("j_location").length > 100) return "Location must be 100 characters or fewer.";
  if (!email && !link) return "Give an email, an application link, or both.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Please enter a valid email address.";
  if (link && !/^https?:\/\//i.test(link)) return "The link must start with http:// or https://";
  return null;
}

async function postJob(e) {
  e.preventDefault();
  setText("postMessage", "");

  const problem = validateJob();
  if (problem) return setText("postMessage", problem);

  const btn = document.getElementById("postBtn");
  btn.disabled = true;

  const { error } = await db.from("jobs").insert({
    title: val("j_title"),
    company: val("j_company"),
    experience: val("j_experience"),
    job_type: val("j_type") || null,
    location: val("j_location") || null,
    skills: val("j_skills") || null,
    description: val("j_description") || null,
    apply_email: val("j_email") || null,
    apply_link: val("j_link") || null
  });

  btn.disabled = false;
  if (error) return setText("postMessage", "Could not post the job: " + error.message);

  document.getElementById("postForm").reset();
  setText("postMessage", "Job posted.");
  loadJobs(true);
  loadMyJobs();
}

// ---------- My listings ----------

async function loadMyJobs() {
  const box = document.getElementById("myJobs");
  box.textContent = "";

  const { data, error } = await db.from("jobs")
    .select("id, title, company, is_active, created_at")
    .eq("posted_by", me.id)
    .order("created_at", { ascending: false });

  if (error) return setText("myStatus", "Error: " + error.message);
  setText("myStatus", data.length === 0 ? "You have not posted any jobs yet." : "");

  data.forEach(j => {
    const row = el("div");
    row.appendChild(el("span",
      j.title + " at " + j.company + " | " + formatDate(j.created_at) +
      " | " + (j.is_active ? "Open" : "Closed") + " "));

    const toggle = el("button", j.is_active ? "Close" : "Reopen");
    toggle.onclick = async () => {
      const { error } = await db.from("jobs")
        .update({ is_active: !j.is_active }).eq("id", j.id);
      if (error) alert("Could not update: " + error.message);
      loadJobs(true);
      loadMyJobs();
    };

    const del = el("button", "Delete");
    del.onclick = () => deleteJob(j.id, false);

    row.append(toggle, del);
    box.appendChild(row);
  });
}

// ---------- Start ----------

async function init() {
  me = await requireAccess("verified");
  if (!me) return;

  if (me.role === "admin") document.getElementById("adminLink").hidden = false;

  document.getElementById("filterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    loadJobs(true);
  });
  document.getElementById("clearBtn").addEventListener("click", () => {
    document.getElementById("filterForm").reset();
    loadJobs(true);
  });
  document.getElementById("moreBtn").addEventListener("click", () => {
    page++;
    loadJobs(false);
  });
  document.getElementById("postForm").addEventListener("submit", postJob);

  loadJobs(true);
  loadMyJobs();
}

init();