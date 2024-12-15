// Establish WebSocket connection
const webSocket = new WebSocket("ws://localhost:3000/chat");

// Notify server when WebSocket connection is established
webSocket.onopen = () => {
  console.log("WebSocket connection established.");
  webSocket.send(JSON.stringify({ type: "join", username }));
};

// Handle incoming WebSocket messages
webSocket.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    console.log(data);
    console.log("WebSocket message received:", data);

    // Handle online user count updates
    if (data.type === "onlineCount") {
      const onlineUsersCountElement =
        document.getElementById("online-users-count");
      if (onlineUsersCountElement) {
        onlineUsersCountElement.textContent = data.count;
        console.log("Updated online users count:", data.count);
      }
    }

    // Handle incoming chat messages
    if (data.senderUsername && data.content) {
      console.log("Chat message received:", data);
      displayMessage(data.senderUsername, data.content, data.createdAt);
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

// Function to display messages in the chat
function displayMessage(username, content, timestamp) {
  console.log("Inside display message function");
  const messageList = document.getElementById("message-list");

  if (!messageList) {
    console.error("Message list container (#message-list) not found.");
    return;
  }
  console.log(messageList);
  const messageItem = document.createElement("div");
  messageItem.classList.add("message-item");
  messageItem.innerHTML = `
    <strong>${username}</strong>: ${content}
    <small>${new Date(timestamp).toLocaleTimeString()}</small>
  `;

  messageList.appendChild(messageItem);
  messageList.scrollTop = messageList.scrollHeight; // Auto-scroll to the newest message
  console.log("Message appended to DOM:", messageItem.innerHTML);
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
