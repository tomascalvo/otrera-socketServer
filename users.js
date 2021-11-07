// functions to manage users in the chat rooms

const users = [];

const addUser = ({ user, session, socketId, step }) => {
  const existingUser = users.find(
    (el) =>
      (el.id === user._id && el.session._id === session._id) ||
      el.socketId === socketId
  );
  if (existingUser) {
    return {
      error: `${existingUser.name} is already chatting in ${existingUser.session.plan.title} chat (session ${existingUser.session._id}).`,
    };
  } else {
    const confirmedUser = { ...user, session, socketId, step };
    users.push(confirmedUser);
    return { confirmedUser };
  }
};

const getUser = (socketId) => {
  return users.find((user) => user.socketId === socketId);
};

const getUsersByRoom = (sessionId) => {
  return users.filter((user) => {
    return user.session._id === sessionId;
  });
};

const updateUser = ({ socketId, step }) => {
  const userIndex = users.findIndex((el) => {
    return el.socketId === socketId;
  });
  const updatedUser = {
    ...users[userIndex],
    step,
  };
  users.splice(userIndex, 1, updatedUser);
  return updatedUser;
};

const removeUser = (socketId) => {
  const index = users.findIndex((user) => user.socketId === socketId);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  } else {
    console.log(
      "userIds: ",
      users.map((user) => user.socketId)
    );
    return {
      error: `No user with socketId ${socketId} is currently chatting.`,
    };
  }
};

module.exports = { addUser, updateUser, removeUser, getUser, getUsersByRoom };
