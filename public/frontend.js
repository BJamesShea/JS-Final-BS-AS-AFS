document.addEventListener("DOMContentLoaded", () => {
  const webSocket = new WebSocket("ws://localhost:3000/chat");

  console.log("Attempting WebSocket connection...");
  console.log("WebSocket URL: ws://localhost:3000/chat");

  webSocket.onopen = () => {
    console.log("WebSocket connection established.");
    webSocket.send(JSON.stringify({ type: "join", username }));
  };

  webSocket.onmessage = (event) => {
    console.log("WebSocket message received:", event.data); // Log raw WebSocket message
    try {
      const data = JSON.parse(event.data);

      // Debug: Ensure data type and users list exist
      console.log("WebSocket data type:", data.type);
      console.log("Received WebSocket data:", data);

      // Check for online users update
      if (data.type === "onlineUsers") {
        console.log("Online users list received:", data.users);

        // Update the user count
        const onlineUsersCountElement =
          document.getElementById("online-users-count");
        if (onlineUsersCountElement) {
          console.log("Updating online user count to:", data.users.length);
          onlineUsersCountElement.textContent = data.users.length; // Update count
        } else {
          console.error(
            "Element with ID 'online-users-count' not found in DOM!"
          );
        }

        // Update the user list
        const onlineUsersList = document.getElementById("online-users-list");
        if (onlineUsersList) {
          console.log("Updating user list with:", data.users);
          onlineUsersList.innerHTML = ""; // Clear the existing list
          data.users.forEach((username) => {
            const listItem = document.createElement("li");
            listItem.textContent = username;
            onlineUsersList.appendChild(listItem);
          });
        } else {
          console.error(
            "Element with ID 'online-users-list' not found in DOM!"
          );
        }
      }

      // Handle incoming chat messages
      if (data.senderUsername && data.content) {
        console.log("New chat message:", data);
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
});
