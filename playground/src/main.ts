import "./style.css";
import { setup as setupChat } from "./demos/chat";
import { setup as setupStore } from "./demos/store";
import { setup as setupAsync } from "./demos/async";
import { setup as setupCommands } from "./demos/commands";
import { setup as setupComposition } from "./demos/composition";

// ── Tab navigation ──
const navButtons = document.querySelectorAll<HTMLButtonElement>(".nav-btn");
const panels = document.querySelectorAll<HTMLElement>(".demo-panel");

const demoSetupMap: Record<string, { setup: () => void; initialized: boolean }> = {
  chat: { setup: setupChat, initialized: false },
  store: { setup: setupStore, initialized: false },
  async: { setup: setupAsync, initialized: false },
  commands: { setup: setupCommands, initialized: false },
  composition: { setup: setupComposition, initialized: false },
};

function switchDemo(demoId: string) {
  // Update nav
  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.demo === demoId);
  });

  // Update panels
  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `demo-${demoId}`);
  });

  // Lazy-init the demo
  const entry = demoSetupMap[demoId];
  if (entry && !entry.initialized) {
    entry.initialized = true;
    entry.setup();
  }
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const demoId = btn.dataset.demo;
    if (demoId) switchDemo(demoId);
  });
});

// Init the default tab (chat)
switchDemo("chat");
