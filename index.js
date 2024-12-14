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
  console.log("Connected to MongoDB!");
  console.log("http://localhost:3000/");
});

// User Schema
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

// Middleware
const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/unauthenticated");
  }
  next();
};

// Add session user to res.locals
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// WebSocket setup
const expressWs = WebSocket(app);
const onlineUsers = new Set();

// WebSocket Connection
expressWs.app.ws("/chat", (ws, req) => {
  let currentUser;

  ws.on("message", async (msg) => {
    const parsedMessage = JSON.parse(msg);

    // Handle "join" event
    if (parsedMessage.type === "join" && parsedMessage.username) {
      currentUser = parsedMessage.username;
      onlineUsers.add(currentUser);
      broadcastOnlineCount();
      console.log(`${currentUser} joined the chat.`);
    }

    // Handle "message" event
    if (parsedMessage.type === "message") {
      const { senderId, content } = parsedMessage;
      const sender = await User.findById(senderId);

      if (sender) {
        const message = new Message({ sender: sender._id, content });
        await message.save();

        const broadcastMessage = {
          senderUsername: sender.username,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        };

        console.log("Broadcasting message:", broadcastMessage);

        expressWs.getWss().clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(broadcastMessage));
          }
        });
      }
    }
  });

  ws.on("close", () => {
    if (currentUser) {
      onlineUsers.delete(currentUser);
      broadcastOnlineCount();
      console.log(`${currentUser} left the chat.`);
    }
  });
});

// Broadcast Online User Count
function broadcastOnlineCount() {
  const onlineCountMessage = JSON.stringify({
    type: "onlineCount",
    count: onlineUsers.size,
  });

  console.log(`Online users: ${onlineUsers.size}`);

  expressWs.getWss().clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(onlineCountMessage);
    }
  });
}

// Initialize admin user
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
app.get("/", (req, res) =>
  res.render("unauthenticated", { title: "Dashboard" })
);
app.get("/unauthenticated", (req, res) =>
  res.render("unauthenticated", { errorMessage: null })
);
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && (await bcrypt.compare(password, user.password))) {
    req.session.user = {
      username: user.username,
      role: user.role,
      userId: user._id,
    };
    res.redirect("/chat");
  } else {
    res.render("unauthenticated", { errorMessage: "Invalid credentials." });
  }
});
app.get("/signup", (req, res) => res.render("signup", { errorMessage: null }));
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (await User.exists({ username })) {
    res.render("signup", { errorMessage: "Username already exists." });
  } else {
    const newUser = new User({ username, password });
    await newUser.save();
    req.session.user = { username, role: "user", userId: newUser._id };
    res.redirect("/chat");
  }
});

// **Chat Route**
app.get("/chat", requireLogin, (req, res) =>
  res.render("chat", {
    username: req.session.user.username,
    userId: req.session.user.userId,
  })
);

// **Profile Route**
app.get("/profile", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.userId);
    res.render("profile", {
      username: user.username,
      joinDate: user.createdAt,
    });
  } catch (err) {
    res.status(500).send("Error loading profile.");
  }
});

// **View Other Users' Profiles**
app.get("/profile/:username", requireLogin, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).send("User not found.");
    res.render("profile", {
      username: user.username,
      joinDate: user.createdAt,
    });
  } catch (err) {
    res.status(500).send("Error loading user profile.");
  }
});

// **Users List Route**
app.get("/users", requireLogin, async (req, res) => {
  try {
    const users = await User.find({}, "username createdAt");
    res.render("users", { users });
  } catch (err) {
    res.status(500).send("Error loading users.");
  }
});

// **Admin Dashboard**
app.get("/admin", requireLogin, async (req, res) => {
  if (req.session.user.role !== "admin") {
    return res.redirect("/chat");
  }
  const users = await User.find({});
  res.render("admin", { users });
});

// **Admin Logout User Route**
app.post("/admin/logout-user", requireLogin, async (req, res) => {
  if (req.session.user.role !== "admin") {
    return res.status(403).send("Access denied. Admins only.");
  }

  const { username } = req.body;

  try {
    if (!username) {
      return res.status(400).send("Invalid request. Username required.");
    }

    console.log(
      `Admin ${req.session.user.username} is logging out user: ${username}`
    );

    res.redirect("/admin");
  } catch (err) {
    res.status(500).send("Internal server error.");
  }
});

// **Logout Route**
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie("connect.sid");
    res.redirect("/unauthenticated");
  });
});

// 404 Handler
app.use((req, res) => res.status(404).send("Page not found"));

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
