// Establish WebSocket connection
const webSocket = new WebSocket("ws://localhost:3000/chat");

// Notify server when WebSocket connection is established
webSocket.onopen = () => {
  console.log("WebSocket connection established.");
  webSocket.send(JSON.stringify({ type: "join", username }));
};

setInterval(() => {
  console.log("WebSocket readyState:", webSocket.readyState);
}, 5000);

webSocket.onmessage = (event) => {
  console.log("Raw WebSocket data:", event.data); // Log raw data first
  try {
    const data = JSON.parse(event.data);
    console.log("Parsed WebSocket message:", data);

    if (data.type === "onlineCount") {
      const onlineUsersCountElement =
        document.getElementById("online-users-count");
      if (onlineUsersCountElement) {
        onlineUsersCountElement.textContent = data.count;
      }
    }

    if (data.senderUsername && data.content) {
      console.log("Calling displayMessage with:", {
        username: data.senderUsername,
        content: data.content,
        createdAt: data.createdAt,
      });
      displayMessage(data.senderUsername, data.content, data.createdAt);
    } else {
      console.warn("Invalid message data received:", data);
    }
  } catch (error) {
    console.error("Error processing WebSocket message:", error);
  }
};

// Handle WebSocket errors and closure
webSocket.onerror = (error) => {
  console.error("WebSocket error:", error);
};

webSocket.onclose = () => {
  console.warn("WebSocket connection closed.");
};

function displayMessage(username, content, timestamp) {
  console.log("Inside displayMessage");
  console.log("Params:", { username, content, timestamp });

  if (!username || !content || !timestamp) {
    console.error("Invalid parameters passed to displayMessage:", {
      username,
      content,
      timestamp,
    });
    return;
  }

  const messageList = document.getElementById("message-list");

  if (!messageList) {
    console.error("Message list container (#message-list) not found.");
    return;
  }

  const messageItem = document.createElement("div");
  messageItem.classList.add("message-item");
  messageItem.innerHTML = `
    <strong>${username}</strong>: ${content}
    <small>${new Date(timestamp).toLocaleTimeString()}</small>
  `;

  messageList.appendChild(messageItem);
  messageList.scrollTop = messageList.scrollHeight;

  console.log("Message appended to DOM:", messageItem);
}

// Message form submission handler
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
    console.log("Message sent to server:", input.value.trim());
    input.value = ""; // Clear input
  } else {
    console.warn("Empty message. Ignored.");
  }
});
