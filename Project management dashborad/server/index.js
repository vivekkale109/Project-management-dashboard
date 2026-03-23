import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { readStore, writeStore, nextId } from "./store.js";

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "flowpilot-dev-secret";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "..", "dist");

function sanitizeUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: "Authorization header is required." });
  }

  const token = header.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please sign in again." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission for this action." });
    }
    return next();
  };
}

function projectProgress(projectId, tasks) {
  const projectTasks = tasks.filter((task) => task.projectId === projectId);
  if (projectTasks.length === 0) {
    return 0;
  }
  const done = projectTasks.filter((task) => task.status === "done").length;
  return Math.round((done / projectTasks.length) * 100);
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function enrichData(store) {
  const userMap = Object.fromEntries(store.users.map((user) => [user.id, sanitizeUser(user)]));
  const projects = store.projects.map((project) => ({
    ...project,
    progress: projectProgress(project.id, store.tasks),
    members: project.memberIds.map((memberId) => userMap[memberId]).filter(Boolean),
    owner: userMap[project.ownerId]
  }));

  const tasks = store.tasks.map((task) => ({
    ...task,
    assignee: userMap[task.assigneeId],
    project: projects.find((project) => project.id === task.projectId),
    comments: task.comments.map((comment) => ({
      ...comment,
      user: userMap[comment.userId]
    }))
  }));

  const notifications = store.notifications.map((note) => ({
    ...note,
    user: userMap[note.userId]
  }));

  const activity = store.activity
    .map((entry) => ({
      ...entry,
      user: userMap[entry.userId]
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { users: store.users.map(sanitizeUser), projects, tasks, notifications, activity };
}

function addActivity(store, userId, message) {
  store.activity.unshift({
    id: nextId("activity"),
    userId,
    message,
    createdAt: new Date().toISOString()
  });
}

function createNotification(store, userId, text) {
  store.notifications.unshift({
    id: nextId("note"),
    userId,
    text,
    read: false,
    createdAt: new Date().toISOString()
  });
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_, res) => {
    res.json({ ok: true });
  });

  app.post("/api/auth/signup", async (req, res) => {
    const { name, email, password, role } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const store = readStore();

    if (!name || !normalizedEmail || !password || !role) {
      return res.status(400).json({ message: "Please complete all signup fields." });
    }

    if (store.users.some((user) => user.email === normalizedEmail)) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = hashPassword(password);
    const user = {
      id: nextId("user"),
      name,
      email: normalizedEmail,
      passwordHash,
      role,
      title:
        role === "admin" ? "Workspace Admin" : role === "manager" ? "Project Manager" : "Team Member",
      avatar: name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("")
    };

    store.users.push(user);
    addActivity(store, user.id, `${user.name} joined the workspace as ${role}.`);
    writeStore(store);

    return res.status(201).json({
      token: createToken(user),
      user: sanitizeUser(user)
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const store = readStore();
    const user = store.users.find((entry) => entry.email === normalizedEmail);

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const matches = hashPassword(password) === user.passwordHash;
    if (!matches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.json({
      token: createToken(user),
      user: sanitizeUser(user)
    });
  });

  app.get("/api/bootstrap", authRequired, (req, res) => {
    const store = readStore();
    const data = enrichData(store);
    const myNotifications = data.notifications.filter((note) => note.userId === req.user.id);
    const stats = {
      totalProjects: data.projects.length,
      totalTasks: data.tasks.length,
      completedTasks: data.tasks.filter((task) => task.status === "done").length,
      teamMembers: data.users.length
    };

    return res.json({
      currentUser: data.users.find((user) => user.id === req.user.id),
      ...data,
      notifications: myNotifications,
      stats
    });
  });

  app.get("/api/insights", authRequired, (req, res) => {
    const store = readStore();
    const data = enrichData(store);
    const highPriority = data.tasks.filter((task) => task.priority === "High").length;
    const overdue = data.tasks.filter(
      (task) => task.status !== "done" && new Date(task.deadline) < new Date()
    ).length;
    const done = data.tasks.filter((task) => task.status === "done").length;
    const throughput = data.tasks.length === 0 ? 0 : Math.round((done / data.tasks.length) * 100);

    res.json({
      focusScore: Math.max(40, 100 - overdue * 8 + throughput / 2),
      throughput,
      highPriority,
      overdue,
      recommendation:
        overdue > 0
          ? "Shift one teammate onto overdue work and reduce new task creation this week."
          : "Delivery is healthy. Use this sprint to close high-priority work and document decisions."
    });
  });

  app.post("/api/projects", authRequired, requireRole("admin", "manager"), (req, res) => {
    const { name, description, deadline, status, memberIds, color } = req.body;
    const store = readStore();
    const project = {
      id: nextId("project"),
      name,
      description,
      deadline,
      status,
      ownerId: req.user.id,
      memberIds: Array.isArray(memberIds) ? memberIds : [],
      color: color || "#5eead4"
    };

    store.projects.unshift(project);
    addActivity(store, req.user.id, `Created project ${name}`);
    for (const memberId of project.memberIds) {
      if (memberId !== req.user.id) {
        createNotification(store, memberId, `You were added to project ${name}.`);
      }
    }
    writeStore(store);

    return res.status(201).json(project);
  });

  app.put("/api/projects/:projectId", authRequired, requireRole("admin", "manager"), (req, res) => {
    const store = readStore();
    const project = store.projects.find((entry) => entry.id === req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    Object.assign(project, req.body);
    addActivity(store, req.user.id, `Updated project ${project.name}`);
    writeStore(store);
    return res.json(project);
  });

  app.delete(
    "/api/projects/:projectId",
    authRequired,
    requireRole("admin"),
    (req, res) => {
      const store = readStore();
      const project = store.projects.find((entry) => entry.id === req.params.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found." });
      }

      store.projects = store.projects.filter((entry) => entry.id !== req.params.projectId);
      store.tasks = store.tasks.filter((task) => task.projectId !== req.params.projectId);
      addActivity(store, req.user.id, `Deleted project ${project.name}`);
      writeStore(store);
      return res.status(204).send();
    }
  );

  app.post("/api/tasks", authRequired, (req, res) => {
  const { title, description, deadline, priority, status, assigneeId, projectId } = req.body;
  const store = readStore();
  const project = store.projects.find((entry) => entry.id === projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found." });
  }

  const userRole = req.user.role;
  const isMemberOfProject = project.memberIds.includes(req.user.id) || project.ownerId === req.user.id;
  if (!["admin", "manager"].includes(userRole) && !isMemberOfProject) {
    return res.status(403).json({ message: "You cannot create tasks for this project." });
  }

  const task = {
    id: nextId("task"),
    title,
    description,
    deadline,
    priority,
    status,
    assigneeId,
    projectId,
    comments: [],
    attachments: req.body.attachments || [],
    createdAt: new Date().toISOString()
  };

  store.tasks.unshift(task);
  addActivity(store, req.user.id, `Created task ${title}`);
  if (assigneeId) {
    createNotification(store, assigneeId, `You were assigned to ${title}.`);
  }
  writeStore(store);
  return res.status(201).json(task);
  });

  app.put("/api/tasks/:taskId", authRequired, (req, res) => {
  const store = readStore();
  const task = store.tasks.find((entry) => entry.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  const isPrivileged = ["admin", "manager"].includes(req.user.role);
  const isAssignee = task.assigneeId === req.user.id;

  if (!isPrivileged && !isAssignee) {
    return res.status(403).json({ message: "You cannot edit this task." });
  }

  Object.assign(task, req.body);
  addActivity(store, req.user.id, `Updated task ${task.title}`);
  if (req.body.assigneeId && req.body.assigneeId !== req.user.id) {
    createNotification(store, req.body.assigneeId, `You were assigned to ${task.title}.`);
  }
  writeStore(store);
  return res.json(task);
  });

  app.delete("/api/tasks/:taskId", authRequired, requireRole("admin", "manager"), (req, res) => {
  const store = readStore();
  const task = store.tasks.find((entry) => entry.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  store.tasks = store.tasks.filter((entry) => entry.id !== req.params.taskId);
  addActivity(store, req.user.id, `Deleted task ${task.title}`);
  writeStore(store);
  return res.status(204).send();
  });

  app.post("/api/tasks/:taskId/comments", authRequired, (req, res) => {
  const store = readStore();
  const task = store.tasks.find((entry) => entry.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  const comment = {
    id: nextId("comment"),
    userId: req.user.id,
    message: req.body.message,
    createdAt: new Date().toISOString()
  };

  task.comments.push(comment);
  addActivity(store, req.user.id, `Commented on ${task.title}`);
  if (task.assigneeId && task.assigneeId !== req.user.id) {
    createNotification(store, task.assigneeId, `New comment on ${task.title}.`);
  }
  writeStore(store);
  return res.status(201).json(comment);
  });

  app.post("/api/notifications/:notificationId/read", authRequired, (req, res) => {
  const store = readStore();
  const note = store.notifications.find((entry) => entry.id === req.params.notificationId);
  if (!note || note.userId !== req.user.id) {
    return res.status(404).json({ message: "Notification not found." });
  }

  note.read = true;
  writeStore(store);
  return res.json(note);
  });

  app.get("/api/reports/export", authRequired, (req, res) => {
  const store = readStore();
  const data = enrichData(store);
  const rows = [
    ["Task", "Project", "Priority", "Status", "Assignee", "Deadline"],
    ...data.tasks.map((task) => [
      task.title,
      task.project?.name || "",
      task.priority,
      task.status,
      task.assignee?.name || "",
      task.deadline
    ])
  ];

  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(",")
    )
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=flowpilot-report.csv");
  return res.send(csv);
  });

  app.use(express.static(distPath));

  app.get("/{*path}", (req, res, next) => {
    if (!req.path.startsWith("/api") && req.method === "GET") {
      return res.sendFile(path.join(distPath, "index.html"));
    }
    return next();
  });

  return app;
}

const app = createApp();

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`FlowPilot server running on http://localhost:${PORT}`);
  });
}
