let currentEmail = "";
let recovered = false;

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

document.getElementById("emailForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage("");

  const email = val("email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showMessage("Please enter a valid email address.");

  const btn = document.getElementById("sendBtn");
  btn.disabled = true;
  const { error } = await db.auth.resetPasswordForEmail(email);
  btn.disabled = false;

  if (error) return showMessage(rateLimitMessage(error) || "Could not send the code: " + error.message);

  currentEmail = email;
  recovered = false;
  document.getElementById("resetForm").hidden = false;
  showMessage("If this email is registered, a code has been sent. Enter it below.");
});

document.getElementById("resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage("");

  const token = val("code");
  const password = document.getElementById("new_password").value;
  const confirm = document.getElementById("confirm_password").value;

  if (!/^\d{6,10}$/.test(token)) return showMessage("Please enter the code from the email (digits only).");
  if (password.length < 8) return showMessage("Password must be at least 8 characters.");
  if (password !== confirm) return showMessage("Passwords do not match.");

  const btn = document.getElementById("resetBtn");
  btn.disabled = true;

  if (!recovered) {
    const { error } = await db.auth.verifyOtp({ email: currentEmail, token, type: "recovery" });
    if (error) {
      btn.disabled = false;
      return showMessage(rateLimitMessage(error) || "The code is wrong or has expired. Request a new one.");
    }
    recovered = true;
  }

  const { error } = await db.auth.updateUser({ password });
  if (error) {
    btn.disabled = false;
    return showMessage("Could not change the password: " + error.message);
  }

  await db.auth.signOut();
  showMessage("Password changed. Redirecting to login...");
  setTimeout(() => { location.href = "login.html"; }, 1500);
});