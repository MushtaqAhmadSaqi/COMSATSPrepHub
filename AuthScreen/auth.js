const auth = document.querySelector('.auth');
const toIn = document.querySelectorAll('.to-in');
const toUp = document.querySelectorAll('.to-up');

// ── TOGGLE PANELS ──
toUp.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    auth.classList.add('toggled');
  });
});

toIn.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    auth.classList.remove('toggled');
  });
});

// ── PASSWORD VISIBILITY ──
document.querySelectorAll('.eye').forEach(btn => {
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
*/

import { supabase } from '../utils.js';

// ── SIGN UP ──
const sForm = document.getElementById('s-form');
const signUpBtn = document.getElementById('signUpBtn');
const signUpError = document.getElementById('signUpError');

if (sForm) {
  sForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!supabase) {
      alert("Setup Supabase first!");
      return;
    }

    const name = document.getElementById('s-name').value;
    const email = document.getElementById('s-email').value;
    const pass = document.getElementById('s-pass').value;
    const acc = document.getElementById('acc-in').checked;

    if (!acc) {
      showAuthError(signUpError, "Please accept the terms of service first.");
      return;
    }

    if (pass.length < 8) {
      showAuthError(signUpError, "Password must be at least 8 characters long.");
      return;
    }

    // Reset error
    signUpError.style.display = "none";

    // Show loading state
    const oldHtml = signUpBtn.innerHTML;
    signUpBtn.disabled = true;
    signUpBtn.innerHTML = `
        <span class="flex items-center justify-center gap-2">
            <span class="animate-spin">⟳</span> Processing...
        </span>
    `;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: pass,
        options: { data: { full_name: name } }
      });

      if (error) {
        showAuthError(signUpError, error.message);
      } else {
        alert("Account created! Check your email to confirm, then login.");
        sForm.reset();
        // Switch to login view
        auth.classList.remove('toggled');
      }
    } catch (err) {
      console.error("Signup error:", err);
      showAuthError(signUpError, "Something went wrong. Please try again.");
    } finally {
      signUpBtn.disabled = false;
      signUpBtn.innerHTML = oldHtml;
    }
  });
}

// ── LOGIN ──
const lForm = document.getElementById('l-form');

if (lForm) {
  lForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    
    const email = document.getElementById('l-email').value;
    const pass = document.getElementById('l-pass').value;
    
    if (!email || !pass) {
      showAuthError(document.getElementById('loginError'), "Please enter your email and password.");
      return;
    }
    
    await handleLogin(email, pass);
  });
}

/**
 * Improved Login Function
 */
async function handleLogin(email, password) {
  const loginBtn = document.getElementById('loginBtn');
  const errorDiv = document.getElementById('loginError');

  if (!supabase) {
    alert("Setup Supabase first!");
    return;
  }

  // Clear previous error
  errorDiv.style.display = "none";

  // Show loading state
  const oldHtml = loginBtn.innerHTML;
  loginBtn.disabled = true;
  loginBtn.innerHTML = `
      <span class="flex items-center justify-center gap-2">
          <span class="animate-spin">⟳</span> Logging in...
      </span>
  `;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      // Show user-friendly error
      let message = "Login failed. Please try again.";
      
      if (error.message.includes("Invalid login credentials")) {
        message = "Wrong email or password. Please check and try again.";
      } else if (error.message.includes("Email not confirmed")) {
        message = "Please verify your email first.";
      } else {
        message = error.message; // Fallback to Supabase error
      }
      
      showAuthError(errorDiv, message);
      
      // Reset button
      loginBtn.disabled = false;
      loginBtn.innerHTML = oldHtml;
      return;
    }

    // Success! Redirect to dashboard
    window.location.href = '../dashboard.html';

  } catch (err) {
    console.error("Login error:", err);
    showAuthError(errorDiv, "Something went wrong. Please try again.");
    
    loginBtn.disabled = false;
    loginBtn.innerHTML = oldHtml;
  }
}

/**
 * Helper to show authentication errors nicely
 */
function showAuthError(div, message) {
  if (!div) return;
  div.textContent = message;
  div.style.display = "block";
  // Smooth scroll to the error if it's far
  div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
} 

