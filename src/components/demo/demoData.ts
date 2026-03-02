import type { Node, Edge } from "@xyflow/react";

export const demoNodes: Node[] = [
  {
    id: "client",
    type: "clientNode",
    position: { x: 50, y: 200 },
    data: { label: "Client App", description: "React / Mini App" },
  },
  {
    id: "api",
    type: "apiNode",
    position: { x: 300, y: 50 },
    data: { label: "API Gateway", description: "Next.js API Routes" },
  },
  {
    id: "bot",
    type: "serviceNode",
    position: { x: 300, y: 350 },
    data: { label: "Telegram Bot", description: "Notifications & Commands" },
  },
  {
    id: "auth",
    type: "serviceNode",
    position: { x: 550, y: 50 },
    data: { label: "Auth Service", description: "Supabase Auth" },
  },
  {
    id: "ai",
    type: "serviceNode",
    position: { x: 550, y: 200 },
    data: { label: "AI Engine", description: "LLM Processing" },
  },
  {
    id: "db",
    type: "databaseNode",
    position: { x: 550, y: 350 },
    data: { label: "Database", description: "PostgreSQL" },
  },
  {
    id: "cache",
    type: "databaseNode",
    position: { x: 800, y: 200 },
    data: { label: "Cache", description: "Redis" },
  },
];

export const demoEdges: Edge[] = [
  { id: "e1", source: "client", target: "api", type: "glowEdge", animated: true },
  { id: "e2", source: "client", target: "bot", type: "glowEdge", animated: true },
  { id: "e3", source: "api", target: "auth", type: "glowEdge" },
  { id: "e4", source: "api", target: "ai", type: "glowEdge" },
  { id: "e5", source: "api", target: "db", type: "glowEdge" },
  { id: "e6", source: "bot", target: "db", type: "glowEdge" },
  { id: "e7", source: "ai", target: "cache", type: "glowEdge" },
  { id: "e8", source: "auth", target: "db", type: "glowEdge" },
];
