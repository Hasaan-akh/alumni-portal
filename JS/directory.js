const PAGE_SIZE = 20;
let page = 0;

const val = (id) => document.getElementById(id).value.trim();

// Remove characters that have a special meaning inside a search filter
function clean(text) {
  return text.replace(/[,()%*\\]/g, " ").trim();
}

function el(tag, text) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  return e;
}

function buildCard(p) {
  const card = el("div");

  if (p.profile_picture && p.profile_picture.startsWith("http")) {
    const img = el("img");
    img.src = p.profile_picture;
    img.alt = "";
    img.width = 60;
    card.appendChild(img);
  }

  const link = el("a", p.full_name);
  link.href = "profile.html?id=" + encodeURIComponent(p.id);
  const heading = el("h3");
  heading.appendChild(link);
  card.appendChild(heading);

  card.appendChild(el("p", "Batch " + (p.batch || "-") + ", graduated " + (p.graduation_year || "-")));

  const work = [p.job_title, p.company].filter(Boolean).join(" at ");
  if (work) card.appendChild(el("p", work));
  if (p.skills) card.appendChild(el("p", "Skills: " + p.skills));

  return card;
}

async function loadProfiles(reset) {
  const list = document.getElementById("results");
  const status = document.getElementById("status");
  const moreBtn = document.getElementById("moreBtn");

  if (reset) { page = 0; list.textContent = ""; }
  status.textContent = "Loading...";
  moreBtn.hidden = true;

  let query = db.from("profiles")
    .select("id, full_name, batch, graduation_year, job_title, company, skills, profile_picture")
    .eq("is_verified", true)
    .order("full_name", { ascending: true })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const name = clean(val("f_name"));
  const batch = clean(val("f_batch"));
  const year = Number(val("f_year"));
  const work = clean(val("f_work"));

  if (name) query = query.ilike("full_name", "%" + name + "%");
  if (batch) query = query.ilike("batch", "%" + batch + "%");
  if (Number.isInteger(year) && year > 0) query = query.eq("graduation_year", year);
  if (work) {
    query = query.or(
      "company.ilike.%" + work + "%,job_title.ilike.%" + work + "%,skills.ilike.%" + work + "%"
    );
  }

  const { data, error } = await query;
  if (error) { status.textContent = "Error: " + error.message; return; }

  data.forEach(p => list.appendChild(buildCard(p)));

  if (list.children.length === 0) status.textContent = "No alumni found.";
  else status.textContent = "";

  moreBtn.hidden = data.length < PAGE_SIZE;
}

async function init() {
  const me = await requireAccess("verified");
  if (!me) return;

  if (me.role === "admin") document.getElementById("adminLink").hidden = false;

  document.getElementById("filterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    loadProfiles(true);
  });

  document.getElementById("clearBtn").addEventListener("click", () => {
    document.getElementById("filterForm").reset();
    loadProfiles(true);
  });

  document.getElementById("moreBtn").addEventListener("click", () => {
    page++;
    loadProfiles(false);
  });

  loadProfiles(true);
}

init();