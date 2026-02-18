import { createChatController } from "./src/ai/createChatController";
import { Observable } from "rxjs";

// A mock AI model that simulates streaming text
const mockModel = {
  complete: ({ messages }: { messages: Array<{ content: string }>; signal: AbortSignal }) =>
    new Observable<string>((subscriber) => {
      const userMessage = messages[messages.length - 1];
      const responses = [
        "Thinking...",
        " ",
        "I received your message: ",
        `"${userMessage?.content ?? "nothing"}".`,
        " ",
        "Simulating a stream...",
        " Done!",
      ];

      let i = 0;
      const interval = setInterval(() => {
        if (i >= responses.length) {
          clearInterval(interval);
          subscriber.complete();
          return;
        }
        subscriber.next(responses[i]);
        i++;
      }, 300);

      // Clean up interval if cancelled
      return () => clearInterval(interval);
    }),
};

// Create the controller
const chat = createChatController(mockModel);

// 1. Subscribe to status changes
chat.status$.subscribe((status) => {
  console.log(`[STATUS]: ${status}`);
});

// 2. Subscribe to messages to see the chat log update in real-time
chat.messages$.subscribe((messages) => {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && lastMessage.role === "assistant") {
    // Clear console and print fresh state (simple simulation)
    // console.clear(); 
    console.log(`[ASSISTANT]: ${lastMessage.content}`);
  }
});

console.log("--- Starting Chat Demo ---");
// 3. Send a message
console.log("[USER]: Hello RxJS-AI!");
chat.send("Hello RxJS-AI!");

// 4. Simulate user cancelling after 1 second (demonstrating RxJS power)
/*
setTimeout(() => {
    console.log("\n!!! User Clicked Cancel !!!");
    chat.cancel();
}, 1000);
*/
