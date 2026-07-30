import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL || "https://wxaemtxkrryparukzdrv.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4YWVtdHhrcnJ5cGFydWt6ZHJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTI0NTcwMiwiZXhwIjoyMTAwODIxNzAyfQ.JtnLNNBOrw_mWTu8keMGLTQk7vInGyyOfLQMrM58Vh0";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("Starting database updates...\n");

  // 1. Delete old admin accounts (qiyuyi, or any user with isOwner/isSuperAdmin)
  console.log("Step 1: Cleaning up old admin accounts...");

  // First, find and delete any existing owner/superadmin users
  const { data: oldOwners, error: findError } = await supabase
    .from("users")
    .select("id, username, isOwner, isSuperAdmin, role")
    .or("isOwner.eq.true,isSuperAdmin.eq.true,role.eq.ADMIN");

  if (findError) {
    console.error("Error finding old admins:", findError);
  } else if (oldOwners && oldOwners.length > 0) {
    console.log(`Found ${oldOwners.length} admin/owner users:`);
    for (const u of oldOwners) {
      console.log(`  - ${u.username} (role: ${u.role}, owner: ${u.isOwner}, superadmin: ${u.isSuperAdmin})`);
      
      // Delete related data first (comments, links, resources)
      const { error: delComments } = await supabase
        .from("comments")
        .delete()
        .eq("userId", u.id);
      if (delComments) console.error(`  Error deleting comments: ${delComments}`);
      
      const { error: delLinks } = await supabase
        .from("resource_links")
        .delete()
        .eq("addedById", u.id);
      if (delLinks) console.error(`  Error deleting links: ${delLinks}`);

      // Delete resources created by this user
      const { error: delResources } = await supabase
        .from("resources")
        .delete()
        .eq("createdById", u.id);
      if (delResources) console.error(`  Error deleting resources: ${delResources}`);

      // Delete the user
      const { error: delUser } = await supabase
        .from("users")
        .delete()
        .eq("id", u.id);
      if (delUser) console.error(`  Error deleting user: ${delUser}`);
      else console.log(`  Deleted user: ${u.username}`);
    }
  } else {
    console.log("No existing admin/owner users found.");
  }

  // Also clean up any user named "qiyuyi"
  const { data: qiyuyiUser, error: qiyuyiError } = await supabase
    .from("users")
    .select("id, username")
    .eq("username", "qiyuyi");

  if (qiyuyiError) {
    console.error("Error finding qiyuyi user:", qiyuyiError);
  } else if (qiyuyiUser && qiyuyiUser.length > 0) {
    for (const u of qiyuyiUser) {
      // Delete related data
      await supabase.from("comments").delete().eq("userId", u.id);
      await supabase.from("resource_links").delete().eq("addedById", u.id);
      await supabase.from("resources").delete().eq("createdById", u.id);
      
      const { error } = await supabase.from("users").delete().eq("id", u.id);
      if (error) console.error(`Error deleting qiyuyi: ${error}`);
      else console.log("Deleted user: qiyuyi");
    }
  }

  // 2. Create the new owner account "绮雨一" with password "Zsq051906@"
  console.log("\nStep 2: Creating new owner account '绮雨一'...");

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
      isOwner: true,
      isSuperAdmin: false,
    })
    .select("id, username, role, isOwner, isSuperAdmin, title, level, experience");

  if (createError) {
    console.error("Error creating user:", createError);
  } else if (newUser) {
    console.log("Successfully created owner account:");
    console.log(`  Username: ${newUser[0].username}`);
    console.log(`  Role: ${newUser[0].role}`);
    console.log(`  Title: ${newUser[0].title}`);
    console.log(`  isOwner: ${newUser[0].isOwner}`);
    console.log(`  Level: ${newUser[0].level}`);
    console.log(`  Experience: ${newUser[0].experience}`);
    console.log("  Password: Zsq051906@");
  }

  // 3. Verify the account works
  console.log("\nStep 3: Verifying account...");
  const { data: verifyUser, error: verifyError } = await supabase
    .from("users")
    .select("id, username, role, isOwner, isSuperAdmin, title")
    .eq("username", "绮雨一");

  if (verifyError) {
    console.error("Error verifying:", verifyError);
  } else if (verifyUser && verifyUser.length > 0) {
    console.log("Verification successful:");
    console.log(`  ${JSON.stringify(verifyUser[0], null, 2)}`);
  } else {
    console.log("Account not found after creation!");
  }

  console.log("\nDone!");
}

main().catch(console.error);
