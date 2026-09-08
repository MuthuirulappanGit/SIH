import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  Navigate,
  NavLink,
  Route,
  Routes,
} from "react-router-dom";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Cable,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  DoorOpen,
  Gauge,
  HelpCircle,
  Info,
  Layers,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unplug,
  UserRound,
  Wifi,
  X,
  Zap,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AssistantAI, { type LiveTelemetryContext } from "./components/AssistantAI";

/* =========================================================
   TYPES
========================================================= */

type Room = {
  id: string;
  room_code: string;
  name: string;
  building: string;
  floor: string;
  description: string;
  latest?: Latest;
};

type Latest = {
  connected: boolean;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  occupancy: string;
  lastUpdate: string | null;
  deviceStatus: string;
  electricityStatus: string;
  pirStatus: string;
};

type Sensor = {
  id: string;
  sensor_id: string;
  name: string;
  type: string;
  model: string;
  room_id: string | null;
  room_name?: string;
  device_code?: string;
  status: string;
  gpio_pin: string;
  interface: string;
  unit: string;
};

type Device = {
  id: string;
  deviceId: string;
  name: string;
  roomId?: string | null;
  firmwareVersion: string;
  lastSeenAt?: string | null;
  status: string;
};

type NotificationItem = {
  id: string;
  room_id: string;
  room?: string;
  type: string;
  severity: string;
  message: string;
  current: number | null;
  power: number | null;
  started_at: string | null;
  detected_at: string;
  acknowledged: number;
  acknowledged_at: string | null;
};

type Settings = {
  currentThreshold: number;
  alertDurationMinutes: number;
  sensorFreshnessSeconds: number;
};

type AnalyticsData = {
  totals: {
    count: number;
    energy: number;
    averagePower: number;
    peakPower: number;
    averageCurrent: number;
  };
  series: {
    time: string;
    power: number;
    energy: number;
  }[];
  occupancy: {
    timestamp: string;
    motionDetected: number;
  }[];
  wastage: {
    events: number;
    duration: number;
  };
};

type AIInsightsData = {
  hasData: boolean;
  message: string;
  summary: string;
  insights: {
    type: "trend" | "anomaly" | "optimization" | "benchmark";
    title: string;
    description: string;
    severity: "low" | "medium" | "high";
  }[];
  recommendations: {
    title: string;
    detail: string;
    impact: string;
  }[];
  metrics: {
    efficiencyScore: number;
    wastedEnergyKwh: number;
    totalMonitoredKwh: number;
    activeAnomalies: number;
  };
};

/* =========================================================
   API HELPER
========================================================= */

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    credentials: "include",
  });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? `API request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/* =========================================================
   ROOT APP
========================================================= */

export default function App() {
  const [user, setUser] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const data = await api<{ user: { username: string } }>("/api/auth/me");
      setUser(data.user.username);
    } catch {
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  if (checking) {
    return (
      <div className="loading-shell">
        <div className="loading-spinner" />
        <span>Initializing WattWise Platform...</span>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return <AppShell user={user} onLogout={() => setUser(null)} />;
}

/* =========================================================
   LOGIN
========================================================= */

function Login({ onLogin }: { onLogin: (user: string) => void }) {
  const [username, setUsername] = useState("Admin123");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const result = await api<{ user: { username: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onLogin(result.user.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">
            <Zap size={18} />
          </div>
          <div>
            <strong>WATTWISE</strong>
            <span className="brand-sub">ENERGY CONSERVATION PLATFORM</span>
          </div>
        </div>

        <div className="login-header">
          <h2>Administrator Access</h2>
          <p>Authenticate to access energy telemetry and device configuration.</p>
        </div>

        <form onSubmit={submit} className="login-form">
          <label>
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter administrator password"
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? "Authenticating..." : "Sign in to Console"}
          </button>
        </form>

        <div className="login-footer-info">
          <ShieldCheck size={14} />
          <span>Real IoT telemetry. Hardware encryption enabled.</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   APP SHELL
========================================================= */

function AppShell({ user, onLogout }: { user: string; onLogout: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [telemetryContext, setTelemetryContext] = useState<LiveTelemetryContext>({
    totalPower: 0,
    connectedRoomsCount: 0,
    activeAlertsCount: 0,
    rooms: [],
  });

  const refreshGlobalTelemetry = useCallback(async () => {
    try {
      const data = await api<{ rooms: Room[]; unread: number }>("/api/dashboard");
      setUnreadCount(data.unread ?? 0);

      const totalPower = (data.rooms ?? []).reduce(
        (acc, r) => acc + (r.latest?.power ?? 0),
        0
      );
      const connectedRooms = (data.rooms ?? []).filter((r) => r.latest?.connected);

      setTelemetryContext({
        totalPower,
        connectedRoomsCount: connectedRooms.length,
        activeAlertsCount: data.unread ?? 0,
        rooms: (data.rooms ?? []).map((r) => ({
          id: r.id,
          room_code: r.room_code,
          name: r.name,
          connected: Boolean(r.latest?.connected),
          power: r.latest?.power ?? 0,
          occupancy: r.latest?.occupancy ?? "waiting",
        })),
      });
    } catch {
      // Ignore background refresh errors
    }
  }, []);

  useEffect(() => {
    void refreshGlobalTelemetry();
    const interval = window.setInterval(() => void refreshGlobalTelemetry(), 6000);
    return () => window.clearInterval(interval);
  }, [refreshGlobalTelemetry]);

  const handleLogout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout errors
    } finally {
      onLogout();
    }
  };

  return (
    <div className="app-shell">
      {/* SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark">
              <Zap size={17} />
            </div>
            <span>WATTWISE</span>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="nav-group">
          <div className="nav-label">Monitoring</div>

          <NavLink to="/" end className="nav-link" onClick={() => setSidebarOpen(false)}>
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/rooms" className="nav-link" onClick={() => setSidebarOpen(false)}>
            <DoorOpen size={16} />
            <span>Rooms</span>
          </NavLink>

          <NavLink to="/sensors" className="nav-link" onClick={() => setSidebarOpen(false)}>
            <Cpu size={16} />
            <span>Sensors</span>
          </NavLink>


        </div>

        <div className="nav-group">
          <div className="nav-label">Hardware & Rules</div>

          <NavLink to="/connect-hardware" className="nav-link" onClick={() => setSidebarOpen(false)}>
            <Cable size={16} />
            <span>Connect Hardware</span>
          </NavLink>

          <NavLink to="/alerts" className="nav-link" onClick={() => setSidebarOpen(false)}>
            <Bell size={16} />
            <span>Alerts</span>
            {unreadCount > 0 && <span className="nav-count">{unreadCount}</span>}
          </NavLink>

          <NavLink to="/analytics" className="nav-link" onClick={() => setSidebarOpen(false)}>
            <BarChart3 size={16} />
            <span>Analytics</span>
          </NavLink>

          <NavLink to="/insights" className="nav-link" onClick={() => setSidebarOpen(false)}>
            <Sparkles size={16} />
            <span>AI Insights</span>
          </NavLink>
        </div>

        <div className="nav-group">
          <div className="nav-label">System</div>

          <NavLink to="/settings" className="nav-link" onClick={() => setSidebarOpen(false)}>
            <SettingsIcon size={16} />
            <span>Settings</span>
          </NavLink>

          <NavLink to="/about" className="nav-link" onClick={() => setSidebarOpen(false)}>
            <BookOpen size={16} />
            <span>About</span>
          </NavLink>
        </div>

        <div className="sidebar-bottom">
          <div className="admin-chip">
            <span className="top-avatar">
              <UserRound size={14} />
            </span>
            <div>
              <strong>{user}</strong>
              <small>Administrator</small>
            </div>
          </div>

          <button className="logout-button" onClick={() => void handleLogout()}>
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="content-shell">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={19} />
          </button>

          <div className="topbar-title">
            <span className="eyebrow">Smart Conservation</span>
            <h2>WattWise Console</h2>
          </div>

          <div className="topbar-actions">
            <div className={`system-live ${telemetryContext.connectedRoomsCount ? "active" : ""}`}>
              <span className="dot-live" />
              <span>{telemetryContext.connectedRoomsCount ? "Live Telemetry" : "Waiting for Hardware"}</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard onTelemetryUpdate={refreshGlobalTelemetry} />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/sensors" element={<Sensors />} />
            <Route path="/connect-hardware" element={<ConnectHardware />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/insights" element={<AIInsightsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {sidebarOpen && (
        <button
          className="drawer-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* FLOATING AI ASSISTANT (BOTTOM RIGHT CORNER) */}
      <AssistantAI telemetry={telemetryContext} />
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({ onTelemetryUpdate }: { onTelemetryUpdate?: () => void }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [unread, setUnread] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api<{
        rooms: Room[];
        unread: number;
        settings: Settings;
      }>("/api/dashboard");

      setRooms(data.rooms ?? []);
      setUnread(data.unread ?? 0);
      setSettings(data.settings ?? null);
      if (onTelemetryUpdate) onTelemetryUpdate();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [onTelemetryUpdate]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="loading-spinner" />
        <span>Loading Energy Command Center...</span>
      </div>
    );
  }

  const totalPower = rooms.reduce((sum, room) => sum + (room.latest?.power ?? 0), 0);
  const connectedRooms = rooms.filter((room) => room.latest?.connected).length;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Energy Command Center</h1>
        </div>

        <button className="secondary-button" onClick={() => void load()}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </header>

      {/* METRICS GRID */}
      <div className="metrics-grid">
        <MetricCard
          label="Connected Rooms"
          value={`${connectedRooms} / ${rooms.length}`}
          icon={<Wifi size={18} />}
          accent="cyan"
          subtitle={connectedRooms > 0 ? "Hardware Active" : "Waiting for Data"}
        />

        <MetricCard
          label="Current Total Load"
          value={`${totalPower.toFixed(1)} W`}
          icon={<Gauge size={18} />}
          accent="blue"
          subtitle={totalPower > 0 ? "Real-time Telemetry" : "No Active Draw"}
        />

        <MetricCard
          label="Unread Alerts"
          value={String(unread)}
          icon={<Bell size={18} />}
          accent="amber"
          subtitle={unread > 0 ? "Wastage Incidents" : "All Normal"}
        />

        <MetricCard
          label="Wastage Threshold"
          value={settings ? `${settings.currentThreshold} A` : "-"}
          icon={<ShieldCheck size={18} />}
          accent="violet"
          subtitle={settings ? `${settings.alertDurationMinutes} min duration` : "Configuring"}
        />
      </div>

      {/* AI SUMMARY BANNER */}
      <div className="panel ai-summary-panel">
        <div className="ai-summary-header">
          <div className="ai-summary-badge">
            <Sparkles size={16} />
            <span>AI Energy Status</span>
          </div>
          <NavLink to="/insights" className="ai-summary-link">
            <span>View Full Insights</span>
            <ArrowRight size={13} />
          </NavLink>
        </div>
        <p className="ai-summary-text">
          {connectedRooms > 0
            ? `Telemetry is active across ${connectedRooms} connected room(s). Instantaneous aggregate consumption is ${totalPower.toFixed(1)} W. Wastage rules are enforcing the ${settings?.alertDurationMinutes ?? 20}-minute unoccupied threshold.`
            : "Hardware is currently offline or waiting for initial telemetry transmission. The platform will automatically begin live wattage monitoring and 20-minute unoccupied wastage tracking as soon as ESP32 hardware transmits data."}
        </p>
      </div>

      {/* DASHBOARD ROOMS GRID */}
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Spaces</p>
              <h3>Room Electrical Telemetry</h3>
            </div>
            <NavLink to="/rooms" className="panel-header-link">
              <span>Manage Rooms</span>
              <ChevronRight size={14} />
            </NavLink>
          </div>

          <div className="stack-list">
            {rooms.length === 0 ? (
              <EmptyState message="No rooms configured yet. Create a room to begin monitoring." />
            ) : (
              rooms.map((room) => {
                const latest = room.latest;
                const isConn = Boolean(latest?.connected);

                return (
                  <div key={room.id} className="room-row">
                    <div className="room-row-left">
                      <div className="room-badge">{room.room_code}</div>
                      <div>
                        <strong>{room.name}</strong>
                        <small>{room.building ? `${room.building} ${room.floor ? `· Floor ${room.floor}` : ""}` : "General Area"}</small>
                      </div>
                    </div>

                    <div className="room-row-metrics">
                      <div className="telemetry-pill">
                        <span className="pill-label">Power</span>
                        <strong className="pill-value">{isConn ? `${latest?.power.toFixed(1)} W` : "0 W"}</strong>
                      </div>

                      <div className="telemetry-pill">
                        <span className="pill-label">Occupancy</span>
                        <span className={`status-chip ${isConn && latest?.occupancy === "occupied" ? "occupied" : "unoccupied"}`}>
                          {isConn ? (latest?.occupancy === "occupied" ? "Occupied" : "Unoccupied") : "Waiting"}
                        </span>
                      </div>

                      <div className="telemetry-pill">
                        <span className="pill-label">Hardware</span>
                        <span className={`status-chip ${isConn ? "connected" : "offline"}`}>
                          {isConn ? "Connected" : "Offline"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* QUICK HARDWARE GUIDE */}
        <aside className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Deployment</p>
              <h3>Hardware Quick Setup</h3>
            </div>
            <Cable size={18} />
          </div>

          <div className="quick-steps-list">
            <div className="quick-step-item">
              <span className="step-number">01</span>
              <div>
                <strong>Provision Device</strong>
                <p>Register the ESP32 MAC/Device ID in Connect Hardware.</p>
              </div>
            </div>

            <div className="quick-step-item">
              <span className="step-number">02</span>
              <div>
                <strong>Connect Sensors</strong>
                <p>Attach current/voltage sensors and PIR motion detector to pins.</p>
              </div>
            </div>

            <div className="quick-step-item">
              <span className="step-number">03</span>
              <div>
                <strong>Transmit Telemetry</strong>
                <p>Post signed readings to the secure ingestion endpoint.</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <NavLink to="/connect-hardware" className="primary-button" style={{ width: "100%", justifyContent: "center" }}>
              <Cable size={16} />
              <span>Connect Hardware</span>
            </NavLink>
          </div>
        </aside>
      </div>
    </>
  );
}

/* =========================================================
   ROOMS MANAGEMENT
========================================================= */

function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadRooms = useCallback(async () => {
    try {
      const data = await api<Room[]>("/api/rooms");
      const enriched = await Promise.all(
        data.map(async (r) => {
          try {
            const latest = await api<Latest>(`/api/rooms/${r.id}/latest`);
            return { ...r, latest };
          } catch {
            return r;
          }
        })
      );
      setRooms(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const openCreate = () => {
    setEditingRoom(null);
    setRoomCode(`ROOM-0${rooms.length + 1}`);
    setName("");
    setBuilding("");
    setFloor("");
    setDescription("");
    setError("");
    setIsCreating(true);
  };

  const openEdit = (r: Room) => {
    setEditingRoom(r);
    setRoomCode(r.room_code);
    setName(r.name);
    setBuilding(r.building);
    setFloor(r.floor);
    setDescription(r.description);
    setError("");
    setIsCreating(false);
  };

  const closeForm = () => {
    setEditingRoom(null);
    setIsCreating(false);
  };

  const saveRoom = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (isCreating) {
        if (rooms.length >= 10) {
          throw new Error("Maximum limit of 10 rooms reached.");
        }
        await api("/api/rooms", {
          method: "POST",
          body: JSON.stringify({ roomCode, name, building, floor, description }),
        });
      } else if (editingRoom) {
        await api(`/api/rooms/${editingRoom.id}`, {
          method: "PUT",
          body: JSON.stringify({ roomCode, name, building, floor, description }),
        });
      }
      closeForm();
      await loadRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save room.");
    } finally {
      setBusy(false);
    }
  };

  const deleteRoom = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this room? Associated sensor links will be unassigned.")) return;
    try {
      await api(`/api/rooms/${id}`, { method: "DELETE" });
      await loadRooms();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete room.");
    }
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Facility Architecture</p>
          <h1>Monitored Rooms</h1>
        </div>

        <button className="primary-button" onClick={openCreate} disabled={rooms.length >= 10}>
          <Plus size={15} />
          <span>Add Room ({rooms.length}/10)</span>
        </button>
      </header>

      {/* ROOM FORM MODAL / PANEL */}
      {(isCreating || editingRoom) && (
        <div className="panel modal-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{isCreating ? "New Space" : "Modify Room"}</p>
              <h3>{isCreating ? "Create Monitored Room" : `Edit ${editingRoom?.name}`}</h3>
            </div>
            <button className="icon-close-btn" onClick={closeForm}>
              <X size={16} />
            </button>
          </div>

          <form onSubmit={saveRoom} className="form-grid">
            <label>
              <span>Room Code</span>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="e.g. ROOM-01, LAB-02"
                required
              />
            </label>

            <label>
              <span>Room Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CSE-A, Physics Lab, Seminar Hall"
                required
              />
            </label>

            <label>
              <span>Building</span>
              <input
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="e.g. Academic Block A"
              />
            </label>

            <label>
              <span>Floor</span>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. 2nd Floor"
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span>Description / Load Context</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Standard 60-seat classroom with lighting and projector circuits."
              />
            </label>

            {error && <div className="form-error" style={{ gridColumn: "1 / -1" }}>{error}</div>}

            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <button type="button" className="secondary-button" onClick={closeForm}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={busy}>
                <Save size={14} />
                <span>{busy ? "Saving..." : "Save Room"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ROOMS LIST */}
      {loading ? (
        <div className="loading-shell">
          <div className="loading-spinner" />
          <span>Loading rooms...</span>
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState message="No rooms created yet. Click 'Add Room' to define your first monitored space." />
      ) : (
        <div className="cards-grid">
          {rooms.map((room) => {
            const isConn = Boolean(room.latest?.connected);

            return (
              <div key={room.id} className="panel room-card">
                <div className="room-card-header">
                  <div>
                    <span className="room-code-tag">{room.room_code}</span>
                    <h3 className="room-card-title">{room.name}</h3>
                    <small className="room-card-subtitle">{room.building || "General Facility"} {room.floor ? `· ${room.floor}` : ""}</small>
                  </div>

                  <div className="room-card-actions">
                    <button className="icon-action-btn" onClick={() => openEdit(room)} title="Edit Room">
                      <Pencil size={14} />
                    </button>
                    <button className="icon-action-btn danger" onClick={() => void deleteRoom(room.id)} title="Delete Room">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="room-card-telemetry">
                  <div className="telemetry-block">
                    <span className="telemetry-label">Active Power</span>
                    <strong className="telemetry-val">{isConn ? `${room.latest?.power.toFixed(1)} W` : "0.0 W"}</strong>
                  </div>

                  <div className="telemetry-block">
                    <span className="telemetry-label">Voltage / Current</span>
                    <span className="telemetry-sub">
                      {isConn ? `${room.latest?.voltage.toFixed(0)}V / ${room.latest?.current.toFixed(2)}A` : "0V / 0.00A"}
                    </span>
                  </div>

                  <div className="telemetry-block">
                    <span className="telemetry-label">Occupancy</span>
                    <span className={`status-chip ${isConn && room.latest?.occupancy === "occupied" ? "occupied" : "unoccupied"}`}>
                      {isConn ? (room.latest?.occupancy === "occupied" ? "Occupied" : "Unoccupied") : "Waiting"}
                    </span>
                  </div>

                  <div className="telemetry-block">
                    <span className="telemetry-label">Hardware State</span>
                    <span className={`status-chip ${isConn ? "connected" : "offline"}`}>
                      {isConn ? "Connected" : "Offline"}
                    </span>
                  </div>
                </div>

                {room.description && <p className="room-desc-text">{room.description}</p>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* =========================================================
   SENSORS
========================================================= */

function Sensors() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAdding, setIsAdding] = useState(false);
  const [sensorId, setSensorId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"electricity" | "pir">("electricity");
  const [model, setModel] = useState("");
  const [gpioPin, setGpioPin] = useState("");
  const [iface, setIface] = useState("Analog / ADC");
  const [unit, setUnit] = useState("W");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sData, rData] = await Promise.all([
        api<Sensor[]>("/api/sensors"),
        api<Room[]>("/api/rooms"),
      ]);
      setSensors(sData);
      setRooms(rData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const addSensor = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      await api("/api/sensors", {
        method: "POST",
        body: JSON.stringify({
          sensorId,
          name,
          type,
          model,
          gpioPin,
          interface: iface,
          unit: type === "electricity" ? "W / A" : "Motion",
          description,
        }),
      });
      setIsAdding(false);
      setSensorId("");
      setName("");
      setModel("");
      setGpioPin("");
      setDescription("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register sensor.");
    } finally {
      setBusy(false);
    }
  };

  const connectToRoom = async (sId: string, rId: string) => {
    try {
      await api(`/api/sensors/${sId}/connect`, {
        method: "POST",
        body: JSON.stringify({ roomId: rId }),
      });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Connection failed.");
    }
  };

  const disconnectFromRoom = async (sId: string) => {
    try {
      await api(`/api/sensors/${sId}/disconnect`, { method: "POST" });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Disconnect failed.");
    }
  };

  const deleteSensor = async (id: string) => {
    if (!window.confirm("Remove this sensor from WattWise?")) return;
    try {
      await api(`/api/sensors/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Telemetry Inputs</p>
          <h1>Sensor Inventory</h1>
        </div>

        <button className="primary-button" onClick={() => setIsAdding(!isAdding)}>
          <Plus size={15} />
          <span>Register Sensor</span>
        </button>
      </header>

      {/* SENSOR FORM */}
      {isAdding && (
        <div className="panel modal-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">New Input Node</p>
              <h3>Register Physical Sensor</h3>
            </div>
            <button className="icon-close-btn" onClick={() => setIsAdding(false)}>
              <X size={16} />
            </button>
          </div>

          <form onSubmit={addSensor} className="form-grid">
            <label>
              <span>Sensor ID</span>
              <input
                type="text"
                value={sensorId}
                onChange={(e) => setSensorId(e.target.value)}
                placeholder="e.g. SENS-CT-01, PIR-01"
                required
              />
            </label>

            <label>
              <span>Sensor Friendly Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Incomer Current Transformer"
                required
              />
            </label>

            <label>
              <span>Sensor Type</span>
              <select value={type} onChange={(e) => setType(e.target.value as "electricity" | "pir")}>
                <option value="electricity">Electricity Sensor (Voltage/Current/Power/Energy)</option>
                <option value="pir">PIR Motion / Occupancy Sensor</option>
              </select>
            </label>

            <label>
              <span>Hardware Model</span>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. SCT-013-000, PZEM-004T, HC-SR501"
              />
            </label>

            <label>
              <span>ESP32 GPIO Pin</span>
              <input
                type="text"
                value={gpioPin}
                onChange={(e) => setGpioPin(e.target.value)}
                placeholder="e.g. GPIO 34 (ADC1), GPIO 13"
              />
            </label>

            <label>
              <span>Hardware Interface</span>
              <input
                type="text"
                value={iface}
                onChange={(e) => setIface(e.target.value)}
                placeholder="e.g. Analog ADC, UART, I2C, Digital Pin"
              />
            </label>

            {error && <div className="form-error" style={{ gridColumn: "1 / -1" }}>{error}</div>}

            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <button type="button" className="secondary-button" onClick={() => setIsAdding(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={busy}>
                <Save size={14} />
                <span>{busy ? "Registering..." : "Save Sensor"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-shell">
          <div className="loading-spinner" />
          <span>Loading sensors...</span>
        </div>
      ) : sensors.length === 0 ? (
        <EmptyState message="No sensors registered yet. Click 'Register Sensor' or use 'Connect Hardware' to configure." />
      ) : (
        <div className="cards-grid">
          {sensors.map((s) => (
            <div key={s.id} className="panel sensor-card">
              <div className="sensor-card-top">
                <div className="sensor-type-icon">
                  {s.type === "electricity" ? <Zap size={18} /> : <Activity size={18} />}
                </div>

                <div>
                  <span className="sensor-id-code">{s.sensor_id}</span>
                  <h3 className="sensor-card-title">{s.name}</h3>
                  <small className="sensor-card-meta">{s.type === "electricity" ? "Electricity Monitoring" : "PIR Occupancy Sensor"}</small>
                </div>

                <div className="sensor-delete-btn">
                  <button className="icon-action-btn danger" onClick={() => void deleteSensor(s.id)} title="Delete Sensor">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="sensor-card-details">
                <div className="reading-row">
                  <span>Model</span>
                  <strong>{s.model || "Generic"}</strong>
                </div>

                <div className="reading-row">
                  <span>Pin / Interface</span>
                  <strong>{s.gpio_pin ? `${s.gpio_pin} (${s.interface})` : s.interface || "Standard"}</strong>
                </div>

                <div className="reading-row">
                  <span>Assigned Room</span>
                  <strong>{s.room_name || "Unassigned"}</strong>
                </div>

                <div className="reading-row">
                  <span>Status</span>
                  <span className={`status-chip ${s.room_id ? "connected" : "offline"}`}>
                    {s.room_id ? "Attached / Waiting" : "Not Assigned"}
                  </span>
                </div>
              </div>

              <div className="sensor-card-footer">
                {s.room_id ? (
                  <button className="secondary-button compact" onClick={() => void disconnectFromRoom(s.id)}>
                    <Unplug size={13} />
                    <span>Unlink Room</span>
                  </button>
                ) : (
                  <div className="assign-select-wrapper">
                    <select
                      onChange={(e) => {
                        if (e.target.value) void connectToRoom(s.id, e.target.value);
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Assign to room...
                      </option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.room_code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}


/* =========================================================
   CONNECT HARDWARE — ESP32 HARDWARE MANAGEMENT
========================================================= */


function ConnectHardware() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  // Registration form
  const [regDeviceId, setRegDeviceId] = useState("");
  const [regRoomId, setRegRoomId] = useState("");
  const [regSensorType, setRegSensorType] = useState("both");
  const [regBusy, setRegBusy] = useState(false);
  const [regError, setRegError] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatedForDevice, setGeneratedForDevice] = useState<string | null>(null);
  const [generatedForRoom, setGeneratedForRoom] = useState<string | null>(null);

  // Connect panel
  const [connectDevId, setConnectDevId] = useState("");
  const [connectRoomId, setConnectRoomId] = useState("");
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [connectSuccess, setConnectSuccess] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [devData, roomData] = await Promise.all([
        api<Device[]>("/api/devices"),
        api<Room[]>("/api/rooms"),
      ]);
      setDevices(devData);
      setRooms(roomData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const timer = window.setInterval(() => void loadData(), 10000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  // Pre-fill connect room when device selection changes
  useEffect(() => {
    if (!connectDevId) return;
    const dev = devices.find((d) => d.id === connectDevId);
    if (dev?.roomId) {
      setConnectRoomId(dev.roomId);
    } else if (rooms.length > 0) {
      setConnectRoomId(rooms[0].id);
    }
  }, [connectDevId, devices, rooms]);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedId = regDeviceId.trim();
    if (!trimmedId) { setRegError("Device ID is required."); return; }
    setRegError("");
    setGeneratedKey(null);
    setRegBusy(true);

    try {
      // 1. Register device
      const devResult = await api<{ device: Device; apiKey: string }>("/api/devices", {
        method: "POST",
        body: JSON.stringify({ deviceId: trimmedId, name: trimmedId, firmwareVersion: "1.0.0" }),
      });

      // 2. Assign to room if selected
      if (regRoomId) {
        await api(`/api/devices/${devResult.device.id}/assign`, {
          method: "POST",
          body: JSON.stringify({ roomId: regRoomId }),
        });
      }

      // 3. Create sensors based on sensor type selection
      if (regSensorType === "both" || regSensorType === "electricity") {
        const sElec = await api<Sensor>("/api/sensors", {
          method: "POST",
          body: JSON.stringify({
            sensorId: `SENS-ELEC-${trimmedId}`,
            name: `${trimmedId} Electricity Sensor`,
            type: "electricity",
            model: "SCT-013 / PZEM",
            gpioPin: "GPIO 34 (ADC)",
            interface: "Analog / ADC",
            unit: "W",
          }),
        });
        if (regRoomId) {
          await api(`/api/sensors/${sElec.id}/connect`, {
            method: "POST",
            body: JSON.stringify({ roomId: regRoomId }),
          });
        }
      }

      if (regSensorType === "both" || regSensorType === "pir") {
        const sPir = await api<Sensor>("/api/sensors", {
          method: "POST",
          body: JSON.stringify({
            sensorId: `SENS-PIR-${trimmedId}`,
            name: `${trimmedId} PIR Motion Sensor`,
            type: "pir",
            model: "HC-SR501",
            gpioPin: "GPIO 13",
            interface: "Digital IO",
            unit: "Motion",
          }),
        });
        if (regRoomId) {
          await api(`/api/sensors/${sPir.id}/connect`, {
            method: "POST",
            body: JSON.stringify({ roomId: regRoomId }),
          });
        }
      }

      const roomObj = rooms.find((r) => r.id === regRoomId);
      setGeneratedKey(devResult.apiKey);
      setGeneratedForDevice(trimmedId);
      setGeneratedForRoom(roomObj?.name ?? null);
      setRegDeviceId("");
      setRegRoomId("");
      await loadData();
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setRegBusy(false);
    }
  };

  const handleConnect = async () => {
    if (!connectDevId || !connectRoomId) {
      setConnectError("Please select both a device and a room.");
      return;
    }
    setConnectError("");
    setConnectSuccess(false);
    setConnectBusy(true);
    try {
      await api(`/api/devices/${connectDevId}/assign`, {
        method: "POST",
        body: JSON.stringify({ roomId: connectRoomId }),
      });
      setConnectSuccess(true);
      await loadData();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setConnectBusy(false);
    }
  };

  const handleDisconnect = async (devDbId: string) => {
    try {
      await api(`/api/devices/${devDbId}/disconnect`, { method: "POST" });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Disconnect failed.");
    }
  };

  const handleDelete = async (devDbId: string, label: string) => {
    if (!window.confirm(`Delete device "${label}"? This cannot be undone.`)) return;
    try {
      await api(`/api/devices/${devDbId}`, { method: "DELETE" });
      if (connectDevId === devDbId) { setConnectDevId(""); setConnectSuccess(false); }
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  const getDeviceStatus = (d: Device): { label: string; cls: string } => {
    if (d.status === "connected") return { label: "CONNECTED", cls: "connected" };
    if (d.status === "disconnected") return { label: "OFFLINE", cls: "offline" };
    if (d.roomId) return { label: "REGISTERED", cls: "occupied" };
    return { label: "NOT CONNECTED", cls: "offline" };
  };

  const selectedConnectDev = devices.find((d) => d.id === connectDevId);
  const selectedConnectRoom = rooms.find((r) => r.id === connectRoomId);

  return (
    <>
      {/* PAGE HEADER */}
      <header className="page-header">
        <div>
          <p className="eyebrow">Hardware Provisioning</p>
          <h1>ESP32 Hardware Management</h1>
          <p style={{ marginTop: 4, fontSize: "0.875rem", opacity: 0.65 }}>
            Register your ESP32 and connect it to WattWise for real-time electricity monitoring.
          </p>
        </div>
      </header>

      {/* CONNECTION FLOW STEPS */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div>
            <p className="eyebrow">Workflow</p>
            <h3>Simple Connection Flow</h3>
          </div>
          <Cable size={18} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {["Register ESP32", "Assign Room", "Connect ESP32", "Receive Sensor Data", "Monitor Electricity"].map(
            (step, idx, arr) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="step-badge">{idx + 1}</span>
                  <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>{step}</span>
                </div>
                {idx < arr.length - 1 && <ChevronRight size={14} style={{ opacity: 0.35 }} />}
              </div>
            )
          )}
        </div>
      </section>

      {/* API KEY SUCCESS BANNER */}
      {generatedKey && (
        <div className="panel alert-banner-key" style={{ marginBottom: 20 }}>
          <div className="key-banner-header">
            <ShieldCheck size={22} className="key-banner-icon" />
            <div>
              <strong>ESP32 &ldquo;{generatedForDevice}&rdquo; Registered Successfully</strong>
              <p>
                {generatedForRoom
                  ? `Assigned to ${generatedForRoom}. Copy this key to your ESP32 firmware — it is never shown again.`
                  : "Copy this hardware key to your ESP32 firmware. It is never shown again. Use the Connect panel to assign a room."}
              </p>
            </div>
            <button className="icon-close-btn" onClick={() => setGeneratedKey(null)}>
              <X size={15} />
            </button>
          </div>
          <div className="key-copy-row">
            <div>
              <span className="code-label">X-Device-Key:</span>
              <code>{generatedKey}</code>
            </div>
            <button
              className="secondary-button compact"
              onClick={() => {
                void navigator.clipboard.writeText(generatedKey);
                alert("Device API key copied to clipboard.");
              }}
            >
              <Copy size={13} />
              <span>Copy Key</span>
            </button>
          </div>
          <div className="payload-preview-box">
            <span className="payload-label">
              Sample ESP32 POST JSON to <code>/api/esp32/data</code>:
            </span>
            <pre>{`{
  "deviceId": "${generatedForDevice}",
  "roomId": "<your-room-id>",
  "timestamp": "${new Date().toISOString()}",
  "electricity": { "voltage": 230.0, "current": 1.45, "power": 333.5, "energy": 0.28 },
  "pir": { "motionDetected": false }
}`}</pre>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* ── LEFT COLUMN: Register form + Device list ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* REGISTER NEW ESP32 */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Node Provisioning</p>
                <h3>Register New ESP32</h3>
              </div>
              <Plus size={18} />
            </div>

            <form onSubmit={(e) => void handleRegister(e)} className="form-grid">
              <label style={{ gridColumn: "1 / -1" }}>
                <span>
                  Device ID <span style={{ color: "#22d3ee" }}>*</span>
                </span>
                <input
                  type="text"
                  value={regDeviceId}
                  onChange={(e) => setRegDeviceId(e.target.value)}
                  placeholder="e.g. ESP32-001"
                  required
                />
              </label>

              <label>
                <span>Room Assignment</span>
                <select value={regRoomId} onChange={(e) => setRegRoomId(e.target.value)}>
                  <option value="">— No room yet —</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.room_code})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Sensor Type</span>
                <select value={regSensorType} onChange={(e) => setRegSensorType(e.target.value)}>
                  <option value="both">Electricity + PIR (Full)</option>
                  <option value="electricity">Electricity Only</option>
                  <option value="pir">PIR / Occupancy Only</option>
                  <option value="none">None / Custom</option>
                </select>
              </label>

              {regError && (
                <div className="form-error" style={{ gridColumn: "1 / -1" }}>
                  {regError}
                </div>
              )}

              <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={regBusy}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  <Radio size={15} />
                  <span>{regBusy ? "Registering..." : "Register ESP32"}</span>
                </button>
              </div>
            </form>
          </section>

          {/* REGISTERED ESP32 DEVICES */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Hardware Inventory</p>
                <h3>Registered ESP32 Devices</h3>
              </div>
              <button className="secondary-button compact" onClick={() => void loadData()}>
                <RefreshCw size={13} />
                <span>Refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="loading-shell">
                <div className="loading-spinner" />
                <span>Loading devices...</span>
              </div>
            ) : devices.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", opacity: 0.5 }}>
                <Radio size={28} style={{ marginBottom: 8 }} />
                <p>No ESP32 devices registered yet.</p>
              </div>
            ) : (
              <div className="stack-list">
                {devices.map((d) => {
                  const assignedRoom = rooms.find((r) => r.id === d.roomId);
                  const st = getDeviceStatus(d);
                  return (
                    <div key={d.id} className="room-row" style={{ flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 200 }}>
                        <div className="device-badge-icon" style={{ flexShrink: 0 }}>
                          <Cpu size={16} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span className="device-id-code">{d.deviceId}</span>
                            <span className={`status-chip ${st.cls}`}>{st.label}</span>
                          </div>
                          <small>
                            {assignedRoom
                              ? `${assignedRoom.name} (${assignedRoom.room_code})`
                              : "No room assigned"}
                            {" · Last seen: "}
                            {d.lastSeenAt
                              ? new Date(d.lastSeenAt).toLocaleString()
                              : "Never"}
                          </small>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <button
                          className="primary-button compact"
                          onClick={() => {
                            setConnectDevId(d.id);
                            setConnectSuccess(false);
                            setConnectError("");
                            document
                              .getElementById("hw-connect-panel")
                              ?.scrollIntoView({ behavior: "smooth" });
                          }}
                        >
                          <Cable size={12} />
                          <span>Connect</span>
                        </button>
                        {d.roomId && (
                          <button
                            className="secondary-button compact"
                            onClick={() => void handleDisconnect(d.id)}
                          >
                            <Unplug size={12} />
                            <span>Unassign</span>
                          </button>
                        )}
                        <button
                          className="secondary-button compact"
                          onClick={() => void handleDelete(d.id, d.deviceId)}
                          title={`Delete ${d.deviceId}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT COLUMN: Connect panel + Rules ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* CONNECT REGISTERED ESP32 */}
          <section className="panel" id="hw-connect-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Hardware Link</p>
                <h3>Connect Registered ESP32</h3>
              </div>
              <Cable size={18} />
            </div>

            {devices.length === 0 ? (
              <p style={{ fontSize: "0.875rem", opacity: 0.55 }}>
                Register an ESP32 first, then connect it here.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label>
                  <span>Select Device</span>
                  <select
                    value={connectDevId}
                    onChange={(e) => {
                      setConnectDevId(e.target.value);
                      setConnectSuccess(false);
                      setConnectError("");
                    }}
                  >
                    <option value="">— Choose a registered device —</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.deviceId}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedConnectDev && (
                  <div className="panel" style={{ padding: 14, gap: 0 }}>
                    <div className="reading-row">
                      <span>Device</span>
                      <strong style={{ fontFamily: "monospace" }}>
                        {selectedConnectDev.deviceId}
                      </strong>
                    </div>
                    <div className="reading-row">
                      <span>Current Room</span>
                      <strong>
                        {rooms.find((r) => r.id === selectedConnectDev.roomId)?.name ??
                          "Unassigned"}
                      </strong>
                    </div>
                    <div className="reading-row">
                      <span>Status</span>
                      <span className={`status-chip ${getDeviceStatus(selectedConnectDev).cls}`}>
                        {getDeviceStatus(selectedConnectDev).label}
                      </span>
                    </div>
                    <div className="reading-row">
                      <span>Last Telemetry</span>
                      <strong>
                        {selectedConnectDev.lastSeenAt
                          ? new Date(selectedConnectDev.lastSeenAt).toLocaleString()
                          : "Never received"}
                      </strong>
                    </div>
                  </div>
                )}

                <label>
                  <span>Assign to Room</span>
                  <select
                    value={connectRoomId}
                    onChange={(e) => setConnectRoomId(e.target.value)}
                    disabled={!connectDevId || rooms.length === 0}
                  >
                    <option value="">— Select a room —</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.room_code})
                      </option>
                    ))}
                  </select>
                </label>

                {connectError && (
                  <div className="form-error">{connectError}</div>
                )}

                {connectSuccess && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: "0.85rem",
                      padding: "10px 14px",
                      borderRadius: 6,
                      background: "rgba(34,197,94,0.08)",
                      color: "#22c55e",
                    }}
                  >
                    <Check size={15} />
                    <span>
                      Assigned to{" "}
                      <strong>{selectedConnectRoom?.name ?? "room"}</strong>.
                      Status becomes CONNECTED when hardware sends real telemetry.
                    </span>
                  </div>
                )}

                <button
                  className="primary-button"
                  style={{ width: "100%", justifyContent: "center" }}
                  disabled={!connectDevId || !connectRoomId || connectBusy}
                  onClick={() => void handleConnect()}
                >
                  <Cable size={15} />
                  <span>{connectBusy ? "Connecting..." : "Connect ESP32"}</span>
                </button>

                <p style={{ fontSize: "0.75rem", opacity: 0.5, margin: 0 }}>
                  Status shows <strong>CONNECTED</strong> only when the physical ESP32
                  hardware transmits authenticated sensor data to the backend.
                </p>
              </div>
            )}
          </section>

          {/* HARDWARE DATA RULES */}
          <aside className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Integrity Policy</p>
                <h3>Hardware Data Rules</h3>
              </div>
              <ShieldCheck size={18} />
            </div>
            <div className="stack-list">
              <div className="rule-box">
                <strong>Real Telemetry Only</strong>
                <p>
                  WattWise never generates fake readings. Rooms show 0 W and
                  &ldquo;Waiting&rdquo; until the physical ESP32 transmits
                  authenticated sensor packets.
                </p>
              </div>
              <div className="rule-box">
                <strong>Device Authentication</strong>
                <p>
                  Each ESP32 must send the <code>X-Device-Key</code> header —
                  the key generated during registration. POST real readings to{" "}
                  <code>/api/esp32/data</code>.
                </p>
              </div>
              <div className="rule-box">
                <strong>20-Minute Wastage Rule</strong>
                <p>
                  Alerts fire when the PIR sensor reads unoccupied while current
                  exceeds the threshold continuously for more than 20 minutes.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}


/* =========================================================
   ALERTS
========================================================= */

function Alerts() {
  const [alerts, setAlerts] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    try {
      const data = await api<NotificationItem[]>("/api/alerts");
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const acknowledge = async (id: string) => {
    try {
      await api(`/api/alerts/${id}/acknowledge`, { method: "POST" });
      await loadAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to acknowledge alert.");
    }
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">System Events</p>
          <h1>Energy Wastage Alerts</h1>
        </div>

        <button className="secondary-button" onClick={() => void loadAlerts()}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </header>

      {loading ? (
        <div className="loading-shell">
          <div className="loading-spinner" />
          <span>Loading alerts...</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="panel empty-panel">
          <ShieldCheck size={32} className="empty-icon-accent" />
          <h3>Zero Active Wastage Incidents</h3>
          <p>No unoccupied rooms have exceeded the 20-minute electricity wastage threshold. System operating normally.</p>
        </div>
      ) : (
        <div className="stack-list">
          {alerts.map((a) => (
            <div key={a.id} className={`panel alert-row-card ${a.acknowledged ? "acknowledged" : "active"}`}>
              <div className="alert-row-icon">
                <AlertTriangle size={18} />
              </div>

              <div className="alert-row-body">
                <div className="alert-row-meta">
                  <span className="alert-room-badge">{a.room || "Room"}</span>
                  <span className="alert-timestamp">{new Date(a.detected_at).toLocaleString()}</span>
                  <span className={`status-chip ${a.acknowledged ? "offline" : "occupied"}`}>
                    {a.acknowledged ? "Acknowledged" : "Active Wastage"}
                  </span>
                </div>

                <h4 className="alert-row-message">{a.message}</h4>

                <div className="alert-row-measurements">
                  {a.power !== null && (
                    <div className="metric-tag">
                      <span>Measured Power:</span>
                      <strong>{a.power.toFixed(1)} W</strong>
                    </div>
                  )}
                  {a.current !== null && (
                    <div className="metric-tag">
                      <span>Measured Current:</span>
                      <strong>{a.current.toFixed(2)} A</strong>
                    </div>
                  )}
                  {a.started_at && (
                    <div className="metric-tag">
                      <span>Unoccupied Since:</span>
                      <strong>{new Date(a.started_at).toLocaleTimeString()}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="alert-row-action">
                {!a.acknowledged ? (
                  <button className="primary-button compact" onClick={() => void acknowledge(a.id)}>
                    <Check size={14} />
                    <span>Acknowledge</span>
                  </button>
                ) : (
                  <small className="ack-text">Acknowledged {a.acknowledged_at ? new Date(a.acknowledged_at).toLocaleTimeString() : ""}</small>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* =========================================================
   ANALYTICS
========================================================= */

function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await api<AnalyticsData>("/api/analytics");
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="loading-spinner" />
        <span>Loading Analytics Engine...</span>
      </div>
    );
  }

  const hasReadings = Boolean(data && data.totals && data.totals.count > 0);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Historical Metrics</p>
          <h1>Empirical Energy Analytics</h1>
        </div>

        <button className="secondary-button" onClick={() => void loadAnalytics()}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </header>

      {!hasReadings ? (
        <div className="panel empty-panel">
          <BarChart3 size={36} className="empty-icon-accent" />
          <h3>Real Sensor Data Required</h3>
          <p>Real-time and historical sensor telemetry is required to plot load curves, evaluate energy usage trends, and calculate power peaks.</p>
          <NavLink to="/connect-hardware" className="primary-button" style={{ marginTop: 16 }}>
            <Cable size={15} />
            <span>Connect Hardware</span>
          </NavLink>
        </div>
      ) : (
        <>
          {/* ANALYTICS SUMMARY CARDS */}
          <div className="metrics-grid">
            <MetricCard
              label="Cumulative Energy"
              value={`${data?.totals.energy.toFixed(2)} kWh`}
              icon={<Zap size={18} />}
              accent="cyan"
              subtitle="Total Monitored"
            />
            <MetricCard
              label="Average Power"
              value={`${data?.totals.averagePower.toFixed(1)} W`}
              icon={<Gauge size={18} />}
              accent="blue"
              subtitle="Mean Demand"
            />
            <MetricCard
              label="Peak Recorded Power"
              value={`${data?.totals.peakPower.toFixed(1)} W`}
              icon={<Activity size={18} />}
              accent="violet"
              subtitle="Maximum Spike"
            />
            <MetricCard
              label="Wastage Duration"
              value={`${((data?.wastage.duration ?? 0) / 60).toFixed(0)} min`}
              icon={<Clock size={18} />}
              accent="amber"
              subtitle={`${data?.wastage.events ?? 0} Incident(s)`}
            />
          </div>

          {/* POWER LOAD CHART */}
          <section className="panel" style={{ marginTop: 20 }}>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Time Series</p>
                <h3>Power Consumption Curve (Watts)</h3>
              </div>
            </div>

            <div style={{ width: "100%", height: 320, marginTop: 16 }}>
              <ResponsiveContainer>
                <AreaChart data={data?.series ?? []}>
                  <defs>
                    <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#32d6ef" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#32d6ef" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,80,115,0.3)" />
                  <XAxis dataKey="time" stroke="#6d7e94" fontSize={11} />
                  <YAxis stroke="#6d7e94" fontSize={11} unit=" W" />
                  <Tooltip
                    contentStyle={{
                      background: "#0d1a2b",
                      border: "1px solid #20344c",
                      borderRadius: 8,
                      color: "#e9f0f8",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="power"
                    stroke="#32d6ef"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#powerGrad)"
                    name="Power (W)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </>
  );
}

/* =========================================================
   AI INSIGHTS PAGE
========================================================= */

function AIInsightsPage() {
  const [data, setData] = useState<AIInsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInsights = useCallback(async () => {
    try {
      const res = await api<AIInsightsData>("/api/ai/insights");
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="loading-spinner" />
        <span>Evaluating AI Insight Engine...</span>
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Intelligent Analysis</p>
          <h1>WattWise AI Insights</h1>
        </div>

        <button className="secondary-button" onClick={() => void loadInsights()}>
          <RefreshCw size={14} />
          <span>Re-Analyze</span>
        </button>
      </header>

      {!data?.hasData ? (
        <div className="panel empty-panel">
          <Sparkles size={36} className="empty-icon-accent" />
          <h3>Real Telemetry Required for AI Inference</h3>
          <p>{data?.message ?? "Connect ESP32 hardware to enable real-time anomaly detection and load efficiency analysis."}</p>
          <NavLink to="/connect-hardware" className="primary-button" style={{ marginTop: 16 }}>
            <Cable size={15} />
            <span>Connect Hardware</span>
          </NavLink>
        </div>
      ) : (
        <>
          {/* AI SUMMARY CARD */}
          <div className="panel ai-summary-panel">
            <div className="ai-summary-header">
              <div className="ai-summary-badge">
                <Sparkles size={16} />
                <span>Verified Telemetry Analysis</span>
              </div>
              <span className="status-chip connected">Model Confidence: Empirical</span>
            </div>
            <p className="ai-summary-text">{data.summary}</p>
          </div>

          {/* AI METRICS */}
          <div className="metrics-grid" style={{ marginTop: 20 }}>
            <MetricCard
              label="Conservation Score"
              value={`${data.metrics.efficiencyScore} / 100`}
              icon={<ShieldCheck size={18} />}
              accent={data.metrics.efficiencyScore >= 80 ? "cyan" : "amber"}
              subtitle="Facility Efficiency"
            />
            <MetricCard
              label="Unoccupied Wastage"
              value={`${data.metrics.wastedEnergyKwh.toFixed(3)} kWh`}
              icon={<AlertTriangle size={18} />}
              accent="amber"
              subtitle="Lost during empty states"
            />
            <MetricCard
              label="Total Monitored"
              value={`${data.metrics.totalMonitoredKwh.toFixed(3)} kWh`}
              icon={<Zap size={18} />}
              accent="blue"
              subtitle="Active Energy"
            />
            <MetricCard
              label="Active Anomalies"
              value={String(data.metrics.activeAnomalies)}
              icon={<Activity size={18} />}
              accent="violet"
              subtitle="Flagged Incidents"
            />
          </div>

          {/* INSIGHTS & RECOMMENDATIONS GRID */}
          <div className="dashboard-grid" style={{ marginTop: 20 }}>
            {/* INSIGHTS LIST */}
            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Pattern Detection</p>
                  <h3>Key Empirical Insights</h3>
                </div>
              </div>

              <div className="stack-list">
                {data.insights.map((ins, i) => (
                  <div key={i} className="insight-card">
                    <div className="insight-top">
                      <strong className="insight-title">{ins.title}</strong>
                      <span className={`status-chip ${ins.severity === "high" ? "occupied" : "connected"}`}>
                        {ins.type}
                      </span>
                    </div>
                    <p className="insight-desc">{ins.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* RECOMMENDATIONS */}
            <aside className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Actionable Steps</p>
                  <h3>Conservation Actions</h3>
                </div>
                <Lightbulb size={18} />
              </div>

              <div className="stack-list">
                {data.recommendations.map((rec, i) => (
                  <div key={i} className="recommendation-card">
                    <div className="rec-header">
                      <strong>{rec.title}</strong>
                      <span className="rec-impact-badge">{rec.impact}</span>
                    </div>
                    <p className="rec-detail">{rec.detail}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </>
      )}
    </>
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    currentThreshold: 0.1,
    alertDurationMinutes: 20,
    sensorFreshnessSeconds: 90,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await api<Settings>("/api/settings");
        setSettings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    void fetchSettings();
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);

    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setMessage("Settings saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="loading-spinner" />
        <span>Loading configuration...</span>
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">System Configuration</p>
          <h1>Wastage & Telemetry Rules</h1>
        </div>
      </header>

      <div className="dashboard-grid">
        <form onSubmit={save} className="panel form-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Detection Parameters</p>
              <h3>Wastage Rule Thresholds</h3>
            </div>
          </div>

          <div className="form-grid">
            <label>
              <span>Active Current Threshold (Amperes)</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={settings.currentThreshold}
                onChange={(e) => setSettings({ ...settings, currentThreshold: Number(e.target.value) })}
                required
              />
              <small>Current above this value in an unoccupied space is evaluated as active electrical load (Default: 0.10 A).</small>
            </label>

            <label>
              <span>Wastage Alert Duration (Minutes)</span>
              <input
                type="number"
                min="1"
                max="1440"
                value={settings.alertDurationMinutes}
                onChange={(e) => setSettings({ ...settings, alertDurationMinutes: Number(e.target.value) })}
                required
              />
              <small>The unpopulated condition must persist continuously for this duration before triggering an alarm (Default: 20 min).</small>
            </label>

            <label>
              <span>Sensor Freshness Timeout (Seconds)</span>
              <input
                type="number"
                min="10"
                max="3600"
                value={settings.sensorFreshnessSeconds}
                onChange={(e) => setSettings({ ...settings, sensorFreshnessSeconds: Number(e.target.value) })}
                required
              />
              <small>Devices without telemetry within this window transition to Offline state (Default: 90s).</small>
            </label>
          </div>

          {message && <div className="form-success">{message}</div>}
          {error && <div className="form-error">{error}</div>}

          <div className="form-actions" style={{ marginTop: 20 }}>
            <button type="submit" className="primary-button" disabled={saving}>
              <Save size={15} />
              <span>{saving ? "Saving Configuration..." : "Save Settings"}</span>
            </button>
          </div>
        </form>

        <aside className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Logic Verification</p>
              <h3>How the 20-Minute Rule Works</h3>
            </div>
            <ShieldCheck size={18} />
          </div>

          <div className="stack-list">
            <div className="rule-box">
              <strong>Condition 1: Room Unoccupied</strong>
              <p>The PIR motion sensor reports zero movement across recent sampling periods.</p>
            </div>

            <div className="rule-box">
              <strong>Condition 2: Current &gt; Threshold</strong>
              <p>Active current exceeds {settings.currentThreshold} A, confirming active electrical appliances or lighting.</p>
            </div>

            <div className="rule-box">
              <strong>Condition 3: Continuous Duration</strong>
              <p>If Conditions 1 and 2 persist unbroken for {settings.alertDurationMinutes} minutes, a high-priority incident is logged.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

/* =========================================================
   ABOUT (REWRITTEN PROFESSIONAL PARAGRAPHS - ZERO EMOJIS)
========================================================= */

function About() {
  return (
    <div className="about-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">System Documentation</p>
          <h1>About WattWise</h1>
        </div>
      </header>

      <div className="about-paragraphs-container">
        {/* SECTION 1: PROJECT OVERVIEW */}
        <section className="panel about-section-panel">
          <div className="about-section-header">
            <span className="about-section-tag">01</span>
            <h2>Project Overview</h2>
          </div>
          <p className="about-body-paragraph">
            WattWise is an AI-powered smart electricity conservation platform designed to monitor institutional electricity consumption through connected IoT sensors, provide granular room-level tracking, detect unattended electrical wastage, deliver comprehensive analytics and intelligent insights, and empower administrators with actionable data to optimize institutional energy management.
          </p>
        </section>

        {/* SECTION 2: PROBLEM STATEMENT */}
        <section className="panel about-section-panel">
          <div className="about-section-header">
            <span className="about-section-tag">02</span>
            <h2>Problem Statement</h2>
          </div>
          <p className="about-body-paragraph">
            In modern educational institutions, laboratories, lecture halls, and commercial spaces, electrical equipment—such as lighting banks, air conditioners, ceiling fans, computing arrays, and laboratory instruments—frequently remains powered long after occupants have vacated the premises. Manual physical auditing of every room is labor-intensive, intermittent, and inherently unreliable, allowing large volumes of electrical power to be consumed unnoticed during off-hours and unoccupied intervals.
          </p>
        </section>

        {/* SECTION 3: OUR PROPOSED SOLUTION */}
        <section className="panel about-section-panel">
          <div className="about-section-header">
            <span className="about-section-tag">03</span>
            <h2>Our Proposed Solution</h2>
          </div>
          <p className="about-body-paragraph">
            WattWise provides an end-to-end, automated energy monitoring and conservation architecture. By pairing low-power ESP32 microcontrollers with non-invasive current transformers, voltage sensors, and PIR motion detectors in individual spaces, the system establishes a direct telemetry bridge to a centralized processing engine. The platform automatically identifies instances where electrical draw continues during sustained unoccupied periods, alerting facility engineers and administrators before significant waste accumulates.
          </p>
        </section>

        {/* SECTION 4: HOW WATTWISE WORKS */}
        <section className="panel about-section-panel">
          <div className="about-section-header">
            <span className="about-section-tag">04</span>
            <h2>How WattWise Works</h2>
          </div>
          <p className="about-body-paragraph">
            The platform executes an automated four-stage operational pipeline. First, deployed ESP32 hardware nodes sample real-time voltage, current, active power, cumulative energy, and occupancy status. Second, the nodes transmit authenticated JSON telemetry payloads over local Wi-Fi to the WattWise backend. Third, the backend ingests and logs the readings into a structured SQLite database while continuously evaluating the 20-minute unoccupied wastage rule. Fourth, the browser interface presents live telemetry, historical analytics, automated incident notifications, and intelligent AI summaries.
          </p>
        </section>

        {/* SECTION 5: ROLE OF AI */}
        <section className="panel about-section-panel">
          <div className="about-section-header">
            <span className="about-section-tag">05</span>
            <h2>Role of Artificial Intelligence</h2>
          </div>
          <p className="about-body-paragraph">
            Artificial intelligence in WattWise evaluates empirical sensor data to uncover demand patterns, calculate baseline idle loads, isolate peak usage anomalies, and generate facility-wide conservation recommendations. Crucially, the AI operates under strict integrity guidelines: all analytical inferences and chatbot responses are grounded in verified database telemetry records, guaranteeing that measurements and energy metrics are never fabricated or simulated.
          </p>
        </section>

        {/* SECTION 6: HARDWARE AND IOT */}
        <section className="panel about-section-panel">
          <div className="about-section-header">
            <span className="about-section-tag">06</span>
            <h2>Hardware and IoT Integration</h2>
          </div>
          <p className="about-body-paragraph">
            WattWise leverages industry-standard, cost-effective ESP32 microcontrollers configured with current sensors and passive infrared motion detectors. The dedicated Connect Hardware workflow provisions each controller with a unique identifier and cryptographic API key, mapping physical sensor channels to designated rooms to guarantee secure, tamper-resistant data delivery.
          </p>
        </section>

        {/* SECTION 7: ENERGY CONSERVATION APPROACH */}
        <section className="panel about-section-panel">
          <div className="about-section-header">
            <span className="about-section-tag">07</span>
            <h2>Energy Conservation Approach</h2>
          </div>
          <p className="about-body-paragraph">
            By establishing clear visibility over unoccupied electrical consumption, WattWise transforms passive energy management into an active, data-driven discipline. Administrators receive timely alerts when rooms remain powered while empty, enabling prompt remediation, circuit isolation, and policy enforcement to systematically reduce utility overhead and carbon impact.
          </p>
        </section>

        {/* SECTION 8: PROJECT OBJECTIVE */}
        <section className="panel about-section-panel">
          <div className="about-section-header">
            <span className="about-section-tag">08</span>
            <h2>Project Objective</h2>
          </div>
          <p className="about-body-paragraph">
            The primary objective of WattWise is to deliver a reliable, intuitive, and production-grade smart electricity monitoring platform that eliminates undetected energy waste in educational and commercial facilities through automated IoT telemetry, intelligent rule validation, and verified empirical reporting.
          </p>
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   SHARED COMPONENTS
========================================================= */

function MetricCard({
  label,
  value,
  icon,
  accent,
  subtitle,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent: string;
  subtitle?: string;
}) {
  return (
    <div className={`metric-card accent-${accent}`}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-body">
        <small className="metric-label">{label}</small>
        <strong className="metric-value">{value}</strong>
        {subtitle && <span className="metric-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <Info size={18} />
      <span>{message}</span>
    </div>
  );
}
