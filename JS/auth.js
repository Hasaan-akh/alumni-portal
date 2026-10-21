async function getMyProfile() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("profiles")
    .select("id, full_name, role, is_verified")
    .eq("id", user.id).single();
  return data;
}

// level: "login", "verified" or "admin"
async function requireAccess(level) {
  const me = await getMyProfile();
  if (!me) { location.href = "login.html"; return null; }
  if (level === "admin" && me.role !== "admin") { location.href = "directory.html"; return null; }
  if (level !== "login" && !me.is_verified) { location.href = "pending.html"; return null; }
  return me;
}
async function logout() {
  await db.auth.signOut();
  location.href = "login.html";
}