// Establish WebSocket connection
const webSocket = new WebSocket("ws://localhost:3000/chat");

// WebSocket event handlers
webSocket.onopen = () => {
  console.log("WebSocket connection established.");
  webSocket.send(JSON.stringify({ type: "join", username }));
};

webSocket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  // Update online user count
  if (data.type === "onlineCount") {
    document.getElementById("online-users-count").textContent = data.count;
  }

  // Display incoming messages
  else if (data.senderUsername) {
    displayMessage(data.senderUsername, data.content, data.createdAt);
  }
};

// Display messages in chat
function displayMessage(username, content, timestamp) {
  const messageList = document.getElementById("message-list");
  const messageItem = document.createElement("div");
  messageItem.innerHTML = `
    <strong>${username}</strong>: ${content} <small>${new Date(
    timestamp
  ).toLocaleTimeString()}</small>
  `;
  messageList.appendChild(messageItem);
  messageList.scrollTop = messageList.scrollHeight; // Auto-scroll
}

// Send message handler
document.getElementById("message-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("message-input");
  if (input.value.trim()) {
    webSocket.send(
      JSON.stringify({
        type: "message",
        senderId: userId,
        content: input.value,
      })
    );
    input.value = ""; // Clear input field after sending
  }
});
