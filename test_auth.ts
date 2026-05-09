import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ojbwbbqmqxyxwwujzokm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYndiYnFtcXh5eHd3dWp6b2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDE4MTMsImV4cCI6MjA4NTUxNzgxM30.GDqKqc2CEeaQtF-gQZnaQ6lTIpblhdOa7ggVXdmFfHk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  const email = 'phamdjjd6@gmaill.com';
  const password = '123123';
  
  console.log(`Checking login for ${email}...`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login Failed:');
    console.error('- Code:', error.name);
    console.error('- Message:', error.message);
  } else {
    console.log('Login Successful!');
    console.log('User ID:', data.user.id);
  }
}

checkUser();
