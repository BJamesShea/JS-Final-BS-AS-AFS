document.addEventListener("DOMContentLoaded", () => {
  const socket = new WebSocket("ws://localhost:3000/chat");

  const usernameElement = document.getElementById("username");
  const userIdElement = document.getElementById("userId");
  const username = usernameElement ? usernameElement.value : "Anonymous";
  const userId = userIdElement ? userIdElement.value : null;

  // Handle WebSocket connection and events
  socket.addEventListener("open", () => {
    console.log("WebSocket connection established.");
    socket.send(JSON.stringify({ type: "join", username })); // Send 'join' event with username
  });

  socket.addEventListener("message", (event) => {
    try {
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
        displayMessage(data.senderUsername, data.content, data.createdAt);
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  });

  socket.addEventListener("error", (error) => console.error("WebSocket error:", error));
  socket.addEventListener("close", () => console.warn("WebSocket connection closed."));

  // Message Submission
  const messageForm = document.getElementById("message-form");
  if (messageForm) {
    messageForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("message-input");
      if (input && input.value.trim()) {
        socket.send(
          JSON.stringify({
            type: "message",
            senderId: userId,
            content: input.value.trim(),
          })
        );
        input.value = ""; // Clear the input field
      }
    });
  }

  function displayMessage(username, content, timestamp) {
    const messageList = document.getElementById("message-list");
    if (!messageList) {
      console.error("Message list container not found in DOM!");
      return;
    }

    const messageItem = document.createElement("div");
    messageItem.classList.add("message-item");
    messageItem.innerHTML = `
      <strong>${username}:</strong> ${content} 
      <small>${new Date(timestamp).toLocaleTimeString()}</small>
    `;

    messageList.appendChild(messageItem);
    messageList.scrollTop = messageList.scrollHeight;

    console.log("Message appended to DOM:", messageItem.innerHTML);
  }
});
