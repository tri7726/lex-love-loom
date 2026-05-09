import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''; // Use service role if available for bulk updates
const supabase = createClient(supabaseUrl, supabaseKey);

async function runFixes() {
  console.log('--- Starting Database Fixes ---');
  
  try {
    const { data: textbooks } = await supabase.from('textbooks').select('id, name');
    const minna = textbooks?.find(t => t.name.toLowerCase().includes('mina') || t.name.toLowerCase().includes('minna'));
    
    if (minna) {
      console.log(`Found Minna textbook: ${minna.id}`);
      await supabase.from('textbooks').update({ name: 'Minna no Nihongo' }).eq('id', minna.id);
      
      const { data: allLessons } = await supabase.from('lessons').select('id, lesson_number').eq('textbook_id', minna.id);
      
      for (const lesson of allLessons || []) {
        const jlpt = lesson.lesson_number <= 25 ? 'N5' : 'N4';
        
        const { count } = await supabase
          .from('vocabulary_master')
          .select('*', { count: 'exact', head: true })
          .eq('lesson_id', lesson.id);
          
        await supabase
          .from('lessons')
          .update({ 
            jlpt_level: jlpt,
            word_count: count || 0
          })
          .eq('id', lesson.id);
      }
      console.log('Successfully updated Minna levels and word counts.');
    }

    console.log('--- Fixes Completed ---');
  } catch (err) {
    console.error('Fatal error during fixes:', err);
  }
}

runFixes();
