
const socket = new WebSocket("ws://localhost:3000/chat");
const username = document.getElementById("username").value; // Dynamically retrieve username
const userId = document.getElementById("userId").value; // Dynamically retrieve userId

// Handle WebSocket connection and events
socket.addEventListener("open", () => {
  console.log("WebSocket connection established.");
  socket.send(JSON.stringify({ type: "join", username })); // Send 'join' event with username
});

socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "onlineUsers") {
    // Update the online users count
    const onlineUsersCountElement = document.getElementById("online-users-count");
    if (onlineUsersCountElement) {
      onlineUsersCountElement.textContent = data.count; // Update online count
    }

    // Display the online user list
    const onlineUsersList = document.getElementById("online-users-list");
    if (onlineUsersList) {
      onlineUsersList.innerHTML = ""; // Clear previous list
      data.users.forEach((user) => {
        const listItem = document.createElement("li");
        listItem.textContent = user;
        onlineUsersList.appendChild(listItem);
      });
    }
  }

  if (data.type === "chatMessage") {
    // Append new chat message
    const messageList = document.getElementById("message-list");
    const messageItem = document.createElement("div");
    messageItem.classList.add("message-item");
    messageItem.innerHTML = `
      <strong>${data.senderUsername}</strong>: ${data.content}
      <small>${new Date(data.createdAt).toLocaleTimeString()}</small>
    `;
    messageList.appendChild(messageItem);
    messageList.scrollTop = messageList.scrollHeight; // Auto-scroll to the bottom
  }
});

socket.addEventListener("error", (error) => console.error("WebSocket error:", error));
socket.addEventListener("close", () => console.warn("WebSocket connection closed."));

webSocket.onmessage = (event) => {
  console.log("WebSocket message event fired! Raw message:", event.data);
  try {
    const data = JSON.parse(event.data);

    if (data.type === "onlineCount") {
      document.getElementById("online-users-count").textContent = data.count;
    }

    if (data.senderUsername && data.content) {
      displayMessage(data.senderUsername, data.content, data.createdAt);
    }
  } catch (error) {
    console.error("Error processing WebSocket message:", error);
  }
};

function displayMessage(username, content, timestamp) {
  const messageList = document.getElementById("message-list");
  if (!messageList) {
    console.error("Message list container not found in DOM!");
    return;
  }

  const messageItem = document.createElement("div");
  messageItem.classList.add("message-item");
  messageItem.innerHTML = `<strong>${username}:</strong> ${content} - ${new Date(
    timestamp
  ).toLocaleTimeString()}`;

  messageList.appendChild(messageItem);
  messageList.scrollTop = messageList.scrollHeight;

  console.log("Message appended to DOM:", messageItem.innerHTML);
}

document.getElementById("message-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("message-input");
  if (input.value.trim()) {
   // socket.send(JSON.stringify({ type: "message", senderId: userId, content: input.value.trim() }));
   // input.value = ""; // Clear the input field
    webSocket.send(
      JSON.stringify({
        type: "message",
        senderId: userId,
        content: input.value.trim(),
      })
    );
    input.value = "";
  }
});
