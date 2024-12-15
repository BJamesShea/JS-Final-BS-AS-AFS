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

<<<<<<< HEAD
// Websocket setup
const expressWs = WebSocket(app);
const onlineUsers = new Map(); // Map to store WebSocket connections and usernames
=======
const expressWs = WebSocket(app);
const activeClients = new Set();
>>>>>>> a7ec288b4c6c6eada0df5ddb4405ca3e09ef8597

expressWs.app.ws("/chat", (ws, req) => {
  let currentUser = null;

  ws.on("message", (msg) => {
    const parsedMessage = JSON.parse(msg);

<<<<<<< HEAD
    if (parsedMessage.type === "join" && parsedMessage.username) {
      currentUser = parsedMessage.username;
      onlineUsers.set(ws, currentUser); // Associate WebSocket connection with username
      broadcastOnlineUsers();
      console.log(`${currentUser} joined the chat.`);
    }

    if (parsedMessage.type === "message") {
      const { senderUsername, content } = parsedMessage;

      const broadcastMessage = {
        type: "chatMessage",
        senderUsername,
        content,
        createdAt: new Date().toISOString(),
      };

      // Broadcast the message to all connected clients
      expressWs.getWss().clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(broadcastMessage));
        }
      });

      console.log("Broadcasted message:", broadcastMessage);
=======
      if (parsedMessage.type === "join") {
        currentUser = parsedMessage.username;

        // Remove stale connections
        activeClients.forEach((client) => {
          if (client.currentUser === currentUser) client.terminate();
        });

        ws.currentUser = currentUser;
        activeClients.add(ws);
        broadcastOnlineCount();
        console.log(`${currentUser} joined the chat.`);
      }

      if (parsedMessage.type === "message") {
        const { senderId, content } = parsedMessage;

        // Save message to DB
        const sender = await User.findById(senderId);
        if (sender) {
          const message = new Message({ sender: sender._id, content });
          await message.save();

          const broadcastMessage = {
            senderUsername: sender.username,
            content,
            createdAt: message.createdAt.toISOString(),
          };

          console.log("Broadcasting message to clients:", broadcastMessage);
          broadcastMessageToClients(broadcastMessage);
        } else {
          console.warn("Sender not found:", senderId);
        }
      }
    } catch (error) {
      console.error("WebSocket error:", error);
>>>>>>> a7ec288b4c6c6eada0df5ddb4405ca3e09ef8597
    }
  });

  ws.on("close", () => {
    if (currentUser) {
<<<<<<< HEAD
      onlineUsers.delete(ws); // Remove the user when they disconnect
      broadcastOnlineUsers();
=======
      activeClients.delete(ws);
      broadcastOnlineCount();
>>>>>>> a7ec288b4c6c6eada0df5ddb4405ca3e09ef8597
      console.log(`${currentUser} left the chat.`);
    }
  });
});

<<<<<<< HEAD

// Broadcast the list of online users to all clients
function broadcastOnlineUsers() {
  const userList = Array.from(onlineUsers.values()); // Extract usernames from the Map
  const onlineUsersMessage = JSON.stringify({
    type: "onlineUsers",
    count: userList.length,
    users: userList,
  });

  expressWs.getWss().clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(onlineUsersMessage);
    }
=======
function broadcastOnlineCount() {
  const message = JSON.stringify({
    type: "onlineCount",
    count: activeClients.size,
  });
  activeClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  });
}

function broadcastMessageToClients(data) {
  const message = JSON.stringify(data);
  activeClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(message);
>>>>>>> a7ec288b4c6c6eada0df5ddb4405ca3e09ef8597
  });

  console.log("Broadcast online users:", userList);
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
<<<<<<< HEAD
  res.render("chat", {
    username: req.session.user.username, // Pass the logged-in user's username
    userId: req.session.user.userId,
=======
  let messageData = [];
  Message.find().then((result) => {
    messageData = result;
    res.render("chat", {
      username: req.session.user.username,
      userId: req.session.user.userId,
      messages: messageData,
    });
>>>>>>> a7ec288b4c6c6eada0df5ddb4405ca3e09ef8597
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

// View Other Profiles
app.get("/profile/:username", requireLogin, async (req, res) => {
  try {
    // Fetch user by username
    const user = await User.findOne({ username: req.params.username });

    // Handle user not found
    if (!user) {
      console.error("User not found:", req.params.username);
      return res.status(404).render("error", { message: "User not found." });
    }

    // Render the user's profile
    res.render("profile", {
      username: user.username,
      joinDate: user.createdAt.toDateString(),
    });
  } catch (err) {
    console.error("Error loading profile:", err);
    res.status(500).render("error", { message: "Failed to load user profile." });
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
    console.error("Error loading admin dashboard:", err);
    res.status(500).send("Error loading admin dashboard.");
  }
});

// Users Route
app.get("/users", requireLogin, async (req, res) => {
  try {
    const users = await User.find({}, "username createdAt"); // Fetch all users with selected fields
    res.render("users", { users }); // Render the users.ejs view with the users data
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Logout Route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie("connect.sid");
    if (err) console.error("Error during logout:", err);
    res.redirect("/unauthenticated");
  });
});

// 404 Handler
app.use((req, res) => res.status(404).send("Page not found"));

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
