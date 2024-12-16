// Required modules
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const WebSocket = require("express-ws");
const path = require("path");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const app = express();

// MongoDB Connection
const mongoURI = "mongodb://localhost:27017/chat_app";
mongoose.connect(mongoURI, {});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB!");
  console.log("http://localhost:3000/");
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" }, // admin/user
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }
  next();
});

const User = mongoose.model("User", userSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

// Middleware for login
const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/unauthenticated");
  }
  next();
};

// Middleware for admin access
const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).send("Access denied. Admins only.");
  }
  next();
};

// Add session user to res.locals
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

const expressWs = WebSocket(app);
const activeClients = new Set();

app.ws("/chat", (ws, req) => {
  let currentUser = null; // Track the connected user's username

  ws.on("message", async (msg) => {
    try {
      const parsedMessage = JSON.parse(msg);

      // Handle user joining the chat
      if (parsedMessage.type === "join") {
        if (parsedMessage.username && parsedMessage.username !== "Guest") {
          currentUser = parsedMessage.username;
          ws.currentUser = currentUser;

          activeClients.add(ws); // Add the socket to active clients
          broadcastOnlineCount(); // Update all clients about online users
          console.log(`${currentUser} joined the chat.`);
        } else {
          console.warn("Invalid username or Guest user ignored.");
        }
      }

      // Handle chat messages
      if (parsedMessage.type === "message") {
        const { senderId, content } = parsedMessage;

        // Ensure sender is valid before processing the message
        const sender = await User.findById(senderId);
        if (sender) {
          const message = new Message({
            sender: sender._id,
            senderUsername: sender.username,
            content,
          });
          await message.save();

          const broadcastMessage = {
            senderUsername: sender.username,
            content,
            createdAt: message.createdAt.toISOString(),
          };

          console.log("Broadcasting message to clients:", broadcastMessage);
          activeClients.forEach((client) => {
            if (client.readyState === ws.OPEN) {
              client.send(JSON.stringify(broadcastMessage));
            }
          });
        } else {
          console.warn("Sender not found or invalid:", senderId);
        }
      }
    } catch (error) {
      console.error("WebSocket error:", error);
    }
  });

  // Handle user disconnecting
  ws.on("close", () => {
    if (currentUser) {
      activeClients.delete(ws);
      broadcastOnlineCount(); // Update all clients about online users
      console.log(`${currentUser} left the chat.`);
    }
  });
});

// Function to broadcast the list of online users to all clients
function broadcastOnlineCount() {
  const onlineUsernames = Array.from(activeClients)
    .map((client) => client.currentUser)
    .filter((username) => username && username !== "Guest"); // Filter valid users only

  console.log("Broadcasting online users:", onlineUsernames);

  const message = JSON.stringify({
    type: "onlineUsers",
    users: onlineUsernames,
  });

  activeClients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

function broadcastOnlineCount() {
  const onlineUsernames = Array.from(activeClients)
    .map((client) => client.currentUser)
    .filter(Boolean); // Collect valid usernames

  console.log("Broadcasting online users:", onlineUsernames); // Debug log for outgoing data

  // Construct the message to broadcast
  const message = JSON.stringify({
    type: "onlineUsers", // Type to be identified by the client
    users: onlineUsernames, // Array of online usernames
  });

  // Send the message to all connected WebSocket clients
  activeClients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
      console.log("Sent online users message to client:", message);
    } else {
      console.warn("WebSocket client not open, skipping.");
    }
  });
}

function broadcastMessageToClients(data) {
  const message = JSON.stringify(data);
  activeClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  });
}

// Admin Initialization
const initializeAdmin = async () => {
  const adminExists = await User.exists({ role: "admin" });
  if (!adminExists) {
    const adminUser = new User({
      username: "admin",
      password: "admin123",
      role: "admin",
    });
    await adminUser.save();
    console.log("Admin user created.");
  }
};
initializeAdmin();

// Routes

// Home Page
app.get("/", (req, res) =>
  res.redirect(req.session.user ? "/chat" : "/unauthenticated")
);

// Unauthenticated View
app.get("/unauthenticated", (req, res) =>
  res.render("unauthenticated", { errorMessage: null })
);

// Login Handler
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.user = {
        username: user.username,
        role: user.role,
        userId: user._id,
      };

      console.log("User logged in:", user.username);

      // Redirect to appropriate dashboard based on role
      if (user.role === "admin") {
        res.redirect("/admin");
      } else {
        res.redirect("/chat");
      }
    } else {
      res.render("unauthenticated", { errorMessage: "Invalid credentials." });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.render("unauthenticated", {
      errorMessage: "Error occurred. Try again.",
    });
  }
});

// Signup View
app.get("/signup", (req, res) => res.render("signup", { errorMessage: null }));

// Signup Handler
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    if (await User.exists({ username })) {
      res.render("signup", { errorMessage: "Username already exists." });
    } else {
      const newUser = new User({ username, password });
      await newUser.save();
      req.session.user = { username, role: "user", userId: newUser._id };
      res.redirect("/chat");
    }
  } catch (error) {
    console.error("Error during signup:", error);
    res.render("signup", { errorMessage: "Error occurred. Try again." });
  }
});

// Chat Route
app.get("/chat", requireLogin, (req, res) => {
  let messageData = [];
  Message.find()
    .populate("sender", "username")
    .then((result) => {
      const messageData = result
        .filter((msg) => msg.sender)
        .map((msg) => ({
          senderUsername: msg.sender.username,
          content: msg.content,
          createdAt: msg.createdAt.toISOString(),
        }));
      res.render("chat", {
        username: req.session.user.username,
        userId: req.session.user.userId,
        messages: messageData,
      });
    })
    .catch((err) => {
      console.error("Error fetching messages:", err);
      res.status(500).send("Error fetching messages.");
    });
});

// Profile Route
app.get("/profile", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.userId);
    if (user) {
      res.render("profile", {
        username: user.username,
        joinDate: user.createdAt.toDateString(),
      });
    } else {
      res.status(404).send("User not found.");
    }
  } catch (err) {
    console.error("Error loading profile:", err);
    res.status(500).send("Error loading profile.");
  }
});

// View all users
app.get("/users", requireLogin, async (req, res) => {
  try {
    const users = await User.find({ role: "user" });
    res.render("users", {
      users: users.map((user) => ({
        ...user.toObject(),
        userId: user._id.toString(),
      })),
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send("Error fetching users.");
  }
});
// View Other Profiles
app.get("/profile/:id", requireLogin, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.id);

    const user = await User.findById(userId);
    if (user) {
      res.render("profile", {
        username: user.username,
        joinDate: user.createdAt.toDateString(),
      });
    } else {
      console.log(`No user found with ID: ${userId}`);
      return res.status(404).send("User not found.");
    }
  } catch (err) {
    console.error("Detailed error loading profile:", err);
    return res.status(400).send(`Invalid user ID: ${err.message}`);
  }
});

// Admin User Management - Remove User
app.post("/admin/remove-user", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndDelete(userId);
    console.log(`User with ID ${userId} deleted.`);
    res.redirect("/admin");
  } catch (err) {
    console.error("Error removing user:", err);
    res.status(500).send("Error removing user.");
  }
});

// Admin Dashboard
app.get("/admin", requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "user" });
    res.render("admin", { users });
  } catch (err) {
    console.error("Error fetching users for admin:", err);
    res.status(500).send("Error fetching users.");
  }
});

// Logout Handler
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/unauthenticated");
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
