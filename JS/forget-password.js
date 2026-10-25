let currentEmail = "";
let recovered = false;

// After a code is requested, the Send Code button stays disabled for 60 seconds.
// Supabase also blocks repeat requests for 60 seconds, so this avoids the error message.
const COOLDOWN_SECONDS = 60;
let cooldownTimer = null;

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

// Counts down on the button text. The button's first child is the "Send Code " text node,
// so the arrow icon after it is left untouched.
function startCooldown(btn) {
  const label = btn.firstChild;
  const hasLabel = label && label.nodeType === Node.TEXT_NODE;
  const original = hasLabel ? label.nodeValue : "";
  let left = COOLDOWN_SECONDS;

  btn.disabled = true;
  if (hasLabel) label.nodeValue = "Resend in " + left + "s ";

  clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
      if (hasLabel) label.nodeValue = original;
      btn.disabled = false;
    } else if (hasLabel) {
      label.nodeValue = "Resend in " + left + "s ";
    }
  }, 1000);
}

document.getElementById("emailForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage("");

  const btn = document.getElementById("sendBtn");
  if (btn.disabled) return;

  const email = val("email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showMessage("Please enter a valid email address.");

  btn.disabled = true;
  const { error } = await db.auth.resetPasswordForEmail(email);

  if (error) {
    const limited = rateLimitMessage(error);
    if (limited) startCooldown(btn);   // too many requests: wait before trying again
    else btn.disabled = false;         // any other error: let the person fix it and retry
    return showMessage(limited || "Could not send the code: " + error.message);
  }

  startCooldown(btn);

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