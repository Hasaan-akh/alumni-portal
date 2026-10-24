const fields = ["full_name", "batch", "graduation_year", "job_title",
                "company", "skills", "bio", "linkedin", "github"];
const optionalFields = [
  ["job_title", "Job title"],
  ["company", "Company"],
  ["skills", "Skills"],
  ["bio", "Bio"],
  ["linkedin", "LinkedIn"],
  ["github", "GitHub"]
];

function showMessage(text) {
  document.getElementById("message").textContent = text;
}

async function uploadAvatar(me) {
  const file = document.getElementById("avatarFile").files[0];
  if (!file) {
    showMessage("Choose a picture first.");
    return false;
  }

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    showMessage("Only JPG, PNG or WebP pictures are allowed.");
    return false;
  }
  if (file.size > 2 * 1024 * 1024) {
    showMessage("Picture must be under 2 MB.");
    return false;
  }

  const path = me.id + "/avatar";
  const { error: upErr } = await db.storage.from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) {
    showMessage("Upload failed: " + upErr.message);
    return false;
  }

  const { data } = db.storage.from("avatars").getPublicUrl(path);
  const url = data.publicUrl + "?t=" + Date.now();

  const { error } = await db.from("profiles").update({ profile_picture: url }).eq("id", me.id);
  if (error) {
    showMessage("Could not save picture: " + error.message);
    return false;
  }

  const avatar = document.getElementById("avatarImg");
  avatar.src = url;
  avatar.hidden = false;
  showMessage("Picture updated.");
  return true;
}

async function init() {
  const me = await requireAccess("login");
  if (!me) return;
  let hasProfilePicture = false;

  const restrictedDestination = me.is_verified ? "directory.html" : "pending.html";
  document.getElementById("directoryLink").href = restrictedDestination;
  document.getElementById("jobsLink").href = me.is_verified ? "jobs.html" : "pending.html";
  document.getElementById("backLink").href = restrictedDestination;

  const { data, error } = await db.from("profiles")
    .select(fields.join(", ") + ", profile_picture").eq("id", me.id).single();
  if (error) return showMessage(error.message);
  fields.forEach(f => document.getElementById(f).value = data[f] ?? "");
  if (data.profile_picture) {
    const avatar = document.getElementById("avatarImg");
    avatar.src = data.profile_picture;
    avatar.hidden = false;
    hasProfilePicture = true;
  }

  document.getElementById("avatarBtn").addEventListener("click", async () => {
    if (await uploadAvatar(me)) hasProfilePicture = true;
  });

  document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const updates = {};
    fields.forEach(f => {
      const v = document.getElementById(f).value.trim();
      updates[f] = v === "" ? null : v;
    });
    if (updates.graduation_year !== null) updates.graduation_year = Number(updates.graduation_year);

    const omitted = optionalFields
      .filter(([field]) => updates[field] === null)
      .map(([, label]) => label);
    if (!hasProfilePicture) omitted.push("Photo");

    const saveButton = document.getElementById("saveProfileBtn");
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
      const { data: savedProfile, error } = await db.from("profiles")
        .update(updates)
        .eq("id", me.id)
        .select("id")
        .maybeSingle();

      if (error) {
        showMessage("Could not save: " + error.message);
      } else if (!savedProfile) {
        showMessage("Could not save: your profile record was not found.");
      } else if (omitted.length) {
        showMessage("Profile saved. Optional information left blank: " + omitted.join(", ") + ".");
      } else {
        showMessage("Profile saved.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showMessage("Could not save: " + message);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save profile";
    }
  });
}

init();