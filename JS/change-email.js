let pendingEmail = "";

const val = (id) => document.getElementById(id).value.trim();

function showMessage(text) {
  document.getElementById("message").textContent = text;
}

function rateLimitMessage(error) {
  const m = (error.message || "").toLowerCase();
  if (m.includes("rate limit") || m.includes("seconds") || m.includes("too many")) {
    return "Too many requests. Please wait a minute and try again.";
  }
  return null;
}

async function showCurrentEmail() {
  const { data: { user } } = await db.auth.getUser();
  document.getElementById("currentEmail").textContent = user ? user.email : "";
  return user;
}

async function sendCode(e) {
  e.preventDefault();
  showMessage("");

  const user = await showCurrentEmail();
  const newEmail = val("new_email");
  const password = document.getElementById("current_password").value;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newEmail)) return showMessage("Please enter a valid email address.");
  if (newEmail.toLowerCase() === user.email.toLowerCase()) return showMessage("That is already your email.");
  if (!password) return showMessage("Please enter your current password.");

  const btn = document.getElementById("sendBtn");
  btn.disabled = true;

  const { error: authError } = await db.auth.signInWithPassword({ email: user.email, password });
  if (authError) {
    btn.disabled = false;
    return showMessage(rateLimitMessage(authError) || "Current password is incorrect.");
  }

  const { error } = await db.auth.updateUser({ email: newEmail });
  btn.disabled = false;

  if (error) {
    if ((error.message || "").toLowerCase().includes("already")) {
      return showMessage("This email is already in use.");
    }
    return showMessage(rateLimitMessage(error) || "Could not send the code: " + error.message);
  }

  pendingEmail = newEmail;
  document.getElementById("codeForm").hidden = false;
  showMessage("A code was sent to the new email. Enter it below.");
}

async function confirmCode(e) {
  e.preventDefault();
  showMessage("");

  const token = val("code");
  if (!/^\d{6,10}$/.test(token)) return showMessage("Please enter the code from the email (digits only).");

  const btn = document.getElementById("confirmBtn");
  btn.disabled = true;
  const { error } = await db.auth.verifyOtp({ email: pendingEmail, token, type: "email_change" });
  btn.disabled = false;

  if (error) {
    const m = (error.message || "").toLowerCase();
    if (m.includes("database")) {
      return showMessage("This email cannot be used. It may already belong to another account.");
    }
    return showMessage(rateLimitMessage(error) || "The code is wrong or has expired.");
  }

  document.getElementById("emailForm").reset();
  document.getElementById("codeForm").reset();
  document.getElementById("codeForm").hidden = true;
  await db.auth.refreshSession();
  await showCurrentEmail();
  showMessage("Email updated. Use the new email to log in from now on.");
}

async function init() {
  const me = await requireAccess("login");
  if (!me) return;
  await showCurrentEmail();
  document.getElementById("emailForm").addEventListener("submit", sendCode);
  document.getElementById("codeForm").addEventListener("submit", confirmCode);
}

init();