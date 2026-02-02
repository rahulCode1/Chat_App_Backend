require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const app = express();
const cors = require("cors");
const authRoutes = require("./routes/auth.js");
const Messages = require("./model/message_model.js");
const User = require("./model/user.js");
const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://chat-app-frontend-9uji.onrender.com"],
  },
});

const uri = process.env.MONGODB;

app.use(cors());
app.use(express.json());

mongoose
  .connect(uri)
  .then(() => console.log("Successfully connected to db."))
  .catch((err) => console.log(err));

app.use("/auth", authRoutes);

// 🔹 USER TO SOCKET MAPPING
const userSocketMap = new Map(); // { username: socketId }

// 🔹 SOCKET LOGIC
io.on("connection", (socket) => {
  console.log("User connected.", socket.id);

  // ✅ REGISTER USER WHEN THEY CONNECT
  socket.on("register_user", (username) => {
    userSocketMap.set(username, socket.id);
    console.log(`${username} registered with socket ${socket.id}`);
  });

  socket.on("send_message", async (data) => {
    const { sender, receiver, message } = data;

    const newMessage = new Messages({
      sender,
      receiver,
      message,
      read: false,
    });

    await newMessage.save();

    // ✅ SEND TO RECEIVER ONLY (NOT BROADCAST)
    const receiverSocketId = userSocketMap.get(receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive_message", {
        sender,
        receiver,
        message,
        createdAt: newMessage.createdAt,
        read: false,
      });
    }
  });

  socket.on("typing", ({ sender, receiver }) => {
    const receiverSocketId = userSocketMap.get(receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user_typing", { sender, receiver });
    }
  });

  socket.on("stop_typing", ({ sender, receiver }) => {
    const receiverSocketId = userSocketMap.get(receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user_stop_typing", { sender, receiver });
    }
  });

  // ✅ READ RECEIPT EVENT - FIXED
  socket.on("mark_read", async ({ sender, receiver }) => {
    // Update messages in database
    await Messages.updateMany(
      { sender, receiver, read: false },
      { read: true }
    );

    // ✅ NOTIFY THE ORIGINAL SENDER THAT THEIR MESSAGES WERE READ
    const senderSocketId = userSocketMap.get(sender);
    if (senderSocketId) {
      io.to(senderSocketId).emit("message_read", {
        sender,
        receiver,
      });
    }
  });

  socket.on("disconnect", () => {
    // ✅ REMOVE USER FROM MAP ON DISCONNECT
    for (const [username, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(username);
        console.log(`${username} disconnected and removed from map`);
        break;
      }
    }
    console.log("User disconnected.");
  });
});

// 🔹 GET MESSAGES
app.get("/messages", async (req, res) => {
  const { sender, receiver } = req.query;

  try {
    const messages = await Messages.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages" });
  }
});

// 🔹 GET USERS
app.get("/users", async (req, res) => {
  const { currentUser } = req.query;

  try {
    const users = await User.find({ username: { $ne: currentUser } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});