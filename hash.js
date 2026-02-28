const bcrypt = require("bcryptjs");

async function generateHash() {
  const password = "admin123"; // 👈 This will be your login password
  const hash = await bcrypt.hash(password, 10);
  console.log("Generated Hash:");
  console.log(hash);
}

generateHash();