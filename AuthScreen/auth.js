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
    const btn = sForm.querySelector('button[type="submit"]');

    if (!acc) {
      alert("Accept terms first.");
      return;
    }

    if (pass.length < 8) {
      alert("Password too short.");
      return;
    }

    const oldText = btn.textContent;
    btn.textContent = 'Processing...';
    btn.disabled = true;

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: pass,
      options: { data: { full_name: name } }
    });

    btn.textContent = oldText;
    btn.disabled = false;

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Success! Check email.");
      sForm.reset();
    }
  });
}

// ── LOGIN ──
const lForm = document.getElementById('l-form');

if (lForm) {
  lForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!supabase) {
      alert("Setup Supabase first!");
      return;
    }

    const email = document.getElementById('l-email').value;
    const pass = document.getElementById('l-pass').value;
    const btn = lForm.querySelector('button[type="submit"]');

    btn.textContent = 'Entering...';
    btn.disabled = true;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: pass,
    });

    btn.textContent = 'Login';
    btn.disabled = false;

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Welcome back!");
      lForm.reset();
    }
  });
}
