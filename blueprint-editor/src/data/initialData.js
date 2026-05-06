export const initialNodes = [
  {
    id: "traffic",
    type: "parent",
    parentId: null,
    title: "1. TRAFFIC & ACQUISITION",
    x: 120,
    y: 130,
    w: 520,
    h: 320,
    notes: "Objetivo: atraer trafico cualificado hacia el sistema.",
    items: ["Organic Search", "Paid Ads", "Referrals", "Social Content"]
  },
  {
    id: "content",
    type: "parent",
    parentId: null,
    title: "2. CONTENT ENGINE",
    x: 760,
    y: 90,
    w: 560,
    h: 360,
    notes: "Convierte ideas, pruebas y capturas en activos reutilizables.",
    items: ["Idea generation", "Content capture", "Distribution", "Feedback loop"]
  },
  {
    id: "sales",
    type: "parent",
    parentId: null,
    title: "3. SALES SYSTEM",
    x: 1460,
    y: 160,
    w: 520,
    h: 330,
    notes: "Filtra, convierte y entrega el lead al siguiente bloque.",
    items: ["Qualify", "Sales call", "Proposal", "Close"]
  },
  {
    id: "ops",
    type: "parent",
    parentId: null,
    title: "4. OPERATING SYSTEM",
    x: 500,
    y: 720,
    w: 700,
    h: 380,
    notes: "Sistema central de metricas, tareas, libreria y mejora continua.",
    items: ["Dashboard", "Asset library", "SOPs", "Optimization"]
  },
  {
    id: "delivery",
    type: "parent",
    parentId: null,
    title: "5. DELIVERY & SUPPORT",
    x: 1380,
    y: 780,
    w: 610,
    h: 350,
    notes: "Entrega, soporte, retencion y expansion.",
    items: ["Onboarding", "Delivery", "Support", "Retention"]
  }
];

export const initialEdges = [
  { id: "e1", from: "traffic", to: "content" },
  { id: "e2", from: "content", to: "sales" },
  { id: "e3", from: "content", to: "ops" },
  { id: "e4", from: "ops", to: "delivery" }
];
