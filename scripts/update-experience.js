// Script to update owner experience to 9999
// Run this with: node scripts/update-experience.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    // Find owner user
    const { data: owner, error: findError } = await supabase
      .from('users')
      .select('id, username, experience, level')
      .eq('is_owner', true)
      .single();

    if (findError) {
      console.error('Error finding owner:', findError.message);
      process.exit(1);
    }

    if (!owner) {
      console.log('No owner found');
      process.exit(0);
    }

    console.log('Found owner:', owner.username, 'Current experience:', owner.experience);

    // Update experience to 9999 (level 50)
    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({
        experience: 9999,
        level: 50,
      })
      .eq('id', owner.id)
      .select('id, username, experience, level');

    if (updateError) {
      console.error('Error updating owner:', updateError.message);
      process.exit(1);
    }

    console.log('Updated successfully:', updated[0]);
    console.log('Experience set to 9999 (Level 50)');
  } catch (err) {
    console.error('Unexpected error:', err.message);
    process.exit(1);
  }
}

main();
