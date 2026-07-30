const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://wxaemtxkrryparukzdrv.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4YWVtdHhrcnJ5cGFydWt6ZHJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTI0NTcwMiwiZXhwIjoyMTAwODIxNzAyfQ.JtnLNNBOrw_mWTu8keMGLTQk7vInGyyOfLQMrM58Vh0";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("Starting database updates...\n");

  // 1. Clean up any old "qiyuyi" user
  console.log("Step 1: Cleaning up old accounts...");
  const { data: qiyuyiUser, error: qiyuyiError } = await supabase
    .from("users")
    .select("id, username")
    .eq("username", "qiyuyi");

  if (qiyuyiError) {
    console.error("Error finding qiyuyi user:", qiyuyiError);
  } else if (qiyuyiUser && qiyuyiUser.length > 0) {
    for (const u of qiyuyiUser) {
      await supabase.from("comments").delete().eq("user_id", u.id);
      await supabase.from("resource_links").delete().eq("added_by_id", u.id);
      await supabase.from("resources").delete().eq("created_by_id", u.id);
      
      const { error } = await supabase.from("users").delete().eq("id", u.id);
      if (error) console.error(`Error deleting qiyuyi: ${error}`);
      else console.log("Deleted user: qiyuyi");
    }
  } else {
    console.log("No old qiyuyi user found.");
  }

  // 2. Find or create the "绮雨一" user
  console.log("\nStep 2: Setting up '绮雨一' account...");
  
  // First, check if user exists
  const { data: existingUser, error: findError } = await supabase
    .from("users")
    .select("id, username")
    .eq("username", "绮雨一");

  if (findError) {
    console.error("Error finding user:", findError);
    return;
  }

  let userId;
  if (existingUser && existingUser.length > 0) {
    // User exists, update it
    userId = existingUser[0].id;
    console.log(`Found existing user: ${userId}, updating...`);

    const hashedPassword = await bcrypt.hash("Zsq051906@", 10);

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({
        password: hashedPassword,
        role: "ADMIN",
        level: 999,
        experience: 999999,
        title: "站长",
        is_owner: true,
        is_super_admin: false,
      })
      .eq("id", userId)
      .select("id, username, role, is_owner, is_super_admin, title, level, experience");

    if (updateError) {
      console.error("Error updating user:", updateError);
    } else if (updatedUser) {
      console.log("Successfully updated owner account:");
      console.log(`  Username: ${updatedUser[0].username}`);
      console.log(`  Role: ${updatedUser[0].role}`);
      console.log(`  Title: ${updatedUser[0].title}`);
      console.log(`  isOwner: ${updatedUser[0].is_owner}`);
      console.log(`  Level: ${updatedUser[0].level}`);
      console.log(`  Experience: ${updatedUser[0].experience}`);
      console.log("  Password: Zsq051906@");
    }
  } else {
    // Create new user
    console.log("Creating new user...");
    const hashedPassword = await bcrypt.hash("Zsq051906@", 10);
    const newId = "cl" + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);

    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        id: newId,
        username: "绮雨一",
        password: hashedPassword,
        role: "ADMIN",
        level: 999,
        experience: 999999,
        title: "站长",
        is_owner: true,
        is_super_admin: false,
      })
      .select("id, username, role, is_owner, is_super_admin, title, level, experience");

    if (createError) {
      console.error("Error creating user:", createError);
    } else if (newUser) {
      console.log("Successfully created owner account:");
      console.log(`  Username: ${newUser[0].username}`);
      console.log(`  Role: ${newUser[0].role}`);
      console.log(`  Title: ${newUser[0].title}`);
      console.log(`  isOwner: ${newUser[0].is_owner}`);
      console.log(`  Level: ${newUser[0].level}`);
      console.log(`  Experience: ${newUser[0].experience}`);
      console.log("  Password: Zsq051906@");
    }
  }

  // 3. Verify the account
  console.log("\nStep 3: Verifying account...");
  const { data: verifyUser, error: verifyError } = await supabase
    .from("users")
    .select("id, username, role, is_owner, is_super_admin, title, level, experience")
    .eq("username", "绮雨一");

  if (verifyError) {
    console.error("Error verifying:", verifyError);
  } else if (verifyUser && verifyUser.length > 0) {
    console.log("Verification successful:");
    console.log(`  ${JSON.stringify(verifyUser[0], null, 2)}`);
  } else {
    console.log("Account not found after update!");
  }

  console.log("\nDone!");
}

main().catch(console.error);
