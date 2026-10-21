const val = (id) => document.getElementById(id).value.trim();

function showMessage(text) {
  document.getElementById("message").textContent = text;
}

function validateEmail(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!pattern.test(email)) return "Please enter a valid email address.";
  const typos = {
    "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com",
    "gmail.con": "gmail.com", "gmail.co": "gmail.com", "hotmial.com": "hotmail.com",
    "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "outlok.com": "outlook.com"
  };
  const parts = email.split("@");
  const fix = typos[parts[1].toLowerCase()];
  if (fix) return "Did you mean " + parts[0] + "@" + fix + "?";
  return null;
}

function validateForm() {
  const name = val("full_name");
  if (name.length < 2 || name.length > 100) return "Name must be 2 to 100 characters.";

  const emailProblem = validateEmail(val("email"));
  if (emailProblem) return emailProblem;

  const password = document.getElementById("password").value;
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password !== document.getElementById("confirm_password").value) return "Passwords do not match.";

  if (!val("batch")) return "Batch is required.";

  const year = Number(val("graduation_year"));
  if (!Number.isInteger(year) || year < 1950 || year > 2100) return "Graduation year must be between 1950 and 2100.";

  if (!val("enrollment_no")) return "Enrollment number is required.";
  return null;
}

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage("");

  const problem = validateForm();
  if (problem) return showMessage(problem);

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;

  const { data, error } = await db.auth.signUp({
    email: val("email"),
    password: document.getElementById("password").value,
    options: { data: {
      full_name: val("full_name"),
      batch: val("batch"),
      graduation_year: val("graduation_year"),
      enrollment_no: val("enrollment_no")
    }}
  });

  btn.disabled = false;

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return showMessage("This email is already registered. Please log in.");
    }
    if (error.message.includes("Database error")) {
      return showMessage("Could not create the account. This email or enrollment number may already be registered.");
    }
    return showMessage(error.message);
  }

  // With email confirmation on, an existing email returns a user with no identities
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return showMessage("This email is already registered. Please log in.");
  }

  if (data.session) {
    location.href = "pending.html";   // logged in straight away
  } else {
    showMessage("Account created. Check your email to confirm it, then log in.");
  }
});