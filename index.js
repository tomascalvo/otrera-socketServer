const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const cors = require("cors");
const router = require("./router.js");

const adminProfile = require("./adminProfile");

const {
  addUser,
  updateUser,
  removeUser,
  getUser,
  getUsersByRoom,
} = require("./users.js");

// .env
const dotenv = require("dotenv");
dotenv.config();
const PORT = process.env.PORT || 7000;

const app = express();
const server = http.createServer(app);
// const io = socketio(server);
const io = socketio(server, {
  cors: {
    origin: process.env.ORIGIN,
    methods: ["GET", "POST"],
  },
});

app.use(cors());

// routing

app.use(router);

// socket.io

io.on("connect", (socket) => {
  socket.on("join", ({ user, session, step }, callback) => {
    const { error, confirmedUser } = addUser({
      user,
      session,
      socketId: socket.id,
      step,
    });
    if (error) {
      return callback(error);
    }

    socket.join(confirmedUser.session._id);

    socket.emit("message", {
      sender: adminProfile,
      text: `Welcome to ${
        confirmedUser?.session?.plan?.title
      } chat, ${confirmedUser.name.slice(0, confirmedUser.name.indexOf(" "))}.`,
    });

    socket.broadcast.to(confirmedUser.session._id).emit("message", {
      sender: adminProfile,
      text: `${confirmedUser.name} has joined ${confirmedUser.session?.plan?.title} chat.`,
    });

    io.to(confirmedUser.session._id).emit("roomData", {
      room: confirmedUser.session._id,
      users: getUsersByRoom(confirmedUser.session._id),
    });

    callback();
  });

  socket.on("sendMessage", ({ text }, callback) => {
    console.log("message received: ", text);
    console.log("socket.id: ", socket.id);
    const confirmedSender = getUser(socket.id);
    if (confirmedSender === undefined) {
      console.log("Could not find message sender by socket.id");
      callback();
    }
    console.log("sender: ", confirmedSender.name);
    console.log("session._id: ", confirmedSender.session._id);
    io.to(confirmedSender?.session?._id).emit("message", {
      sender: confirmedSender,
      text,
    });

    callback();
  });

  socket.on("stepData", ({ step }) => {
    const confirmedSender = getUser(socket.id);
    if (confirmedSender === undefined) {
      console.log("Could not find participant by socket.id");
    } else {
      console.log(`${confirmedSender.name} is on step ${step.index}: ${step?.movement?.name ? step.movement.name : step.name}}.`);
      const updatedUser = updateUser({ socketId: socket.id, step });
      console.log('updatedUser: ', {...updatedUser, image: "", session: ""});
      io.to(confirmedSender?.session?._id).emit("stepData", {
        updatedParticipant: updatedUser,
      });
    }
  });

  socket.on("disconnect", () => {
    const { error, removedUser } = removeUser(socket.id);
    if (error) {
      console.log(error);
    }
    if (removedUser) {
      io.to(removedUser.session._id).emit("message", {
        user: adminProfile,
        text: `${removedUser.name} has left.`,
      });
      console.log(
        `${removedUser.name} has been removed from ${removedUser.session?.plan?.title} chat (session ${removedUser.session._id}).`
      );
    }
  });
});

server.listen(PORT, () => console.log(`Server running on port: ${PORT}`));
