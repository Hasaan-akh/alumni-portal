const set = (id, text) => document.getElementById(id).textContent = text || "";

function addLink(box, label, url) {
  if (!url || !/^https?:\/\//i.test(url)) return;
  const a = document.createElement("a");
  a.href = url;
  a.textContent = label;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  if (box.childNodes.length) box.appendChild(document.createTextNode("  |  "));
  box.appendChild(a);
}

async function reportProfile(id) {
  const reason = prompt("Why are you reporting this profile? (5 to 500 characters)");
  if (reason === null) return;
  const r = reason.trim();
  if (r.length < 5 || r.length > 500) {
    alert("The reason must be between 5 and 500 characters.");
    return;
  }
  const { error } = await db.from("reports").insert({ target_profile_id: id, reason: r });
  if (error) {
    alert(error.code === "23505"
      ? "You have already reported this profile."
      : "Could not send the report: " + error.message);
  } else {
    alert("Thank you. The admin will review it.");
  }
}

async function init() {
  const me = await requireAccess("verified");
  if (!me) return;

  const id = new URLSearchParams(location.search).get("id");
  if (!id) { location.href = "directory.html"; return; }

  const { data, error } = await db.from("profiles")
    .select("full_name, batch, graduation_year, job_title, company, skills, bio, linkedin, github, profile_picture")
    .eq("id", id).single();

  if (error || !data) { set("name", "Profile not found."); return; }

  set("name", data.full_name);
  set("batchYear", "Batch " + (data.batch || "-") + ", graduated " + (data.graduation_year || "-"));
  set("work", [data.job_title, data.company].filter(Boolean).join(" at "));
  set("skills", data.skills ? "Skills: " + data.skills : "");
  set("bio", data.bio);

  const links = document.getElementById("links");
  addLink(links, "LinkedIn", data.linkedin);
  addLink(links, "GitHub", data.github);

  if (data.profile_picture && data.profile_picture.startsWith("http")) {
    const img = document.getElementById("avatar");
    img.src = data.profile_picture;
    img.hidden = false;
  }

  if (id === me.id) {
    document.getElementById("editLink").hidden = false;
  } else {
    const btn = document.getElementById("reportBtn");
    btn.hidden = false;
    btn.onclick = () => reportProfile(id);
  }
}

init();