const authWrapper = document.querySelector('.auth-wrapper');
const loginTriggers = document.querySelectorAll('.login-trigger');
const registerTriggers = document.querySelectorAll('.register-trigger');

// ── TOGGLE PANELS ───────────────────────────────────────────
registerTriggers.forEach(trigger => {
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    authWrapper.classList.add('toggled');
  });
});

loginTriggers.forEach(trigger => {
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    authWrapper.classList.remove('toggled');
  });
});

// ── PASSWORD VISIBILITY TOGGLES ─────────────────────────────
document.querySelectorAll('.toggle-visibility').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.parentElement.querySelector('input');
    const icon = btn.querySelector('.material-symbols-outlined');
    if (input.type === 'password') {
      input.type = 'text';
      icon.textContent = 'visibility_off';
    } else {
      input.type = 'password';
      icon.textContent = 'visibility';
    }
  });
});

/* 
  Supabase Authentication Setup
  Note: Make sure to link this file in your HTML at the very bottom of the body tag using:
  <script type="module" src="auth.js"></script>
*/

// 1. Import Supabase securely from the CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 2. Add your project URL and Anon Key here later
const SUPABASE_URL = ''; // <-- Paste your Supabase URL here later
const SUPABASE_KEY = ''; // <-- Paste your Supabase Anon Key here later

// 3. Initialize the Supabase Connection
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.warn("Supabase URL or Key is missing. Update them in auth.js");
}

/* ============================================================== 
                     SIGN UP FORM LOGIC 
   ============================================================== */
const signupForm = document.getElementById('signupForm');

if (signupForm) {
  signupForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (!supabase) {
      alert("Please update your Supabase URL and Key in auth.js first!");
      return;
    }

    // Get input elements by ID
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const termsChecked = document.getElementById('terms').checked;
    const submitBtn = signupForm.querySelector('button[type="submit"]');

    // Validation
    if (!termsChecked) {
      alert("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    if (password.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }

    // Indicate loading
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;

    // 4. Send the new user data to Supabase
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name
        }
      }
    });

    submitBtn.textContent = originalBtnText;
    submitBtn.disabled = false;

    if (error) {
      alert("Signup Error: " + error.message);
    } else {
      alert("Registration successful! Please check your email inbox to confirm your address.");
      signupForm.reset();
    }
  });
}

/* ============================================================== 
                      LOGIN FORM LOGIC 
   ============================================================== */
const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (!supabase) {
      alert("Please update your Supabase URL and Key in auth.js first!");
      return;
    }

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;

    // Call Supabase's signIn function
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    submitBtn.textContent = 'Login';
    submitBtn.disabled = false;

    if (error) {
      alert("Login Error: " + error.message);
    } else {
      alert("Login Complete! Welcome back.");
      // Optional: window.location.href = "../home.html"; 
      loginForm.reset();
    }
  });
}
