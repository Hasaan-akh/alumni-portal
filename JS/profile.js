async function init() {
  const me = await requireAccess("verified");
  if (!me) return;   

}

init();
async function init() {
  const me = await requireAccess("verified");
  if (!me) return;

  const id = new URLSearchParams(location.search).get("id");
  if (!id) { location.href = "directory.html"; return; }

  const { data, error } = await db.from("profiles")
    .select("full_name, batch, graduation_year, job_title, company, skills, bio, linkedin, github")
    .eq("id", id).single();

  if (error || !data) {
    document.getElementById("name").textContent = "Profile not found.";
    return;
  }

  const set = (el, text) => document.getElementById(el).textContent = text || "";
  set("name", data.full_name);
  set("batchYear", "Batch " + (data.batch || "-") + ", graduated " + (data.graduation_year || "-"));
  set("work", [data.job_title, data.company].filter(Boolean).join(" at "));
  set("skills", data.skills ? "Skills: " + data.skills : "");
  set("bio", data.bio);
  set("links", [data.linkedin, data.github].filter(Boolean).join("  |  "));
if (data.profile_picture) document.getElementById("avatar").src = data.profile_picture;
}

init();