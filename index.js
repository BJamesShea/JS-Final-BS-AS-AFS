const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const WebSocket = require("express-ws");
const path = require("path");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const app = express();

// Connect to MongoDB using Mongoose
const mongoURI = "mongodb://localhost:27017/chat_app";
mongoose.connect(mongoURI, {});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB via Mongoose!");
  console.log("http://localhost:3000/");
});

// User Model for authentication
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  createdAt: { type: Date, default: Date.now },
});

// Hash passwords before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }
  next();
});

const User = mongoose.model("User", userSchema);

// Message Schema for storing messages in MongoDB
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

// Middleware setup for body parsing and serving static files
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Session setup for user authentication
app.use(
  session({
    secret: "your_secret_key", // Secret key for signing cookies
    resave: false,
    saveUninitialized: true,
  })
);

// Middleware for checking if user is logged in
const requireLogin = (request, response, next) => {
  if (!request.session.user) {
    return response.redirect("/unauthenticated"); // Redirect if not logged in
  }
  next();
};

// Make the user object available in all views via res.locals
app.use((req, res, next) => {
  res.locals.user = req.session.user || null; // Expose user session in templates
  next();
});

// WebSocket setup for real-time communication in chat
const expressWs = WebSocket(app);

const onlineUsers = new Set();

expressWs.app.ws("/chat", (ws, req) => {
  let currentUser;

  ws.on("message", async (msg) => {

    // Track connected users and display the count
    const parsedMessage = JSON.parse(msg);

    if (parsedMessage.type === "join" && parsedMessage.username) {
      currentUser = parsedMessage.username;
      onlineUsers.add(currentUser);

      broadcastOnlineCount();
    }

    try {
      const { senderId, content } = parsedMessage;

      // Validate senderId - check if it's a valid MongoDB ObjectId
      if (!senderId || !mongoose.Types.ObjectId.isValid(senderId)) {
        console.error("Invalid senderId:", senderId); // Log the invalid senderId
        return; // Stop processing the message if senderId is invalid
      }

      const objectIdSender = new mongoose.Types.ObjectId(senderId); // Correct ObjectId conversion

      const message = new Message({
        sender: objectIdSender, // Assign sender as valid ObjectId
        content,
      });

      await message.save(); // Save the message to MongoDB
      console.log("Saved message:", message);

      const broadcastMessage = {
        content: message.content,
        sender: message.sender,
        createdAt: message.createdAt,
      };

      // Broadcast the message to all connected WebSocket clients
      expressWs.getWss().clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(broadcastMessage));
        }
      });
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  }); 
  
  ws.on("close", () => {
    if (currentUser) {
      onlineUsers.delete(currentUser);
      broadcastOnlineCount();
    }
  });
});

// Function to broadcast online user count
function broadcastOnlineCount() {
  const onlineCountMessage = JSON.stringify({
    type: "onlineCount",
    count: onlineUsers.size,
  });

  expressWs.getWss().clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(onlineCountMessage);
    }
  });
}



// Routes for handling login, signup, and authenticated access

// Home route
app.get("/", (req, res) => {
  res.render("unauthenticated", { title: "Dashboard" }); // Landing page for unauthenticated users
});

// Unahtenticated route (for login page)
app.get("/unauthenticated", (req, res) => {
  res.render("unauthenticated", { errorMessage: null });
});

// Login route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render("unauthenticated", {
      errorMessage: "Username and password are required.",
    });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.render("unauthenticated", {
        errorMessage: "Invalid username or password.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.render("unauthenticated", {
        errorMessage: "Invalid username or password.",
      });
    }

    // Store user info in session after successful login
    req.session.user = {
      username: user.username,
      role: user.role,
      userId: user._id,
    };

    // Redirect based on role
    if (user.role === "admin") {
      return res.redirect("/admin");
    } else {
      return res.redirect("/chat");
    }
  } catch (error) {
    console.error("Error during login:", error.message);
    res.render("unauthenticated", {
      errorMessage: "An error occurred. Please try again.",
    });
  }
});

// Signup route
app.get("/signup", (req, res) => {
  res.render("signup", { errorMessage: null }); // Display signup form
});

app.post("/signup", async (request, response) => {
  const { username, password } = request.body;

  if (!username || !password) {
    return response.render("signup", {
      errorMessage: "All fields are required",
    });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return response.render("signup", {
        errorMessage: "Username already exists",
      });
    }

    const newUser = new User({ username, password });
    await newUser.save();

    // Store user info in session after successful signup
    request.session.user = { username, role: "user", userId: newUser._id };
    response.redirect("/chat");
  } catch (error) {
    console.error(error);
    response.render("signup", {
      errorMessage: "Something went wrong. Please try again.",
    });
  }
});

// Chat page route (after user login)
app.get("/chat", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/"); // Redirect if not logged in
  }

  res.render("chat", {
    username: req.session.user.username,
    userId: req.session.user.userId, // Pass userId to the chat page
  });
});

// Logout route (to destroy the session and log the user out)
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during session destruction:", err);
      return res.redirect("/profile");
    }
    res.clearCookie("connect.sid");
    res.redirect("/unauthenticated");
  });
});

// Admin routes
app.get("/admin/dashboard", requireLogin, (req, res) => {
  if (req.session.user.role !== "admin") {
    return res.status(403).send("Access denied. Admins only.");
  }
  res.render("admin-dashboard", { title: "Admin Dashboard" });
});

// Route to create an admin user
app.get("/create-admin", async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      return res.send("Admin user already exists.");
    }

    const adminUser = new User({
      username: "admin",
      password: "admin123", // Default password for admin
      role: "admin",
    });

    await adminUser.save();
    res.send("Admin user created successfully.");
  } catch (error) {
    console.error("Error creating admin user:", error);
    res.status(500).send("Error creating admin user.");
  }
});

// Route to display all users for admin
app.get("/admin", requireLogin, async (req, res) => {
  if (req.session.user.role !== "admin") {
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

// Route to remove a user by admin
app.post("/admin/remove-user", requireLogin, async (req, res) => {
  const { username } = req.body;

  try {
    if (!username) {
      return res.status(404).send("Invalid request.");
    }
    await User.deleteOne({ username });
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// Route to display a user profile
app.get("/profile", requireLogin, async (request, response) => {
  try {
    const user = await User.findOne({
      username: request.session.user.username,
    });
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

// Route to view another user's profile by username
app.get("/profile/:username", requireLogin, async (request, response) => {
  try {
    const user = await User.findOne({ username: request.params.username });
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
});

// Route to view all user profiles
app.get("/users", requireLogin, async (req, res) => {
  try {
    const users = await User.find({}, "username createsAt");
    console.log("Users retrieved:", users);
    res.render("users", { users });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving users");
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