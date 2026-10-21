const fields = ["full_name", "batch", "graduation_year", "job_title",
                "company", "skills", "bio", "linkedin", "github"];

function showMessage(text) {
  document.getElementById("message").textContent = text;
}

async function uploadAvatar(me) {
  const file = document.getElementById("avatarFile").files[0];
  if (!file) return showMessage("Choose a picture first.");

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return showMessage("Only JPG, PNG or WebP pictures are allowed.");
  if (file.size > 2 * 1024 * 1024) return showMessage("Picture must be under 2 MB.");

  const path = me.id + "/avatar";
  const { error: upErr } = await db.storage.from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) return showMessage("Upload failed: " + upErr.message);

  const { data } = db.storage.from("avatars").getPublicUrl(path);
  const url = data.publicUrl + "?t=" + Date.now();

  const { error } = await db.from("profiles").update({ profile_picture: url }).eq("id", me.id);
  if (error) return showMessage("Could not save picture: " + error.message);

  document.getElementById("avatarImg").src = url;
  showMessage("Picture updated.");
}

async function init() {
  const me = await requireAccess("login");
  if (!me) return;

  const { data, error } = await db.from("profiles")
    .select(fields.join(", ") + ", profile_picture").eq("id", me.id).single();
  if (error) return showMessage(error.message);
  fields.forEach(f => document.getElementById(f).value = data[f] ?? "");
  if (data.profile_picture) document.getElementById("avatarImg").src = data.profile_picture;

  document.getElementById("avatarBtn").addEventListener("click", () => uploadAvatar(me));

  document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const updates = {};
    fields.forEach(f => {
      const v = document.getElementById(f).value.trim();
      updates[f] = v === "" ? null : v;
    });
    if (updates.graduation_year !== null) updates.graduation_year = Number(updates.graduation_year);

    const { error } = await db.from("profiles").update(updates).eq("id", me.id);
    showMessage(error ? "Could not save: " + error.message : "Profile saved.");
  });
}

init();