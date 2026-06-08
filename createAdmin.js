const mongoose = require("mongoose");
const Admin = require("./models/Admin");
require("dotenv").config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const admin = await Admin.create({
      name: "Super Admin",
      email: "admin@mhsteppays.com",
      password: "123456",
      role: "admin"
    });

    console.log("Admin Created Successfully");
    console.log(admin);

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createAdmin();