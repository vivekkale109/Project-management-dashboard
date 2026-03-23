import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleOff,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Sun,
  Users
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfToday
} from "date-fns";

const API_BASE = "/api";
const STATUS_COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in-progress", label: "In Progress" },
  { key: "done", label: "Done" }
];
const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "team-member", label: "Team Member" }
];
const projectStatuses = ["Not Started", "In Progress", "Completed"];
const priorityOptions = ["Low", "Medium", "High"];
const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "tasks", label: "Tasks", icon: CheckCircle2 },
  { id: "team", label: "Team", icon: Users }
];

function uid() {
  return crypto.randomUUID();
}

async function api(path, options = {}) {
  const token = localStorage.getItem("flowpilot-token");
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    let message = "Something went wrong.";
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {}
    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "admin@flowpilot.dev",
    password: "demo123",
    role: "manager"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : form;
      const data = await api(path, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      localStorage.setItem("flowpilot-token", data.token);
      onAuthenticated(data.user);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <motion.div
        className="auth-panel auth-marketing"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="eyebrow">Portfolio-grade workspace</span>
        <h1>FlowPilot keeps projects moving with clarity, ownership, and momentum.</h1>
        <p>
          Track execution across projects, manage team capacity, and move tasks through a
          responsive kanban board with analytics built in.
        </p>
        <div className="auth-stats">
          <div>
            <strong>12+</strong>
            <span>widgets and data views</span>
          </div>
          <div>
            <strong>3</strong>
            <span>roles with guarded actions</span>
          </div>
          <div>
            <strong>CSV</strong>
            <span>exportable project reporting</span>
          </div>
        </div>
        <div className="demo-credentials">
          <span>Demo accounts</span>
          <p>`admin@flowpilot.dev`, `manager@flowpilot.dev`, `member@flowpilot.dev`</p>
          <p>Password: `demo123`</p>
        </div>
      </motion.div>

      <motion.form
        className="auth-panel auth-form"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="auth-header">
          <span className="eyebrow">{mode === "login" ? "Welcome back" : "Create account"}</span>
          <h2>{mode === "login" ? "Sign in to your dashboard" : "Start managing work smarter"}</h2>
        </div>

        {mode === "signup" ? (
          <label>
            Full name
            <input
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Jordan Lee"
            />
          </label>
        ) : null}

        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="you@company.com"
          />
        </label>

        <label>
          Password
          <input
            required
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            placeholder="••••••••"
          />
        </label>

        {mode === "signup" ? (
          <label>
            Role
            <select
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {error ? <div className="inline-error">{error}</div> : null}

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Working..." : mode === "login" ? "Login" : "Create account"}
        </button>

        <button
          className="ghost-button centered-button"
          type="button"
          onClick={() => {
            setMode((current) => (current === "login" ? "signup" : "login"));
            setError("");
          }}
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
        </button>
      </motion.form>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="section-header">
          <div>
            <span className="eyebrow">Quick create</span>
            <h3>{title}</h3>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>
            <CircleOff size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function AppShell({ session, onLogout }) {
  const [activeView, setActiveView] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("flowpilot-theme") || "dark");
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    deadline: format(addDays(new Date(), 14), "yyyy-MM-dd"),
    status: "Not Started",
    memberIds: [],
    color: "#5eead4"
  });
  const [taskForm, setTaskForm] = useState({
    projectId: "",
    title: "",
    description: "",
    deadline: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    priority: "Medium",
    status: "todo",
    assigneeId: "",
    attachments: []
  });

  const canManageProjects = ["admin", "manager"].includes(session.role);
  const canDeleteProjects = session.role === "admin";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("flowpilot-theme", theme);
  }, [theme]);

  useEffect(() => {
    async function load() {
      try {
        const [bootstrap, insightData] = await Promise.all([
          api("/bootstrap"),
          api("/insights")
        ]);
        setData(bootstrap);
        setInsights(insightData);
        setTaskForm((current) => ({
          ...current,
          projectId: bootstrap.projects[0]?.id || "",
          assigneeId: bootstrap.users[0]?.id || ""
        }));
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    load();
  }, []);

  const statusChartData = useMemo(() => {
    if (!data) return [];
    return STATUS_COLUMNS.map((column) => ({
      name: column.label,
      value: data.tasks.filter((task) => task.status === column.key).length
    }));
  }, [data]);

  const priorityChartData = useMemo(() => {
    if (!data) return [];
    return priorityOptions.map((priority, index) => ({
      name: priority,
      value: data.tasks.filter((task) => task.priority === priority).length,
      color: ["#5eead4", "#facc15", "#ff7b72"][index]
    }));
  }, [data]);

  const upcomingDeadlines = useMemo(() => {
    if (!data) return [];
    const today = startOfToday();
    return [...data.tasks]
      .filter((task) => task.status !== "done" && isAfter(parseISO(task.deadline), addDays(today, -1)))
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 6);
  }, [data]);

  async function refresh() {
    const [bootstrap, insightData] = await Promise.all([api("/bootstrap"), api("/insights")]);
    setData(bootstrap);
    setInsights(insightData);
  }

  async function handleCreateProject(event) {
    event.preventDefault();
    await api("/projects", {
      method: "POST",
      body: JSON.stringify(projectForm)
    });
    setProjectModalOpen(false);
    setProjectForm({
      name: "",
      description: "",
      deadline: format(addDays(new Date(), 14), "yyyy-MM-dd"),
      status: "Not Started",
      memberIds: [],
      color: "#5eead4"
    });
    await refresh();
  }

  async function handleCreateTask(event) {
    event.preventDefault();
    await api("/tasks", {
      method: "POST",
      body: JSON.stringify(taskForm)
    });
    setTaskModalOpen(false);
    setTaskForm((current) => ({
      ...current,
      title: "",
      description: "",
      attachments: []
    }));
    await refresh();
  }

  async function updateTask(taskId, updates) {
    await api(`/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(updates)
    });
    await refresh();
  }

  async function addComment(taskId) {
    const message = commentDrafts[taskId]?.trim();
    if (!message) return;

    await api(`/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify({ message })
    });
    setCommentDrafts((current) => ({ ...current, [taskId]: "" }));
    await refresh();
  }

  async function markNotificationRead(notificationId) {
    await api(`/notifications/${notificationId}/read`, {
      method: "POST"
    });
    await refresh();
  }

  async function removeProject(projectId) {
    await api(`/projects/${projectId}`, { method: "DELETE" });
    await refresh();
  }

  async function exportReport() {
    const csv = await api("/reports/export");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "flowpilot-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <div className="empty-state full-screen">
        <h2>We hit a setup issue</h2>
        <p>{error}</p>
        <button className="primary-button" onClick={onLogout}>
          Back to sign in
        </button>
      </div>
    );
  }

  if (!data || !insights) {
    return (
      <div className="empty-state full-screen">
        <h2>Loading workspace</h2>
        <p>Fetching projects, tasks, and team activity.</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`}>
        <div className="brand-block">
          <div className="brand-mark">FP</div>
          <div>
            <h2>FlowPilot</h2>
            <p>Project command center</p>
          </div>
        </div>

        <nav className="nav-list">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activeView === item.id ? "active" : ""}`}
                onClick={() => {
                  setActiveView(item.id);
                  setMobileNavOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="user-card">
            <div className="avatar">{data.currentUser.avatar}</div>
            <div>
              <strong>{data.currentUser.name}</strong>
              <span>{data.currentUser.role}</span>
            </div>
          </div>
          <button className="ghost-button toolbar-button" onClick={onLogout}>
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-only" onClick={() => setMobileNavOpen((v) => !v)}>
              <Menu size={18} />
            </button>
            <div>
              <span className="eyebrow">Workspace overview</span>
              <h1>Keep every sprint, teammate, and deadline in one place.</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="icon-button"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="ghost-button toolbar-button" onClick={exportReport}>
              <CalendarDays size={16} />
              Export CSV
            </button>
            {canManageProjects ? (
              <button className="primary-button toolbar-button" onClick={() => setProjectModalOpen(true)}>
                <Plus size={16} />
                New project
              </button>
            ) : null}
            <button className="primary-button toolbar-button" onClick={() => setTaskModalOpen(true)}>
              <Plus size={16} />
              New task
            </button>
          </div>
        </header>

        <section className="hero-banner">
          <div>
            <span className="eyebrow">Productivity insight</span>
            <h2>{insights.recommendation}</h2>
            <p>
              Focus score is <strong>{Math.round(insights.focusScore)}</strong>/100 with{" "}
              <strong>{insights.highPriority}</strong> high-priority tasks and{" "}
              <strong>{insights.overdue}</strong> overdue items.
            </p>
          </div>
          <div className="hero-pill-grid">
            <div className="hero-pill">
              <span>Throughput</span>
              <strong>{insights.throughput}%</strong>
            </div>
            <div className="hero-pill">
              <span>Unread alerts</span>
              <strong>{data.notifications.filter((note) => !note.read).length}</strong>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <StatCard label="Total Projects" value={data.stats.totalProjects} accent="teal" />
          <StatCard label="Total Tasks" value={data.stats.totalTasks} accent="gold" />
          <StatCard label="Completed Tasks" value={data.stats.completedTasks} accent="coral" />
          <StatCard label="Team Members" value={data.stats.teamMembers} accent="sky" />
        </section>

        {activeView === "dashboard" ? (
          <DashboardView
            data={data}
            statusChartData={statusChartData}
            priorityChartData={priorityChartData}
            upcomingDeadlines={upcomingDeadlines}
            markNotificationRead={markNotificationRead}
          />
        ) : null}

        {activeView === "projects" ? (
          <ProjectsView
            data={data}
            canDeleteProjects={canDeleteProjects}
            removeProject={removeProject}
          />
        ) : null}

        {activeView === "tasks" ? (
          <TasksView
            data={data}
            session={session}
            draggedTaskId={draggedTaskId}
            setDraggedTaskId={setDraggedTaskId}
            updateTask={updateTask}
            addComment={addComment}
            commentDrafts={commentDrafts}
            setCommentDrafts={setCommentDrafts}
          />
        ) : null}

        {activeView === "team" ? <TeamView data={data} upcomingDeadlines={upcomingDeadlines} /> : null}
      </main>

      {projectModalOpen ? (
        <Modal title="Create project" onClose={() => setProjectModalOpen(false)}>
          <form className="modal-form" onSubmit={handleCreateProject}>
            <label>
              Project name
              <input
                required
                value={projectForm.name}
                onChange={(event) =>
                  setProjectForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label>
              Description
              <textarea
                required
                rows="3"
                value={projectForm.description}
                onChange={(event) =>
                  setProjectForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <div className="form-split">
              <label>
                Deadline
                <input
                  type="date"
                  value={projectForm.deadline}
                  onChange={(event) =>
                    setProjectForm((current) => ({ ...current, deadline: event.target.value }))
                  }
                />
              </label>
              <label>
                Status
                <select
                  value={projectForm.status}
                  onChange={(event) =>
                    setProjectForm((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  {projectStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Team members
              <select
                multiple
                value={projectForm.memberIds}
                onChange={(event) =>
                  setProjectForm((current) => ({
                    ...current,
                    memberIds: Array.from(event.target.selectedOptions, (option) => option.value)
                  }))
                }
              >
                {data.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Accent color
              <input
                type="color"
                value={projectForm.color}
                onChange={(event) =>
                  setProjectForm((current) => ({ ...current, color: event.target.value }))
                }
              />
            </label>
            <button className="primary-button" type="submit">
              Create project
            </button>
          </form>
        </Modal>
      ) : null}

      {taskModalOpen ? (
        <Modal title="Create task" onClose={() => setTaskModalOpen(false)}>
          <form className="modal-form" onSubmit={handleCreateTask}>
            <label>
              Project
              <select
                required
                value={taskForm.projectId}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, projectId: event.target.value }))
                }
              >
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input
                required
                value={taskForm.title}
                onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label>
              Description
              <textarea
                required
                rows="3"
                value={taskForm.description}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <div className="form-split">
              <label>
                Deadline
                <input
                  type="date"
                  value={taskForm.deadline}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, deadline: event.target.value }))
                  }
                />
              </label>
              <label>
                Priority
                <select
                  value={taskForm.priority}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, priority: event.target.value }))
                  }
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-split">
              <label>
                Status
                <select
                  value={taskForm.status}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  {STATUS_COLUMNS.map((column) => (
                    <option key={column.key} value={column.key}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Assignee
                <select
                  value={taskForm.assigneeId}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, assigneeId: event.target.value }))
                  }
                >
                  {data.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Attachment label
              <input
                placeholder="Sprint doc"
                onChange={(event) =>
                  setTaskForm((current) => {
                    const attachment = current.attachments[0] || { id: uid(), label: "", url: "" };
                    return {
                      ...current,
                      attachments: [{ ...attachment, label: event.target.value }]
                    };
                  })
                }
              />
            </label>
            <label>
              Attachment URL
              <input
                type="url"
                placeholder="https://..."
                onChange={(event) =>
                  setTaskForm((current) => {
                    const attachment = current.attachments[0] || { id: uid(), label: "", url: "" };
                    return {
                      ...current,
                      attachments: [{ ...attachment, url: event.target.value }]
                    };
                  })
                }
              />
            </label>
            <button className="primary-button" type="submit">
              Create task
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function DashboardView({ data, statusChartData, priorityChartData, upcomingDeadlines, markNotificationRead }) {
  return (
    <div className="view-grid">
      <motion.section className="panel large-panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="section-header">
          <div>
            <span className="eyebrow">Project progress</span>
            <h3>Execution across active initiatives</h3>
          </div>
        </div>
        <div className="project-grid">
          {data.projects.map((project) => (
            <div key={project.id} className="project-card">
              <div className="project-card-head">
                <span className="project-dot" style={{ background: project.color }} />
                <span className={`status-chip status-${project.status.replaceAll(" ", "-").toLowerCase()}`}>
                  {project.status}
                </span>
              </div>
              <h4>{project.name}</h4>
              <p>{project.description}</p>
              <div className="meter">
                <div className="meter-fill" style={{ width: `${project.progress}%`, background: project.color }} />
              </div>
              <div className="project-meta">
                <span>{project.progress}% complete</span>
                <span>Due {format(parseISO(project.deadline), "MMM d")}</span>
              </div>
              <div className="avatar-stack">
                {project.members.map((member) => (
                  <span key={member.id} className="avatar small-avatar" title={member.name}>
                    {member.avatar}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section className="panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="section-header">
          <div>
            <span className="eyebrow">Task health</span>
            <h3>Kanban load</h3>
          </div>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusChartData}>
              <XAxis dataKey="name" stroke="var(--muted)" />
              <YAxis stroke="var(--muted)" />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.06)" }} />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="var(--accent)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      <motion.section className="panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="section-header">
          <div>
            <span className="eyebrow">Priority mix</span>
            <h3>Where attention is going</h3>
          </div>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={priorityChartData} innerRadius={54} outerRadius={82} paddingAngle={5} dataKey="value">
                {priorityChartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      <motion.section className="panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="section-header">
          <div>
            <span className="eyebrow">Recent activity</span>
            <h3>What changed lately</h3>
          </div>
        </div>
        <div className="feed-list">
          {data.activity.slice(0, 6).map((entry) => (
            <div key={entry.id} className="feed-item">
              <span className="avatar small-avatar">{entry.user?.avatar || "?"}</span>
              <div>
                <strong>{entry.user?.name || "Teammate"}</strong>
                <p>{entry.message}</p>
                <span>{format(parseISO(entry.createdAt), "MMM d, h:mm a")}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section className="panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="section-header">
          <div>
            <span className="eyebrow">Notifications</span>
            <h3>Stay ahead of updates</h3>
          </div>
        </div>
        <div className="feed-list">
          {data.notifications.map((note) => (
            <button
              key={note.id}
              className={`notification-card ${note.read ? "read" : ""}`}
              onClick={() => markNotificationRead(note.id)}
            >
              <Bell size={16} />
              <div>
                <strong>{note.text}</strong>
                <span>{format(parseISO(note.createdAt), "MMM d, h:mm a")}</span>
              </div>
            </button>
          ))}
          {data.notifications.length === 0 ? <p>No alerts yet.</p> : null}
        </div>
      </motion.section>

      <motion.section className="panel large-panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="section-header">
          <div>
            <span className="eyebrow">Calendar view</span>
            <h3>Upcoming deadlines</h3>
          </div>
        </div>
        <div className="calendar-list">
          {upcomingDeadlines.map((task) => {
            const daysLeft = differenceInCalendarDays(parseISO(task.deadline), startOfToday());
            return (
              <div key={task.id} className="calendar-row">
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.project?.name}</p>
                </div>
                <div className="calendar-meta">
                  <span>{format(parseISO(task.deadline), "MMM d")}</span>
                  <span className={`status-chip ${daysLeft <= 2 ? "status-overdue" : "status-upcoming"}`}>
                    {daysLeft === 0 ? "Today" : `${daysLeft} days`}
                  </span>
                </div>
              </div>
            );
          })}
          {upcomingDeadlines.length === 0 ? <p>No upcoming deadlines in the current window.</p> : null}
        </div>
      </motion.section>
    </div>
  );
}

function ProjectsView({ data, canDeleteProjects, removeProject }) {
  return (
    <div className="stack-layout">
      {data.projects.map((project) => (
        <motion.section key={project.id} className="panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <div className="section-header">
            <div>
              <span className="eyebrow">Project</span>
              <h3>{project.name}</h3>
            </div>
            {canDeleteProjects ? (
              <button className="ghost-button" onClick={() => removeProject(project.id)}>
                Delete project
              </button>
            ) : null}
          </div>
          <p>{project.description}</p>
          <div className="detail-grid">
            <div>
              <span>Status</span>
              <strong>{project.status}</strong>
            </div>
            <div>
              <span>Deadline</span>
              <strong>{format(parseISO(project.deadline), "PPP")}</strong>
            </div>
            <div>
              <span>Progress</span>
              <strong>{project.progress}%</strong>
            </div>
            <div>
              <span>Owner</span>
              <strong>{project.owner?.name}</strong>
            </div>
          </div>
          <div className="avatar-stack">
            {project.members.map((member) => (
              <div key={member.id} className="member-pill">
                <span className="avatar small-avatar">{member.avatar}</span>
                <span>{member.name}</span>
              </div>
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  );
}

function TasksView({
  data,
  session,
  draggedTaskId,
  setDraggedTaskId,
  updateTask,
  addComment,
  commentDrafts,
  setCommentDrafts
}) {
  return (
    <div className="kanban-shell">
      {STATUS_COLUMNS.map((column) => {
        const columnTasks = data.tasks.filter((task) => task.status === column.key);
        return (
          <div
            key={column.key}
            className="kanban-column"
            onDragOver={(event) => event.preventDefault()}
            onDrop={async () => {
              if (draggedTaskId) {
                await updateTask(draggedTaskId, { status: column.key });
                setDraggedTaskId(null);
              }
            }}
          >
            <div className="kanban-header">
              <strong>{column.label}</strong>
              <span>{columnTasks.length}</span>
            </div>

            {columnTasks.map((task) => {
              const canEdit = ["admin", "manager"].includes(session.role) || task.assigneeId === session.id;
              const isOverdue =
                task.status !== "done" && isBefore(parseISO(task.deadline), addDays(startOfToday(), 0));
              return (
                <motion.div
                  key={task.id}
                  className="task-card"
                  draggable
                  onDragStart={() => setDraggedTaskId(task.id)}
                  whileHover={{ y: -2 }}
                >
                  <div className="task-card-head">
                    <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
                    <span className={`status-chip ${isOverdue ? "status-overdue" : "status-upcoming"}`}>
                      {isOverdue ? "Overdue" : format(parseISO(task.deadline), "MMM d")}
                    </span>
                  </div>
                  <h4>{task.title}</h4>
                  <p>{task.description}</p>
                  <div className="task-meta">
                    <span>{task.project?.name}</span>
                    <span>{task.assignee?.name}</span>
                  </div>

                  {task.attachments?.length ? (
                    <div className="attachment-list">
                      {task.attachments.map((attachment) => (
                        <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer">
                          {attachment.label || "Attachment"}
                        </a>
                      ))}
                    </div>
                  ) : null}

                  <div className="comment-thread">
                    {task.comments.slice(-2).map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <span className="avatar small-avatar">{comment.user?.avatar || "?"}</span>
                        <div>
                          <strong>{comment.user?.name}</strong>
                          <p>{comment.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="comment-entry">
                    <input
                      value={commentDrafts[task.id] || ""}
                      onChange={(event) =>
                        setCommentDrafts((current) => ({ ...current, [task.id]: event.target.value }))
                      }
                      placeholder="Add comment"
                    />
                    <button className="ghost-button" onClick={() => addComment(task.id)}>
                      Comment
                    </button>
                  </div>

                  {canEdit ? (
                    <div className="task-actions">
                      <label>
                        Assignee
                        <select
                          value={task.assigneeId}
                          onChange={(event) => updateTask(task.id, { assigneeId: event.target.value })}
                        >
                          {data.users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function TeamView({ data, upcomingDeadlines }) {
  const performanceData = data.users.map((user) => {
    const completed = data.tasks.filter((task) => task.assigneeId === user.id && task.status === "done").length;
    const active = data.tasks.filter((task) => task.assigneeId === user.id && task.status !== "done").length;
    return { ...user, completed, active };
  });

  return (
    <div className="view-grid">
      <motion.section className="panel large-panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="section-header">
          <div>
            <span className="eyebrow">Team directory</span>
            <h3>People, ownership, and delivery</h3>
          </div>
        </div>
        <div className="team-grid">
          {performanceData.map((member) => (
            <div key={member.id} className="team-card">
              <span className="avatar">{member.avatar}</span>
              <h4>{member.name}</h4>
              <p>{member.title}</p>
              <span className="status-chip">{member.role}</span>
              <div className="detail-grid condensed">
                <div>
                  <span>Completed</span>
                  <strong>{member.completed}</strong>
                </div>
                <div>
                  <span>Active</span>
                  <strong>{member.active}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section className="panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="section-header">
          <div>
            <span className="eyebrow">Analytics</span>
            <h3>Team performance snapshot</h3>
          </div>
        </div>
        <div className="feed-list">
          {performanceData.map((member) => (
            <div key={member.id} className="calendar-row">
              <div>
                <strong>{member.name}</strong>
                <p>{member.role}</p>
              </div>
              <div className="calendar-meta">
                <span>{member.completed} done</span>
                <span>{member.active} active</span>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section className="panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="section-header">
          <div>
            <span className="eyebrow">Deadline board</span>
            <h3>Next sprint commitments</h3>
          </div>
        </div>
        <div className="feed-list">
          {upcomingDeadlines.map((task) => (
            <div key={task.id} className="feed-item">
              <span className="avatar small-avatar">{task.assignee?.avatar || "?"}</span>
              <div>
                <strong>{task.title}</strong>
                <p>
                  {task.assignee?.name} on {task.project?.name}
                </p>
                <span>{format(parseISO(task.deadline), "PPP")}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <motion.article className={`stat-card accent-${accent}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <span>{label}</span>
      <strong>{value}</strong>
    </motion.article>
  );
}

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("flowpilot-token");
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setSession({
        id: payload.id,
        role: payload.role,
        name: payload.name,
        email: payload.email
      });
    } catch {
      localStorage.removeItem("flowpilot-token");
    }
  }, []);

  function handleAuthenticated(user) {
    setSession(user);
  }

  function handleLogout() {
    localStorage.removeItem("flowpilot-token");
    setSession(null);
  }

  if (!session) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return <AppShell session={session} onLogout={handleLogout} />;
}
