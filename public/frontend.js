<<<<<<< HEAD
const socket = new WebSocket("ws://localhost:3000/chat");
const username = document.getElementById("username").value; // Dynamically retrieve username
const userId = document.getElementById("userId").value; // Dynamically retrieve userId

// Handle WebSocket connection and events
socket.addEventListener("open", () => {
=======
const webSocket = new WebSocket("ws://localhost:3000/chat");

console.log("Attempting WebSocket connection...");
console.log("WebSocket URL: ws://localhost:3000/chat");

webSocket.onopen = () => {
>>>>>>> a7ec288b4c6c6eada0df5ddb4405ca3e09ef8597
  console.log("WebSocket connection established.");
  socket.send(JSON.stringify({ type: "join", username })); // Send 'join' event with username
});

<<<<<<< HEAD
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

// Handle message form submission
=======
webSocket.onmessage = (event) => {
  console.log("WebSocket message event fired! Raw message:", event.data);
  try {
    const data = JSON.parse(event.data);
    console.log("Parsed WebSocket data:", data);

    if (data.type === "onlineCount") {
      document.getElementById("online-users-count").textContent = data.count;
    }

    if (data.senderUsername && data.content) {
      console.log("Calling displayMessage with:", {
        username: data.senderUsername,
        content: data.content,
        createdAt: data.createdAt,
      });
      displayMessage(data.senderUsername, data.content, data.createdAt);
    }
  } catch (error) {
    console.error("Error processing WebSocket message:", error);
  }
};

webSocket.onclose = () => {
  console.warn("WebSocket closed. Reconnecting...");
  setTimeout(() => location.reload(), 3000);
};

function displayMessage(username, content, timestamp) {
  console.log("Appending message:", { username, content, timestamp });

  const messageList = document.getElementById("message-list");
  if (!messageList) {
    console.error("Message list container not found in DOM!");
    return;
  }

  const messageItem = document.createElement("div");
  messageItem.classList.add("message-item");
  messageItem.textContent = `${username}: ${content} - ${new Date(
    timestamp
  ).toLocaleTimeString()}`;

  messageList.appendChild(messageItem);
  messageList.scrollTop = messageList.scrollHeight;

  console.log("Message appended to DOM:", messageItem.textContent);
}

>>>>>>> a7ec288b4c6c6eada0df5ddb4405ca3e09ef8597
document.getElementById("message-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("message-input");
  if (input.value.trim()) {
<<<<<<< HEAD
    socket.send(JSON.stringify({ type: "message", senderId: userId, content: input.value.trim() }));
    input.value = ""; // Clear the input field
=======
    webSocket.send(
      JSON.stringify({
        type: "message",
        senderId: userId,
        content: input.value.trim(),
      })
    );
    input.value = "";
>>>>>>> a7ec288b4c6c6eada0df5ddb4405ca3e09ef8597
  }
});
