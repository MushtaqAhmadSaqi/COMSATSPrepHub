import { supabase } from './core.js';

const VISIT_STORAGE_PREFIX = 'comsatsprephub:lastVisit:';

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function getVisitStorageKey(email) {
    return `${VISIT_STORAGE_PREFIX}${String(email || '').toLowerCase()}`;
}

function getUserDisplayName(user, fallbackName = '') {
    return (
        user?.user_metadata?.full_name ||
        fallbackName ||
        user?.email?.split('@')[0] ||
        'Student'
    );
}

/**
 * Fetches the visit statistics for a specific user.
 * The Supabase table is assumed to be named 'user_visits' with columns:
 * - email (string)
 * - name (string)
 * - total_count_of_days (number)
 * 
 * @param {string} userEmail - The email of the user to fetch.
 * @returns {Promise<Object|null>} The user's visit data or null if not found.
 */
export async function getUserVisitCount(userEmail) {
    try {
        const { data, error } = await supabase
            .from('user_visits')
            .select('email, name, total_count_of_days')
            .eq('email', userEmail)
            .maybeSingle();

        if (error) {
            console.error('Error fetching user visits:', error.message);
            return null;
        }

        return data;
    } catch (err) {
        console.error('Unexpected error fetching user visits:', err);
        return null;
    }
}

/**
 * Updates or inserts a user's visit count.
 * Typically you would call this when the user logs in or visits the site for the first time on a given day.
 * 
 * @param {string} userEmail - The email of the user.
 * @param {string} userName - The name of the user.
 * @returns {Promise<boolean>} True when the visit record was saved.
 */
export async function incrementUserVisit(userEmail, userName) {
    const cleanEmail = String(userEmail || '').trim().toLowerCase();
    const cleanName = String(userName || '').trim() || cleanEmail.split('@')[0] || 'Student';

    if (!cleanEmail) {
        console.warn('Cannot update user visits without a user email.');
        return false;
    }

    try {
        // First check if the user exists in the table
        const { data: existingUser, error: fetchError } = await supabase
            .from('user_visits')
            .select('total_count_of_days')
            .eq('email', cleanEmail)
            .maybeSingle();

        if (fetchError) {
            console.error('Error checking existing user:', fetchError.message);
            return false;
        }

        if (existingUser) {
            // User exists, increment their count
            const newCount = (existingUser.total_count_of_days || 0) + 1;
            const { error: updateError } = await supabase
                .from('user_visits')
                .update({ total_count_of_days: newCount, name: cleanName }) // Update name too just in case
                .eq('email', cleanEmail);

            if (updateError) {
                console.error('Error updating visit count:', updateError.message);
                return false;
            } else {
                console.log(`Successfully updated visit count for ${cleanEmail} to ${newCount}`);
                return true;
            }
        } else {
            // User doesn't exist, insert new record with count 1
            const { error: insertError } = await supabase
                .from('user_visits')
                .insert([
                    { email: cleanEmail, name: cleanName, total_count_of_days: 1 }
                ]);

            if (insertError) {
                console.error('Error inserting new user visit record:', insertError.message);
                return false;
            } else {
                console.log(`Successfully created visit record for ${cleanEmail}`);
                return true;
            }
        }
    } catch (err) {
        console.error('Unexpected error updating user visits:', err);
        return false;
    }
}

/**
 * Records one visit per signed-in user per local calendar day.
 *
 * @param {object|null} session - Supabase auth session.
 * @param {string} fallbackName - Name already resolved by the layout/auth helper.
 * @returns {Promise<boolean>} True when a new daily visit was saved.
 */
export async function trackCurrentUserVisit(session, fallbackName = '') {
    const user = session?.user;
    const email = user?.email;

    if (!email) return false;

    const todayKey = getLocalDateKey();
    const storageKey = getVisitStorageKey(email);

    try {
        if (localStorage.getItem(storageKey) === todayKey) {
            return false;
        }
    } catch {
        // If localStorage is unavailable, still try to write the visit.
    }

    const saved = await incrementUserVisit(email, getUserDisplayName(user, fallbackName));

    if (saved) {
        try {
            localStorage.setItem(storageKey, todayKey);
        } catch {
            // Visit is already saved; storage failure should not surface to users.
        }
    }

    return saved;
}

/**
 * Example usage to display the count in the UI.
 * 
 * @param {string} userEmail - The email of the user.
 * @param {string} containerId - The ID of the HTML element to display the count.
 */
export async function displayUserVisitCount(userEmail, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = 'Loading visit stats...';

    const visitData = await getUserVisitCount(userEmail);

    if (visitData) {
        container.innerHTML = `
            <div class="visit-stats">
                <h3>Welcome back, ${escapeHtml(visitData.name)}!</h3>
                <p>You have visited this website on <strong>${visitData.total_count_of_days}</strong> different days.</p>
            </div>
        `;
    } else {
        container.innerHTML = `<p>No visit history found for this user.</p>`;
    }
}

// Helper to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
