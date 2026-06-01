import { supabase } from './core.js';

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
            .single();

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
 */
export async function incrementUserVisit(userEmail, userName) {
    try {
        // First check if the user exists in the table
        const { data: existingUser, error: fetchError } = await supabase
            .from('user_visits')
            .select('total_count_of_days')
            .eq('email', userEmail)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Rows not found"
            console.error('Error checking existing user:', fetchError.message);
            return;
        }

        if (existingUser) {
            // User exists, increment their count
            const newCount = (existingUser.total_count_of_days || 0) + 1;
            const { error: updateError } = await supabase
                .from('user_visits')
                .update({ total_count_of_days: newCount, name: userName }) // Update name too just in case
                .eq('email', userEmail);

            if (updateError) {
                console.error('Error updating visit count:', updateError.message);
            } else {
                console.log(`Successfully updated visit count for ${userEmail} to ${newCount}`);
            }
        } else {
            // User doesn't exist, insert new record with count 1
            const { error: insertError } = await supabase
                .from('user_visits')
                .insert([
                    { email: userEmail, name: userName, total_count_of_days: 1 }
                ]);

            if (insertError) {
                console.error('Error inserting new user visit record:', insertError.message);
            } else {
                console.log(`Successfully created visit record for ${userEmail}`);
            }
        }
    } catch (err) {
        console.error('Unexpected error updating user visits:', err);
    }
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
