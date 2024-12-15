// WebSocket setup
const webSocket = new WebSocket("ws://localhost:3000/chat");

// WebSocket event handlers
webSocket.onopen = () => {
  console.log("WebSocket connection established.");
  webSocket.send(JSON.stringify({ type: "join", username }));
};

webSocket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  // Handle online user count update
  if (data.type === "onlineCount") {
    document.getElementById("online-users-count").textContent = data.count;
  }

  // Handle new messages
  else if (data.senderUsername) {
    console.log("Message received:", data); // Log to browser console
    displayMessage(data.senderUsername, data.content, data.createdAt);
  }
};

// Helper function to display messages
function displayMessage(username, content, timestamp) {
  const messageList = document.getElementById("message-list");
  const messageItem = document.createElement("div");
  messageItem.classList.add("message-item");
  messageItem.innerHTML = `
    <strong>${username}</strong>: ${content} <small>${new Date(
    timestamp
  ).toLocaleTimeString()}</small>
  `;
  messageList.appendChild(messageItem);
  messageList.scrollTop = messageList.scrollHeight; // Auto-scroll to the latest message
}

// Message submission handler
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
