/**
 * js/auth-ui.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Auth Modal: HTML template + all UI event listeners (toggle, eye, close).
 * Business logic (Supabase calls) lives in auth.js.
 * Call initAuthModal() once per page.  Call openModal() to show it.
 */

import { supabase, auth } from './core.js';

// ── Public API ────────────────────────────────────────────────────────────────
export function initAuthModal() {
    if (document.getElementById('auth-modal-overlay')) return; // already injected
    _injectModalHTML();
    _attachListeners();
}

export function openModal(startTab = 'login') {
    const overlay = document.getElementById('auth-modal-overlay');
    const amAuth  = document.getElementById('am-auth');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    amAuth.classList.toggle('toggled', startTab === 'signup');
}

export function closeModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
}

// ── HTML Template ─────────────────────────────────────────────────────────────
function _injectModalHTML() {
    const html = `
    <div class="auth-modal-overlay" id="auth-modal-overlay" role="dialog" aria-modal="true" aria-label="Authentication">
      <div class="auth-modal am-auth" id="am-auth">

        <button class="auth-modal-close" id="close-auth-modal" aria-label="Close">
          <span class="material-symbols-outlined" style="font-size:20px;">close</span>
        </button>

        <!-- ══ LOGIN PANEL ══ -->
        <div class="am-panel am-login">
          <section class="am-side am-l-side">
            <div class="am-bg-wrap">
              <img class="am-bg-img"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZDdNBglJeWrhi1y9jHIye7HIzCaIJI2VjDX-tqDH8dlDCtls8eTrLe8AHu-8QNhXA2j51OpnRpksHOCmzKaSTGRVocinZu_g6kcjHVO-KmmMDRgKY9A5bjPCbTd74_QZ_b4E0mEa3s57hV_8PV1qoIcW1W1-cvoW50XK5HDsQXs-rmyiJQ9-eKURVp0nLXuzjPsJYIuZhEC6Sd_s8ZFgrUF-tG8TeuVUml81zCmnoAmSoX-XdJWNxIPpPGlURk9DNtY--FBNPa9HA"
                alt="Background">
            </div>
            <div class="am-logo">COMSATSPrepHub</div>
            <div class="am-hero">
              <span class="am-sub">Academic Excellence</span>
              <h2 class="am-h1">WELCOME BACK!</h2>
              <p class="am-p">Access your curated prep materials and continue your journey toward academic mastery at COMSATS.</p>
              <div class="am-dots">
                <div class="am-dot active"></div>
                <div class="am-dot"></div>
                <div class="am-dot"></div>
              </div>
            </div>
          </section>
          <section class="am-form-panel">
            <div class="am-wrap">
              <div class="am-m-logo"><div class="am-m-name">COMSATSPrepHub</div></div>
              <div class="am-head">
                <h3 class="am-h2">Login</h3>
                <p class="am-h2-sub">Welcome back to your academic curator.</p>
              </div>
              <form id="am-l-form">
                <div class="am-item">
                  <label class="am-label" for="am-l-email">Email Address</label>
                  <div class="am-field">
                    <span class="material-symbols-outlined am-icon">mail</span>
                    <input class="am-in" id="am-l-email" name="email" type="email" placeholder="name@example.com" required>
                  </div>
                </div>
                <div class="am-item">
                  <div class="am-label-row">
                    <label class="am-label" for="am-l-pass" style="margin-bottom:0;">Password</label>
                    <a class="am-label-link" href="#">Forgot Password?</a>
                  </div>
                  <div class="am-field">
                    <span class="material-symbols-outlined am-icon">lock</span>
                    <input class="am-in" id="am-l-pass" name="password" type="password" placeholder="••••••••" required>
                    <button class="am-eye" type="button" aria-label="Toggle password">
                      <span class="material-symbols-outlined" style="font-size:18px;">visibility</span>
                    </button>
                  </div>
                </div>
                <div class="am-check">
                  <input class="am-ck-in" type="checkbox" id="am-rem-in">
                  <label class="am-ck-lbl" for="am-rem-in">Keep me logged in</label>
                </div>
                <button class="am-btn am-b-login" type="submit">
                  <span>Login</span>
                  <span class="material-symbols-outlined" style="font-size:18px;">arrow_forward</span>
                </button>
                <div class="am-sep"><span>or</span></div>
                <button class="am-btn-g" type="button" id="am-google-login">
                  <img src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" alt="Google">
                  <span>Sign in with Google</span>
                </button>
              </form>
              <div class="am-swap">Don't have an account? <a href="#" class="am-to-up">Sign Up</a></div>
            </div>
          </section>
        </div>

        <!-- ══ SIGNUP PANEL ══ -->
        <div class="am-panel am-signup">
          <section class="am-side am-s-side">
            <div class="am-bg-wrap">
              <img class="am-bg-img"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCk3-sOvD_tJohcdxadxtZFJ10l6HyxAbSE4RauxdmJfHf2zs_u4P38ESTUhEgJwACMcTPz6pi5NSGYVW9uobohnmF9gZ2L4ftwzuQ_IVi8C9i5F5nZgsq-49YwZihRSNuU7xyqpNU7wTUnjp265IAJ1xC08Fkzj6pMEq1juhdk208VCUWDAvkIVlKiUvZALMeyoFUi9xXkGA82r8dJkKDLwCujzX1EtT1wGN0dijfpNbSMh1cay34o_4cztvQ85r3FGObPL80zGWU9"
                alt="Background">
            </div>
            <div class="am-hero">
              <div class="am-line"></div>
              <div class="am-stack">
                <span class="am-sub">Academic Excellence</span>
                <h2 class="am-h1">WELCOME!</h2>
                <p class="am-p">Join the community of scholars at COMSATSPrepHub. Your curated journey to academic mastery starts here.</p>
              </div>
            </div>
            <div class="am-foot-l"><div class="am-logo-n">COMSATSPrepHub</div></div>
          </section>
          <section class="am-form-panel">
            <div class="am-wrap">
              <div class="am-m-logo">
                <div style="width:36px;height:3px;background:#006f1d;margin:0 auto 12px;border-radius:999px;"></div>
                <div class="am-m-name" style="color:#5f5e5e;">COMSATSPrepHub</div>
              </div>
              <div class="am-head">
                <h3 class="am-h2">Create your account</h3>
                <p class="am-h2-sub">Sign up to access curated study materials and tracking.</p>
              </div>
              <button class="am-btn-g am-btn-g-up" type="button" id="am-google-signup">
                <img src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" alt="Google">
                <span>Continue with Google</span>
              </button>
              <div class="am-sep"><span>or email</span></div>
              <form id="am-s-form">
                <div class="am-item">
                  <label class="am-label" for="am-s-name">Full Name</label>
                  <div class="am-field"><input class="am-in no-icon" id="am-s-name" name="name" type="text" placeholder="John Doe" required></div>
                </div>
                <div class="am-item">
                  <label class="am-label" for="am-s-email">Email Address</label>
                  <div class="am-field"><input class="am-in no-icon" id="am-s-email" name="email" type="email" placeholder="student@university.edu" required></div>
                </div>
                <div class="am-item">
                  <label class="am-label" for="am-s-pass">Password</label>
                  <div class="am-field">
                    <input class="am-in no-icon" id="am-s-pass" name="password" type="password" placeholder="••••••••" required>
                    <button class="am-eye" type="button" aria-label="Toggle password">
                      <span class="material-symbols-outlined" style="font-size:18px;">visibility</span>
                    </button>
                  </div>
                </div>
                <div class="am-check">
                  <input class="am-ck-in" type="checkbox" id="am-acc-in">
                  <label class="am-ck-lbl" for="am-acc-in">I agree to the <a href="terms.html">Terms of Service</a> and <a href="terms.html">Privacy Policy</a>.</label>
                </div>
                <button class="am-btn am-b-signup" type="submit">Create Account</button>
              </form>
              <div class="am-swap">Already have an account? <a href="#" class="am-to-in">Sign In</a></div>
            </div>
          </section>
        </div>

      </div><!-- /.auth-modal -->
    </div><!-- /.auth-modal-overlay -->
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

// ── Event Listeners ───────────────────────────────────────────────────────────
function _attachListeners() {
    const overlay = document.getElementById('auth-modal-overlay');
    const amAuth  = document.getElementById('am-auth');

    // Close
    document.getElementById('close-auth-modal').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // Panel toggle
    document.querySelectorAll('.am-to-up').forEach(btn =>
        btn.addEventListener('click', e => { e.preventDefault(); amAuth.classList.add('toggled'); })
    );
    document.querySelectorAll('.am-to-in').forEach(btn =>
        btn.addEventListener('click', e => { e.preventDefault(); amAuth.classList.remove('toggled'); })
    );

    // Password visibility
    document.querySelectorAll('.am-eye').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const icon  = btn.querySelector('.material-symbols-outlined');
            if (input.type === 'password') { input.type = 'text';     icon.textContent = 'visibility_off'; }
            else                           { input.type = 'password'; icon.textContent = 'visibility'; }
        });
    });

    // Redirect URL helper
    const _redirectUrl = () =>
        window.location.origin +
        window.location.pathname.replace(/\/[^/]*$/, '/dashboard.html');

    // ── Sign Up ───────────────────────────────────────────────────────────────
    const amSForm = document.getElementById('am-s-form');
    if (amSForm) {
        amSForm.addEventListener('submit', async e => {
            e.preventDefault();
            const name  = document.getElementById('am-s-name').value;
            const email = document.getElementById('am-s-email').value;
            const pass  = document.getElementById('am-s-pass').value;
            const acc   = document.getElementById('am-acc-in').checked;

            if (!acc)          { Swal.fire('Notice', 'Please accept the terms first.', 'warning'); return; }
            if (pass.length < 8) { Swal.fire('Notice', 'Password must be at least 8 characters.', 'warning'); return; }

            const btn = amSForm.querySelector('button[type="submit"]');
            btn.textContent = 'Processing...'; btn.disabled = true;

            const { error } = await supabase.auth.signUp({
                email, password: pass,
                options: { data: { full_name: name }, emailRedirectTo: _redirectUrl() }
            });

            btn.textContent = 'Create Account'; btn.disabled = false;
            if (error) Swal.fire('Error', error.message, 'error');
            else { Swal.fire('Success!', 'Check your email to confirm.', 'success'); amSForm.reset(); closeModal(); }
        });
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    const amLForm = document.getElementById('am-l-form');
    if (amLForm) {
        amLForm.addEventListener('submit', async e => {
            e.preventDefault();
            const email = document.getElementById('am-l-email').value;
            const pass  = document.getElementById('am-l-pass').value;
            const btn   = amLForm.querySelector('button[type="submit"]');

            btn.querySelector('span:first-child').textContent = 'Entering...'; btn.disabled = true;
            const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
            btn.querySelector('span:first-child').textContent = 'Login'; btn.disabled = false;

            if (error) Swal.fire('Error', error.message, 'error');
            else { amLForm.reset(); closeModal(); window.location.href = 'dashboard.html'; }
        });
    }

    // ── Google OAuth ──────────────────────────────────────────────────────────
    const handleGoogle = async e => {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: _redirectUrl() }
        });
        if (error) Swal.fire('Error', error.message, 'error');
    };
    document.getElementById('am-google-login')?.addEventListener('click', handleGoogle);
    document.getElementById('am-google-signup')?.addEventListener('click', handleGoogle);
}
