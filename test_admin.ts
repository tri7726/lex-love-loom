import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ojbwbbqmqxyxwwujzokm.supabase.co';
// Need the service role key to query users
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.log('Error: SUPABASE_SERVICE_ROLE_KEY is required to check user accounts.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserAccount() {
  const emailToFind = 'phamdjjd6@gmaill.com';
  
  console.log(`Checking if account ${emailToFind} exists...`);
  
  // Try to find the user
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error fetching users:', error.message);
    return;
  }

  const user = data.users.find(u => u.email === emailToFind);
  
  if (user) {
    console.log('User FOUND!');
    console.log('- ID:', user.id);
    console.log('- Email confirmed at:', user.email_confirmed_at || 'NOT CONFIRMED');
    console.log('- Last sign in at:', user.last_sign_in_at || 'NEVER');
  } else {
    console.log('User NOT FOUND. The account does not exist in the database.');
    
    // Check similar emails just in case
    console.log('\nSimilar emails in database:');
    const similar = data.users.filter(u => u.email?.includes('pham') || u.email?.includes('djj'));
    if (similar.length > 0) {
      similar.forEach(u => console.log(`- ${u.email}`));
    } else {
      console.log('None found.');
    }
  }
}

checkUserAccount();
