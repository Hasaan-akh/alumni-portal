function showMessage(text) {
  document.getElementById("message").textContent = text;
}

// Send each kind of user to the right page
function goToHome(profile) {
  if (profile.role === "admin") location.href = "admin.html";
  else if (!profile.is_verified) location.href = "pending.html";
  else location.href = "directory.html";
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage("");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (!email || !password) return showMessage("Please enter your email and password.");

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;

  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    btn.disabled = false;
    const msg = error.message.toLowerCase();
    if (msg.includes("email not confirmed")) {
      return showMessage("Please confirm your email first. Check your inbox.");
    }
    if (msg.includes("rate limit") || msg.includes("too many")) {
      return showMessage("Too many attempts. Please wait a few minutes and try again.");
    }
    return showMessage("Incorrect email or password. If you don't have an account, please create one first.");
  }

  const me = await getMyProfile();
  if (!me) {
    await db.auth.signOut();
    btn.disabled = false;
    return showMessage("Your account could not be loaded. Please contact the admin.");
  }

  goToHome(me);
});

// Anyone who is already logged in skips this page
async function init() {
  const me = await getMyProfile();
  if (me) goToHome(me);
}

init();