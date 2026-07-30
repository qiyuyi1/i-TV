const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://wxaemtxkrryparukzdrv.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4YWVtdHhrcnJ5cGFydWt6ZHJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTI0NTcwMiwiZXhwIjoyMTAwODIxNzAyfQ.JtnLNNBOrw_mWTu8keMGLTQk7vInGyyOfLQMrM58Vh0";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("Checking users in database...\n");

  // List all users
  const { data: users, error } = await supabase
    .from("users")
    .select("id, username, role, is_owner, is_super_admin, title, level, experience");

  if (error) {
    console.error("Error fetching users:", error);
    process.exit(1);
  }

  console.log("Current users:");
  console.log(JSON.stringify(users, null, 2));

  if (users && users.length > 0) {
    // Find users that are not the owner (绮雨一)
    const ownerUser = users.find((u) => u.username === "绮雨一");
    console.log("\nOwner user:", ownerUser ? ownerUser.username : "Not found");

    // Find old admin accounts that need to be deleted
    const oldAdmins = users.filter(
      (u) => u.username !== "绮雨一" && (u.role === "ADMIN" || u.is_owner || u.is_super_admin)
    );

    if (oldAdmins.length > 0) {
      console.log("\nOld admin accounts to delete:");
      for (const admin of oldAdmins) {
        console.log(`- ${admin.username} (role: ${admin.role}, is_owner: ${admin.is_owner}, is_super_admin: ${admin.is_super_admin})`);

        // Delete the old admin account
        const { error: deleteError } = await supabase
          .from("users")
          .delete()
          .eq("id", admin.id);

        if (deleteError) {
          console.error(`  Error deleting ${admin.username}:`, deleteError);
        } else {
          console.log(`  ✅ Deleted ${admin.username}`);
        }
      }
    } else {
      console.log("\nNo old admin accounts to delete.");
    }

    // Also check for any test accounts
    const testAccounts = users.filter(
      (u) => u.username !== "绮雨一"
    );

    if (testAccounts.length > 0) {
      console.log("\nOther accounts:");
      for (const user of testAccounts) {
        console.log(`- ${user.username} (role: ${user.role})`);
      }
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
