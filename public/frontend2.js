// Send a chat message
document.getElementById("message-form").addEventListener("submit", (e) => {
    e.preventDefault(); // Prevent form submission
  
    const messageInput = document.getElementById("message-input");
    const content = messageInput.value.trim(); // Get message content
  
    if (content) {
      // Send message via WebSocket
      webSocket.send(
        JSON.stringify({
          type: "message",
          senderId: userId, // Ensure userId is sent from the server
          sender: username, // Send username for display
          content,
        })
      );
  
      messageInput.value = ""; // Clear the input field
    }
  });
  