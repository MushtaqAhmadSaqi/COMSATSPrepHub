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

    signUpError.style.display = "none";

    const oldHtml = signUpBtn.innerHTML;
    signUpBtn.disabled = true;
    signUpBtn.innerHTML = `
        <span class="flex items-center justify-center gap-2">
            <span class="animate-spin">⟳</span> Processing...
        </span>
    `;

    try {
      const { error } = await supabase.auth.signUp({
        email: email,
        password: pass,
        options: { data: { full_name: name } }
      });

      if (error) {
        showAuthError(signUpError, error.message);
      } else {
        alert("Account created! Check your email to confirm, then login.");
        sForm.reset();
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

async function handleLogin(email, password) {
  const loginBtn = document.getElementById('loginBtn');
  const errorDiv = document.getElementById('loginError');

  if (!supabase) {
    alert("Setup Supabase first!");
    return;
  }

  errorDiv.style.display = "none";

  const oldHtml = loginBtn.innerHTML;
  loginBtn.disabled = true;
  loginBtn.innerHTML = `
      <span class="flex items-center justify-center gap-2">
          <span class="animate-spin">⟳</span> Logging in...
      </span>
  `;

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      let message = "Login failed. Please try again.";
      
      if (error.message.includes("Invalid login credentials")) {
        message = "Wrong email or password. Please check and try again.";
      } else if (error.message.includes("Email not confirmed")) {
        message = "Please verify your email first.";
      } else {
        message = error.message;
      }
      
      showAuthError(errorDiv, message);
      loginBtn.disabled = false;
      loginBtn.innerHTML = oldHtml;
      return;
    }

    window.location.href = 'dashboard.html';

  } catch (err) {
    console.error("Login error:", err);
    showAuthError(errorDiv, "Something went wrong. Please try again.");
    
    loginBtn.disabled = false;
    loginBtn.innerHTML = oldHtml;
  }
}

function showAuthError(div, message) {
  if (!div) return;
  div.textContent = message;
  div.style.display = "block";
  div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
