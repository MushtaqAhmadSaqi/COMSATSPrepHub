import { supabase } from './js/core.js';

async function test() {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('past_papers').select('count', { count: 'exact', head: true });
    if (error) {
        console.error('Connection failed:', error.message);
    } else {
        console.log('Connection successful! Record count:', data);
    }
}

test();
