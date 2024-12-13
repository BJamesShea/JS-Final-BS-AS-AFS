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
mongoose.connect(mongoURI, {});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB via Mongoose!");
  console.log("http://localhost:3000/");
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

// User Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  createdAt: { type: Date, default: Date.now },
});

// Hash passwords
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }
  next();
});

const User = mongoose.model("User", userSchema);

// TEMPORARY Message Schema
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

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
    return response.redirect("/unauthenticated");
  }
  next();
};

// WebSocket setup for real-time communication
const expressWs = WebSocket(app);

expressWs.app.ws("/chat", (ws, req) => {
  ws.on("message", async (msg) => {
    try {
      const { senderId, content } = JSON.parse(msg);

      const message = new Message({
        sender: senderId,
        content,
      });

      await message.save();
      console.log("Saved message:", message);

      const broadcastMessage = {
        content: message.content,
        sender: message.sender,
        createdAt: message.createdAt,
      };

      expressWs.getWss().clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(broadcastMessage));
        }
      });
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  });
});

// Routes
app.get("/", (req, res) => {
  res.render("unauthenticated", { title: "Dashboard" });
});

app.get("/unauthenticated", (req, res) => {
  res.render("unauthenticated", { errorMessage: null });
});

// Login route logic
app.post("login", async (req,res) => {
  const {username, password} = req.body;

  if (!username || password) {
    return res.render("unauthenticated", {
      errorMessage: "Username and password are required.",
    });
  }

  try {
    // Check if user exists in db
    const user = await User.findOne({username});
    if (!user) {
      return res.render("unauthenticated", {
        errorMessage: "Invalid username or password.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.render("unauthenticated", {
        errorMessage: "Invalid username or password.",
      });
    }

    // Save user's info in session
    req.session.user = {username: user.username, role: user.role};

    // Redirect based on role
    if (user.role === "admin") {
      return res.redirect("/admin");
    } else {
      return res.redirect("/chat")
    }
  } catch (error) {
    console.error("Error during login: ", error);
    res.render("unauthenticated", {
      errorMessage: "An error occured during login, please try again.",
    });
  }
});

// Example dashboard route (just for completeness)
app.get("/dashboard", (req, res) => {
  res.send("<h1>Welcome to the Dashboard</h1>");
});

app.get("/signup", (req, res) => {
  res.render("signup", { errorMessage: null }); // Ensure errorMessage is always defined
});

// temp(?) route to fetch all messages.
app.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find()
      .populate("sender", "username")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).send("Error fetching messages");
  }
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

    request.session.user = { username, role: "user" };
    response.redirect("/chat");
  } catch (error) {
    console.error(error);
    response.render("signup", {
      errorMessage: "Something went wrong. Please try again.",
    });
  }
});

// Route to test Message schema
app.post("/test-message", async (req, res) => {
  try {
    const testSenderId = "64a12345b678c9012d345678"; // to be replaced with valid user ID
    const testContent = "Hello, this is a test message!";

    const message = new Message({
      sender: testSenderId,
      content: testContent,
    });
    await message.save();

    console.log("Message saved:", message);
    res.status(201).send("Message saved successfully");
  } catch (error) {
    console.error("Error saving message:", error);
    res.status(500).send("Error saving message");
  }
});

// Route for User to view their own profile
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

// Route for User to view another user's profile
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

app.get("/chat", (req, res) => {
  console.log("Hit /chat route");
  if (!req.session.user) {
    console.log("User not logged in. Redirecting...");
    return res.redirect("/");
  }
  console.log("Rendering chat.ejs for user:", req.session.user.username);
  res.render("chat", { username: req.session.user.username });
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.redirect("/chat");
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

// Admin Routes
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

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).send("Page not found");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
