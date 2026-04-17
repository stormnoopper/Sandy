const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', '64c89127-b0fd-4d3c-922c-a4a444d0e256')
    .limit(1);
    
  console.log('project_members:', data, error);

  const res2 = await supabase
    .from('document_versions')
    .insert({
      draft_id: '6d6a3002-5361-44b5-b99f-6a5fd9350ddd',
      draft_type: 'sow',
      project_id: '64c89127-b0fd-4d3c-922c-a4a444d0e256',
      content: 'test',
      label: 'test'
    })
    .select('id');
  
  console.log('document_versions insert:', res2.data, res2.error);
}
run();
