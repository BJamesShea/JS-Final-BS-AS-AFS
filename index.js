const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const WebSocket = require("express-ws");
const path = require("path");
const bcrypt = require("bcrypt");
const app = express();

const mongoose = require("mongoose");

// Connect to MongoDB using Mongoose
const mongoURI = "mongodb://localhost:27017/chat_app";
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB via Mongoose!");
});

//--Saving this code in case mongoose connection fails--
// const { MongoClient } = require("mongodb");
// const url = "mongodb://localhost:27017";
// const client = new MongoClient(url);
// const dbName = "chat_app";
// Connect to DB
// async function connectToMongoDB() {
//   try {
//     await client.connect();
//     console.log("Connected to MongoDB!");

//     const db = client.db(dbName);
//     const collections = await db.listCollections().toArray();
//     console.log("Collections:", collections);
//   } catch (error) {
//     console.error("Error connection to Database:", error.message);
//     process.exit(1);
//   }
// }
// connectToMongoDB();

// Hash password before saving user
userSchema.pre("save",async function (next) {
  if (this.isModified("password")) {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }
  next();
})

// User Model
const userSchema = new mongoose.Schema({
  username: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  role: {type: String, default: "user"},
  createdAt: {type: Date, default: Date.now},
});

const User = mongoose.model("User", userSchema);


// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Session setup
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

// Middleware for authentication to ensure users are logged in before they can access profile
const requireLogin = (request, response, next) => {
  if (!request.session.user) {
    return response.redirect('/login');
  }
  next();
};

// WebSocket setup for real-time communication
const { app: wsApp } = WebSocket(app);
wsApp.ws("/chat", (ws, req) => {
  // Handle WebSocket messages
  ws.on("message", (msg) => {
    wsApp.getWss().clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });
});

// Routes
app.get("/", (req, res) => {
  res.render("unauthenticated", { title: "Dashboard" });
});

app.get("/login", (req, res) => {
  res.render("unauthenticated", { title: "Login" });
});

app.get("/signup", (req, res) => {
  res.render("signup", {title: "Signup"});
});

app.post("/signup", async (request, response) => {
  const { username, password } = request.body;

  // Validate input
  if (!username || !password) {
    return response.render("signup", { error: "All fields are required" });
  }

  try {
    // Check for existing username
    const existingUser = users.find((user) => user.username === username);
    if (existingUser) {
      return response.render("signup", { error: "Username already exists" });
    }

    // Save new user to db
    const newUser = new User({username, password});
    await newUser.save();

    // Save user info in session
    request.session.user = { username, role: "user" };

    response.redirect("/chat");
  } catch (error) {
    console.error(error);
    response.render("signup", { error: "Something went wrong. Please try again." });
  }
});

// Route for User to view their own profile
app.get("/profile", requireLogin, async (request, response) => {
  try {
    const user = await User.findOne({username: request.session.user.username});
    if (!user) {
      return response.status(404).send("User not found.");
    }
    response.render("profile", {
      username: user.username,
      joinDate: user.createdAt.toDateString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// Route for User to view another user's profile
app.get("/profile/:username", requireLogin, async (request, response) => {
  try {
    const user = await User.findOne({username: request.params.username});
    if (!user) {
      return response.status(404).send("User not found");
    }
    response.render("profile", {
      username: user.username,
      joinDate: user.createdAt.toDateString(),
    });
  } catch (error) {
    console.error(error);
    response.status(500).send("Server error");
  }
})

app.get("/chat", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  res.render("authenticated", { username: req.session.user.username });
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.redirect("/chat");
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

// Admin Routes
app.get("/admin", requireLogin (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.redirect("/chat");
  }
  
  try {
    const users = await User.find();
    res.render("admin", { users });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

app.post("/admin/remove-user", requireLogin (req, res) => {
  const { username } = req.body;
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.redirect("/chat");
  }
  try {
    await.User.deleteOne({ username: req.body.username});
    rs.redirect("/admin");
  } catch(error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).send("Page not found");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
