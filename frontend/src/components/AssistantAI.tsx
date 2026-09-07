import { useState, useEffect, useRef } from "react";
import {
  Send,
  Plus,
  Zap,
  Activity,
  Lightbulb,
  X,
  Minus,
  Maximize2,
  ShieldCheck,
  Radio,
  Clock,
  Sparkles,
  Layers,
  HelpCircle,
  BarChart3,
  Cpu,
} from "lucide-react";

export type LiveTelemetryContext = {
  totalPower?: number;
  connectedRoomsCount?: number;
  activeAlertsCount?: number;
  rooms?: {
    id: string;
    room_code: string;
    name: string;
    connected: boolean;
    power: number;
    occupancy: string;
  }[];
};

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
  timestamp: string;
  isTelemetry?: boolean;
};

const SUGGESTED_CHIPS = [
  "What is WattWise?",
  "What is the current power?",
  "How does wastage detection work?",
  "How do I connect hardware?",
  "What problem does WattWise solve?",
  "What does AI do?",
  "What happens when hardware is disconnected?",
  "Tell me about the project",
];

/* Custom SVG Logo: AI Intelligence + Electric Energy Matrix */
export function AssistantAILogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="WattWise AI Logo"
    >
      <defs>
        <linearGradient id="aiGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#32d6ef" />
          <stop offset="0.5" stopColor="#4f8cff" />
          <stop offset="1" stopColor="#8b7cf8" />
        </linearGradient>
        <filter id="aiGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="glow" />
          <feComposite in="SourceGraphic" in2="glow" operator="over" />
        </filter>
      </defs>
      {/* Outer Hex/Circuit Frame */}
      <path
        d="M16 3L27 9.5V22.5L16 29L5 22.5V9.5L16 3Z"
        stroke="url(#aiGrad)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(8, 22, 40, 0.6)"
      />
      {/* Circuit Nodes */}
      <circle cx="16" cy="3" r="1.5" fill="#32d6ef" />
      <circle cx="27" cy="9.5" r="1.5" fill="#4f8cff" />
      <circle cx="27" cy="22.5" r="1.5" fill="#8b7cf8" />
      <circle cx="16" cy="29" r="1.5" fill="#32d6ef" />
      <circle cx="5" cy="22.5" r="1.5" fill="#4f8cff" />
      <circle cx="5" cy="9.5" r="1.5" fill="#8b7cf8" />
      {/* Center Energy Pulse / Intelligence Core */}
      <path
        d="M17.5 8L11 17H16.5L14.5 24L22 14.5H16.5L17.5 8Z"
        fill="url(#aiGrad)"
        filter="url(#aiGlow)"
      />
    </svg>
  );
}

export function generateAssistantReply(
  question: string,
  telemetry?: LiveTelemetryContext
): string {
  const q = question.trim().toLowerCase();

  // Greetings
  if (
    q === "hi" ||
    q === "hello" ||
    q === "hey" ||
    q.startsWith("hi ") ||
    q.startsWith("hello ") ||
    q.startsWith("good morning") ||
    q.startsWith("good afternoon") ||
    q.startsWith("good evening")
  ) {
    return "Greetings. I am the WattWise AI Assistant. How may I assist you with energy monitoring, ESP32 telemetry, or wastage detection today?";
  }

  // Real-time telemetry check: current power / load / readings
  if (
    q.includes("current power") ||
    q.includes("current load") ||
    q.includes("live power") ||
    q.includes("what is the power") ||
    q.includes("power right now") ||
    q.includes("how much power") ||
    q.includes("how much energy")
  ) {
    if (telemetry && telemetry.totalPower !== undefined && telemetry.totalPower > 0) {
      const activeRooms = telemetry.rooms?.filter((r) => r.connected && r.power > 0) ?? [];
      const roomDetails = activeRooms
        .map((r) => `${r.name} (${r.room_code}): ${r.power.toFixed(1)} W [${r.occupancy}]`)
        .join(", ");
      return `Verified live telemetry: The current aggregate electrical load across connected spaces is ${telemetry.totalPower.toFixed(1)} W across ${telemetry.connectedRoomsCount ?? activeRooms.length} active room(s). ${roomDetails ? `Details: ${roomDetails}.` : ""}`;
    }
    return "Real-time power data is currently unavailable. No active ESP32 telemetry is currently streaming to the system (live load is 0.0 W, waiting for sensor data). To connect hardware, navigate to the Connect Hardware page.";
  }

  // Room status check
  if (q.includes("room status") || q.includes("which rooms") || q.includes("connected rooms")) {
    if (telemetry && telemetry.rooms && telemetry.rooms.length > 0) {
      const connected = telemetry.rooms.filter((r) => r.connected);
      if (connected.length > 0) {
        const list = connected.map((r) => `${r.name} (${r.room_code}): ${r.power.toFixed(1)} W, ${r.occupancy}`).join("; ");
        return `Currently, ${connected.length} of ${telemetry.rooms.length} room(s) have active telemetry connections: ${list}.`;
      }
      return `There are ${telemetry.rooms.length} configured room(s), but none are actively streaming sensor data. All rooms are in a waiting/offline state.`;
    }
    return "Room telemetry information is currently waiting for sensor data. Open the Rooms page to view configured spaces.";
  }

  // Active alerts check
  if (q.includes("active alert") || q.includes("any alert") || q.includes("current alert")) {
    if (telemetry && telemetry.activeAlertsCount !== undefined) {
      if (telemetry.activeAlertsCount > 0) {
        return `There are currently ${telemetry.activeAlertsCount} unacknowledged system alert(s) requiring attention. View the Alerts page for incident timestamps and room details.`;
      }
      return "There are currently 0 active or unacknowledged wastage alerts. All monitored rooms are within normal operating thresholds.";
    }
    return "No active wastage alerts are registered in the system.";
  }

  // What is WattWise
  if (q.includes("what is wattwise") || q.includes("about wattwise") || q.includes("what does wattwise do")) {
    return "WattWise is an AI-powered smart electricity conservation platform designed to monitor room-level electrical consumption through connected IoT sensors, identify unoccupied energy wastage, provide real-time analytics, and assist administrators in reducing unnecessary power usage.";
  }

  // Problem statement
  if (q.includes("problem") || q.includes("why wattwise") || q.includes("solve")) {
    return "Educational and commercial facilities frequently waste substantial electricity when lights, fans, air conditioners, and lab equipment continue running in rooms that are no longer occupied. Manual inspection is inefficient, allowing continuous wastage to remain unnoticed. WattWise automates this detection in real time.";
  }

  // Proposed solution
  if (q.includes("solution") || q.includes("how does wattwise solve")) {
    return "WattWise combines ESP32 microcontrollers, electrical sensors (voltage, current, power, energy), and PIR motion sensors with an automated backend and intelligent dashboard. It continuously evaluates room occupancy against power demand, flagging prolonged unoccupied consumption.";
  }

  // How WattWise works
  if (q.includes("how does it work") || q.includes("how wattwise works") || q.includes("workflow") || q.includes("architecture")) {
    return "The complete WattWise workflow operates in four stages: 1) ESP32 microcontrollers and sensors collect electrical and motion data; 2) Data is transmitted via authenticated HTTPS/JSON to the backend; 3) The backend logs readings in SQLite and evaluates the 20-minute unoccupied wastage rule; 4) The frontend displays live telemetry, triggers alerts, and generates AI insights.";
  }

  // Connect Hardware
  if (q.includes("connect hardware") || q.includes("how do i connect") || q.includes("how to connect") || q.includes("provision")) {
    return "Connect Hardware follows a 4-step workflow: 1) Enter the ESP32 Device ID and name; 2) Select the target room to monitor; 3) Select attached sensors (Electricity and/or PIR occupancy); 4) Confirm to receive a secure device API key. Program this key and device ID into your ESP32 firmware to begin streaming telemetry.";
  }

  // ESP32 / Devices
  if (q.includes("esp32") || q.includes("what is an esp32") || q.includes("device")) {
    return "The ESP32 is a low-power Wi-Fi enabled microcontroller. In WattWise, each ESP32 acts as a dedicated hardware node installed in a room to collect sensor data from current transformers, voltage sensors, and PIR occupancy sensors, and send encrypted readings to the platform.";
  }

  // Sensors
  if (q.includes("sensor") || q.includes("pir") || q.includes("occupancy")) {
    return "WattWise supports two primary sensor categories: 1) Electricity Sensors (measuring voltage, current, active power in Watts, and cumulative energy in kWh), and 2) PIR Occupancy Sensors (detecting physical room presence and motion). Sensors display 'Waiting for Data' until hardware transmits real readings.";
  }

  // Wastage detection / 20-minute rule
  if (q.includes("wastage") || q.includes("20-minute") || q.includes("twenty minute") || q.includes("detect wastage") || q.includes("waste")) {
    return "Wastage is detected when a room is UNOCCUPIED (PIR motion = 0), ELECTRICITY IS RUNNING (current above the 0.10 A threshold), and this condition persists continuously for MORE THAN 20 MINUTES. When triggered, WattWise creates an administrative alert. Duplicate alerts for the same continuous event are prevented.";
  }

  // Alerts & Notifications
  if (q.includes("alert") || q.includes("notification") || q.includes("receive a wastage alert")) {
    return "Administrators receive an alert whenever the 20-minute unoccupied wastage threshold is met. Alerts detail the room name, measured current and power, duration, and timestamp. Alerts can be reviewed and acknowledged in the Alerts section.";
  }

  // AI & AI Insights
  if (q.includes("ai") || q.includes("insight") || q.includes("artificial intelligence") || q.includes("role of ai")) {
    return "WattWise AI analyzes stored sensor readings to identify peak load periods, calculate baseline idle power draw, measure unoccupied energy loss, and provide optimization recommendations. AI analysis is strictly grounded in real sensor data and never invents measurements.";
  }

  // Analytics
  if (q.includes("analytics") || q.includes("charts") || q.includes("trend")) {
    return "The Analytics page provides empirical charts of power load trends, cumulative energy consumption, occupancy correlations, and wastage durations derived from database records. When no telemetry is available, a clean empty state is shown.";
  }

  // Disconnected / Offline Hardware
  if (q.includes("disconnect") || q.includes("offline") || q.includes("sensor freshness") || q.includes("hardware disconnected")) {
    return "When an ESP32 stops transmitting data beyond the configured freshness timeout (default 90 seconds), WattWise marks the device and sensors as Offline/Waiting. Power readings return to 0 W to guarantee that no fake readings are displayed.";
  }

  // Settings
  if (q.includes("setting") || q.includes("threshold") || q.includes("configure")) {
    return "Settings allow administrators to adjust the active current threshold (default 0.10 A), the wastage alert duration threshold (default 20 minutes), and the sensor freshness timeout (default 90 seconds).";
  }

  // Project overview / Tell me about the project
  if (q.includes("tell me about") || q.includes("project") || q.includes("summary")) {
    return "WattWise is a smart energy conservation platform. It connects ESP32 microcontrollers and sensors to rooms, monitors real-time electricity and occupancy, detects unattended energy consumption with a 20-minute verification rule, and provides intelligent analytics to reduce waste.";
  }

  // Electrical definitions
  if (q.includes("voltage")) {
    return "Voltage (V) represents electrical potential difference. WattWise records voltage from calibrated sensors to calculate real-time power demand.";
  }
  if (q.includes("current")) {
    return "Current (A) is the flow of electric charge. WattWise evaluates current against the active threshold (0.10 A) to determine whether electrical appliances are active.";
  }
  if (q.includes("power") && !q.includes("current power")) {
    return "Power (W) is the instantaneous rate of energy consumption (P = V × I). WattWise graphs live power to pinpoint peak loads.";
  }
  if (q.includes("energy")) {
    return "Energy (kWh) is the cumulative electricity consumed over time. WattWise tracks total kWh to evaluate efficiency and institutional savings.";
  }

  // Fallback
  return "I can answer questions regarding WattWise architecture, ESP32 hardware, electricity sensors, PIR occupancy, Connect Hardware provisioning, the 20-minute wastage rule, analytics, and live telemetry. What would you like to explore?";
}

interface AssistantAIProps {
  telemetry?: LiveTelemetryContext;
}

export default function AssistantAI({ telemetry }: AssistantAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Welcome to WattWise Assistant. I am your intelligent guide for electricity monitoring, ESP32 telemetry, and wastage conservation. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const sendMessage = (textToSend?: string) => {
    const userText = (textToSend ?? input).trim();
    if (!userText) return;

    const userMessage: Message = {
      id: "user-" + Date.now(),
      role: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const replyText = generateAssistantReply(userText, telemetry);
    const assistantMessage: Message = {
      id: "ai-" + Date.now(),
      role: "assistant",
      text: replyText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isTelemetry: userText.toLowerCase().includes("power") || userText.toLowerCase().includes("load"),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
  };

  const startNewConversation = () => {
    setMessages([
      {
        id: "welcome-new-" + Date.now(),
        role: "assistant",
        text: "New conversation initiated. Ask me about WattWise operations, hardware integration, or live electrical measurements.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInput("");
  };

  const isLive = Boolean(telemetry && (telemetry.totalPower ?? 0) > 0);

  return (
    <div className="floating-assistant-container" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9990 }}>
      {/* FLOATING TRIGGER BUTTON */}
      {!isOpen && (
        <button
          className="floating-assistant-launcher"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          aria-label="Open WattWise AI Assistant"
          title="WattWise AI Assistant"
        >
          <div className="launcher-pulse-ring" />
          <div className="launcher-icon-wrapper">
            <AssistantAILogo size={26} />
          </div>
          <span className="launcher-label">AI Assistant</span>
          {isLive ? <span className="launcher-live-badge" title="Live Telemetry Available" /> : null}
        </button>
      )}

      {/* FLOATING CHAT WINDOW */}
      {isOpen && (
        <div
          className={`floating-assistant-panel ${isMinimized ? "minimized" : ""}`}
          role="dialog"
          aria-label="WattWise AI Assistant"
        >
          {/* HEADER */}
          <div className="assistant-header-bar">
            <div className="assistant-header-identity">
              <div className="assistant-avatar-badge">
                <AssistantAILogo size={22} />
              </div>
              <div>
                <div className="assistant-title-row">
                  <strong>WattWise Assistant</strong>
                  <span className={`assistant-status-pill ${isLive ? "live" : "ready"}`}>
                    <span className="status-micro-dot" />
                    {isLive ? "Telemetry Active" : "Ready"}
                  </span>
                </div>
                <small className="assistant-sublabel">Smart Energy Intelligence</small>
              </div>
            </div>

            <div className="assistant-header-controls">
              <button
                className="header-ctrl-btn"
                onClick={startNewConversation}
                title="New Conversation"
                aria-label="New Conversation"
              >
                <Plus size={15} />
              </button>
              <button
                className="header-ctrl-btn"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
                aria-label={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 size={14} /> : <Minus size={14} />}
              </button>
              <button
                className="header-ctrl-btn close-btn"
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                aria-label="Close Assistant"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* EXPANDED CONTENT BODY */}
          {!isMinimized && (
            <>
              {/* MESSAGES SCROLL AREA */}
              <div className="assistant-conversation-feed">
                {messages.map((msg) => (
                  <div key={msg.id} className={`chat-bubble-row ${msg.role}`}>
                    {msg.role === "assistant" && (
                      <div className="chat-bot-avatar">
                        <AssistantAILogo size={16} />
                      </div>
                    )}
                    <div className="chat-bubble-content">
                      <div className="chat-bubble-meta">
                        <span className="sender-name">{msg.role === "assistant" ? "WattWise AI" : "You"}</span>
                        <span className="message-time">{msg.timestamp}</span>
                      </div>
                      <p className="chat-text">{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* SUGGESTED PROMPT CHIPS */}
              <div className="assistant-suggestions-tray">
                <span className="suggestions-kicker">Quick queries</span>
                <div className="suggestions-scroll">
                  {SUGGESTED_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      className="suggested-chip-btn"
                      onClick={() => sendMessage(chip)}
                      type="button"
                    >
                      <Sparkles size={11} className="chip-sparkle" />
                      <span>{chip}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* INPUT BAR */}
              <form
                className="assistant-input-tray"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
              >
                <div className="input-enclosure">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask WattWise Assistant..."
                    aria-label="Ask WattWise AI Assistant"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="assistant-send-btn"
                    disabled={!input.trim()}
                    aria-label="Send message"
                  >
                    <Send size={15} />
                  </button>
                </div>
                <div className="assistant-footer-caption">
                  <span>Grounded in verified IoT telemetry. Zero fabricated metrics.</span>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
