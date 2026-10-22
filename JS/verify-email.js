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

function startCooldown(seconds) {
  const btn = document.getElementById("resendBtn");
  btn.disabled = true;
  let left = seconds;
  btn.textContent = "Resend code (" + left + ")";
  const timer = setInterval(() => {
    left--;
    if (left <= 0) {
      clearInterval(timer);
      btn.disabled = false;
      btn.textContent = "Resend code";
    } else {
      btn.textContent = "Resend code (" + left + ")";
    }
  }, 1000);
}

document.getElementById("verifyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage("");

  const email = val("email");
  const token = val("code");
  if (!email) return showMessage("Please enter your email.");
  if (!/^\d{6,10}$/.test(token)) return showMessage("Please enter the code from the email (digits only).");

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  const { error } = await db.auth.verifyOtp({ email, token, type: "signup" });
  btn.disabled = false;

  if (error) {
    return showMessage(rateLimitMessage(error) || "The code is wrong or has expired. Request a new one.");
  }
  location.href = "pending.html";
});

document.getElementById("resendBtn").addEventListener("click", async () => {
  showMessage("");
  const email = val("email");
  if (!email) return showMessage("Please enter your email first.");

  const { error } = await db.auth.resend({ type: "signup", email });
  if (error) {
    return showMessage(rateLimitMessage(error) || "Could not send the code: " + error.message);
  }
  showMessage("A new code has been sent. Check your inbox and spam folder.");
  startCooldown(60);
});

const emailParam = new URLSearchParams(location.search).get("email");
if (emailParam) document.getElementById("email").value = emailParam;