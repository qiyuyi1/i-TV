const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://wxaemtxkrryparukzdrv.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4YWVtdHhrcnJ5cGFydWt6ZHJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTI0NTcwMiwiZXhwIjoyMTAwODIxNzAyfQ.JtnLNNBOrw_mWTu8keMGLTQk7vInGyyOfLQMrM58Vh0";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("Checking database schema...\n");

  // Check users table
  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error reading users table:", error);
  } else if (users && users.length > 0) {
    console.log("Users table columns:", Object.keys(users[0]).join(", "));
    console.log("\nSample user:");
    console.log(JSON.stringify(users[0], null, 2));
  } else {
    console.log("Users table is empty or doesn't exist");
  }

  // Check resources table
  const { data: resources, error: resError } = await supabase
    .from("resources")
    .select("*")
    .limit(1);

  if (resError) {
    console.error("Error reading resources table:", resError);
  } else if (resources && resources.length > 0) {
    console.log("\nResources table columns:", Object.keys(resources[0]).join(", "));
  } else {
    console.log("\nResources table is empty or doesn't exist");
  }

  // Check resource_links table
  const { data: links, error: linkError } = await supabase
    .from("resource_links")
    .select("*")
    .limit(1);

  if (linkError) {
    console.error("Error reading resource_links table:", linkError);
  } else if (links && links.length > 0) {
    console.log("\nResource_links table columns:", Object.keys(links[0]).join(", "));
  } else {
    console.log("\nResource_links table is empty or doesn't exist");
  }

  // Check comments table
  const { data: comments, error: commentError } = await supabase
    .from("comments")
    .select("*")
    .limit(1);

  if (commentError) {
    console.error("Error reading comments table:", commentError);
  } else if (comments && comments.length > 0) {
    console.log("\nComments table columns:", Object.keys(comments[0]).join(", "));
  } else {
    console.log("\nComments table is empty or doesn't exist");
  }

  console.log("\nDone!");
}

main().catch(console.error);
