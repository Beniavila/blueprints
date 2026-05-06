const BLUEPRINT = {
  meta: {
    project: "Gateway-Cloud / Logic Engine",
    version: "docs-phase-1",
    updated: "2026-04-29",
    owner: "No especificado",
    description: "Gateway-Cloud actúa como capa telecom MQTT para mini gateways y delega la lógica de negocio al Logic Engine por gRPC. La documentación también detalla el pipeline legacy de handlers, watchdogs, SQLite y Redis que se extrae al core compartido."
  },

  projects: [
    { id: "gateway-cloud", label: "Gateway-Cloud", color: "#3B82F6" },
    { id: "hanso", label: "Hansō", color: "#10B981" },
    { id: "ender", label: "Ender", color: "#F59E0B" },
    { id: "metal-gear", label: "Metal Gear", color: "#A855F7" },
    { id: "gateway-maker", label: "Gateway Maker", color: "#06B6D4" },
    { id: "hermes", label: "Hermes", color: "#EF4444" }
  ],

  owners: [
    { id: "team.gateway_cloud", name: "Gateway-Cloud", color: "#3B82F6" },
    { id: "team.hanso", name: "Hansō", color: "#10B981" },
    { id: "team.ender", name: "Ender", color: "#F59E0B" },
    { id: "team.metal_gear", name: "Metal Gear", color: "#A855F7" },
    { id: "team.gateway_maker", name: "Gateway Maker", color: "#06B6D4" },
    { id: "team.hermes", name: "Hermes", color: "#EF4444" }
  ],

  context: [
    { id: "ctx.backend", type: "system", label: "Backend", sublabel: "comandos · presencia · resolución", x: 80, y: 110 },
    { id: "ctx.mini", type: "actor", label: "Mini Gateway", sublabel: "puente MQTT · sin lógica", x: 80, y: 310 },
    { id: "ctx.sys", type: "boundary", label: "Gateway-Cloud", sublabel: "capa telecom sin lógica de negocio", x: 420, y: 90, w: 1080, h: 420 },
    { id: "ctx.broker", type: "system", label: "Broker MQTT destino", sublabel: "routing por servidor MQTT", x: 1700, y: 170 },
    { id: "ctx.logic", type: "system", label: "Logic Engine", sublabel: "handlers · consumos · alarmas · persistencia", x: 1700, y: 360 },
    { id: "hanso.ctx.operators", type: "actor", label: "Operators / Admins", sublabel: "browser desktop/mobile", x: 5100, y: 150 },
    { id: "hanso.ctx.sys", type: "boundary", label: "Hansō", sublabel: "portal operaciones gateways · API · monitoring · OTA", x: 5400, y: 80, w: 1680, h: 860 },
    { id: "ender.ctx.operators", type: "actor", label: "Operador / Técnico", sublabel: "UI OTAP", x: 2100, y: 150 },
    { id: "ender.ctx.nodes", type: "system", label: "Nodos / Luminarias", sublabel: "red mesh Wirepas", x: 3880, y: 420 },
    { id: "ender.ctx.sys", type: "boundary", label: "Ender", sublabel: "orquestador OTAP · frontend + backend", x: 2240, y: 80, w: 1640, h: 1020 },
    { id: "mg.ctx.ops", type: "actor", label: "Operaciones / Ender", sublabel: "campañas OTAP y comandos", x: 3540, y: 150 },
    { id: "mg.ctx.local_broker", type: "system", label: "Broker MQTT local", sublabel: "EMQX / Wirepas", x: 5200, y: 260 },
    { id: "mg.ctx.wirepas", type: "system", label: "Red Wirepas", sublabel: "sinks + nodos mesh", x: 5200, y: 420 },
    { id: "mg.ctx.host", type: "system", label: "Linux / systemd / Docker / mmcli", sublabel: "host del gateway", x: 5200, y: 600 },
    { id: "mg.ctx.habaki", type: "system", label: "Habaki Agent", sublabel: "lee /tmp/metal-gear-status.json", x: 5200, y: 780 },
    { id: "mg.ctx.sys", type: "boundary", label: "Metal Gear", sublabel: "agente embebido en gateway", x: 3720, y: 80, w: 1660, h: 940 },
    { id: "gmk.ctx.operator", type: "actor", label: "Operario / Técnico", sublabel: "preparación por puerto serie", x: 7000, y: 150 },
    { id: "gmk.ctx.gateway", type: "system", label: "Gateway físico", sublabel: "USB/serie + shell", x: 8860, y: 220 },
    { id: "gmk.ctx.remote", type: "system", label: "Servicios remotos gateway", sublabel: "init · credenciales · enrolado · updates", x: 8860, y: 420 },
    { id: "gmk.ctx.word", type: "system", label: "Word + impresora", sublabel: "etiquetas GW_ID", x: 8860, y: 620 },
    { id: "gmk.ctx.os", type: "system", label: "Windows Credential Manager", sublabel: "secretos máquina", x: 8860, y: 800 },
    { id: "gmk.ctx.sys", type: "boundary", label: "Gateway Maker", sublabel: "desktop app de aprovisionamiento", x: 7160, y: 80, w: 1740, h: 980 },
    { id: "hms.ctx.operator", type: "actor", label: "Usuario Operador", sublabel: "monitoring dashboards", x: 9000, y: 120 },
    { id: "hms.ctx.devices", type: "system", label: "Dispositivos IoT", sublabel: "alarmas · movimientos · estrategias", x: 10920, y: 240 },
    { id: "hms.ctx.broker", type: "system", label: "Broker MQTT", sublabel: "bus de eventos IoT", x: 10920, y: 460 },
    { id: "hms.ctx.sys", type: "boundary", label: "Hermes", sublabel: "backend concurrente orientado a eventos", x: 9180, y: 80, w: 1660, h: 900 }
  ],

  contextEdges: [
    { from: "ctx.backend", to: "ctx.sys", label: "comandos async · consultas de resolución" },
    { from: "ctx.mini", to: "ctx.sys", label: "MQTT uplink / downlink" },
    { from: "ctx.sys", to: "ctx.broker", label: "publish / subscribe MQTT por nodo" },
    { from: "ctx.sys", to: "ctx.logic", label: "gRPC HandleEvent(LogicRequest)" },
    { from: "hanso.ctx.operators", to: "hanso.ctx.sys", label: "HTTPS / Web UI / SSE / WS" },
    { from: "ctx.mini", to: "hanso.ctx.sys", label: "QUIC / WebSocket · exec · metrics" },
    { from: "ctx.sys", to: "hanso.ctx.sys", label: "operación gateway_service · presencia · updates" },
    { from: "ender.ctx.operators", to: "ender.ctx.sys", label: "HTTPS / JSON" },
    { from: "ender.ctx.sys", to: "ctx.sys", label: "OTAP command/status via gateways MQTT" },
    { from: "ender.ctx.sys", to: "ctx.mini", label: "coordina OTAP en gateways" },
    { from: "ender.ctx.sys", to: "ender.ctx.nodes", label: "OTAP ejecutado por gateways" },
    { from: "mg.ctx.ops", to: "mg.ctx.sys", label: "campañas OTAP + comandos" },
    { from: "ctx.broker", to: "mg.ctx.sys", label: "MQTT legacy y OTAP" },
    { from: "mg.ctx.sys", to: "ctx.broker", label: "respuestas MQTT de gateway" },
    { from: "mg.ctx.sys", to: "mg.ctx.local_broker", label: "comandos locales Wirepas" },
    { from: "mg.ctx.sys", to: "mg.ctx.wirepas", label: "inventario y operaciones OTAP" },
    { from: "mg.ctx.sys", to: "mg.ctx.host", label: "control host y servicios" },
    { from: "mg.ctx.sys", to: "mg.ctx.habaki", label: "estado local JSON" },
    { from: "mg.ctx.habaki", to: "hanso.ctx.sys", label: "métricas y estado gateway" },
    { from: "gmk.ctx.operator", to: "gmk.ctx.sys", label: "GUI Tkinter + automatización" },
    { from: "gmk.ctx.sys", to: "gmk.ctx.gateway", label: "detección y comandos serial" },
    { from: "gmk.ctx.sys", to: "gmk.ctx.remote", label: "HTTP init/creds/enroll/update" },
    { from: "gmk.ctx.sys", to: "gmk.ctx.word", label: "impresión de etiquetas" },
    { from: "gmk.ctx.sys", to: "gmk.ctx.os", label: "persistencia de secretos" },
    { from: "gmk.ctx.sys", to: "hanso.ctx.sys", label: "consumo APIs remotas Gateway Maker" },
    { from: "hms.ctx.devices", to: "hms.ctx.broker", label: "publica/recibe eventos MQTT" },
    { from: "hms.ctx.broker", to: "hms.ctx.sys", label: "mensajes MQTT IoT" },
    { from: "hms.ctx.sys", to: "hms.ctx.broker", label: "respuestas y reintentos MQTT" },
    { from: "hms.ctx.operator", to: "hms.ctx.broker", label: "consulta estado vía dashboards" },
    { from: "hms.ctx.sys", to: "ctx.broker", label: "integración broker MQTT compartido" }
  ],

  containers: [
    {
      id: "c.mini_gateway",
      type: "gateway",
      label: "Mini Gateway",
      tech: "MQTT bridge · sin lógica",
      x: 80,
      y: 220,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-002", "ADR-005", "ADR-010", "ADR-015"]
    },
    {
      id: "c.physical_gateway",
      type: "gateway",
      label: "Gateway físico",
      tech: "instalación · gateway_service · telecom + lógica",
      x: 700,
      y: 540,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-002", "ADR-010", "ADR-015"]
    },
    {
      id: "c.mqtt_gateway_manager",
      type: "gateway",
      label: "MQTT Gateway Manager",
      tech: "MQTT runtime · goroutines · channel",
      x: 380,
      y: 180,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-001", "ADR-003", "ADR-006", "ADR-007", "ADR-016", "ADR-027", "ADR-028", "ADR-029", "ADR-030"]
    },
    {
      id: "c.discovery_assoc",
      type: "service",
      label: "Discovery & Association",
      tech: "node ↔ mini gateway",
      x: 700,
      y: 120,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-010", "ADR-014", "ADR-015"]
    },
    {
      id: "c.node_resolution",
      type: "service",
      label: "Node Resolution",
      tech: "lookup secuencial en backends",
      x: 700,
      y: 320,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-004", "ADR-011", "ADR-012", "ADR-013"]
    },
    {
      id: "c.logic_engine_client",
      type: "service",
      label: "Logic Engine Client",
      tech: "gRPC client · ActionList",
      x: 1040,
      y: 120,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-009", "ADR-018", "ADR-034", "ADR-035", "ADR-036", "ADR-037", "ADR-038"]
    },
    {
      id: "c.backend_connector",
      type: "service",
      label: "Backend Connector",
      tech: "resolver · notificaciones",
      x: 1040,
      y: 320,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-004", "ADR-011", "ADR-017"]
    },
    {
      id: "c.logic_engine",
      type: "service",
      label: "Logic Engine",
      tech: "handlers · watchdogs · SQLite · Redis",
      x: 1040,
      y: 540,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-020", "ADR-021", "ADR-022", "ADR-023", "ADR-024", "ADR-025", "ADR-026", "ADR-031", "ADR-032", "ADR-033", "ADR-039", "ADR-040"]
    },
    {
      id: "c.telecom_cache",
      type: "cache",
      label: "Persistent Store (telecom)",
      tech: "Redis · nodo↔gateway · nodo→servidor",
      x: 1380,
      y: 120,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-012", "ADR-013", "ADR-015", "ADR-038"]
    },
    {
      id: "c.logic_cache",
      type: "cache",
      label: "Redis Service",
      tech: "Redis · write-through/read-through",
      x: 1620,
      y: 120,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-023", "ADR-024", "ADR-038", "ADR-040"]
    },
    {
      id: "c.nodes_db",
      type: "database",
      label: "nodes.db",
      tech: "SQLite · discovery",
      x: 1380,
      y: 320,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-039", "ADR-040"]
    },
    {
      id: "c.status_db",
      type: "database",
      label: "node_status.db",
      tech: "SQLite · status",
      x: 1620,
      y: 320,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-039", "ADR-040"]
    },
    {
      id: "c.strategy_db",
      type: "database",
      label: "node_strategy.db",
      tech: "SQLite · strategy/kit",
      x: 1380,
      y: 520,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-039", "ADR-040"]
    },
    {
      id: "c.alarms_db",
      type: "database",
      label: "node_alarms.db",
      tech: "SQLite · alarms",
      x: 1620,
      y: 520,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-039", "ADR-040"]
    },
    {
      id: "c.consumptions_db",
      type: "database",
      label: "node_consumptions.db",
      tech: "SQLite · raw/coefs/lost",
      x: 1500,
      y: 760,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-025", "ADR-026", "ADR-039", "ADR-040"]
    },
    {
      id: "c.dest_broker",
      type: "broker",
      label: "Broker MQTT destino",
      tech: "MQTT · dev/beta/prod/...",
      x: 1860,
      y: 180,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-004", "ADR-016", "ADR-017"]
    },
    {
      id: "c.backend",
      type: "external",
      label: "Backends",
      tech: "lookup · presencia · comandos",
      x: 1860,
      y: 420,
      project: "gateway-cloud",
      owner: "team.gateway_cloud",
      adrs: ["ADR-004", "ADR-011", "ADR-017"]
    },
    {
      id: "hanso.nginx",
      type: "gateway",
      label: "nginx",
      tech: "Nginx · TLS · reverse proxy",
      x: 5440,
      y: 180,
      project: "hanso",
      owner: "team.hanso"
    },
    {
      id: "hanso.app",
      type: "service",
      label: "hanso",
      tech: "Python · Flask · dependency-injector",
      x: 5740,
      y: 180,
      project: "hanso",
      owner: "team.hanso",
      adrs: ["HANSO-ADR-001", "HANSO-ADR-003", "HANSO-ADR-004", "HANSO-ADR-005", "HANSO-ADR-007"]
    },
    {
      id: "hanso.broker",
      type: "gateway",
      label: "hanso-broker",
      tech: "Go · QUIC / WS · HTTP API",
      x: 5740,
      y: 420,
      project: "hanso",
      owner: "team.hanso",
      adrs: ["HANSO-ADR-002", "HANSO-ADR-006"]
    },
    {
      id: "hanso.redis",
      type: "cache",
      label: "redis",
      tech: "Redis 7 · presence · gateway:events",
      x: 6120,
      y: 420,
      project: "hanso",
      owner: "team.hanso",
      adrs: ["HANSO-ADR-002", "HANSO-ADR-006"]
    },
    {
      id: "hanso.postgres",
      type: "database",
      label: "postgres",
      tech: "PostgreSQL 16 · primary DB",
      x: 6380,
      y: 120,
      project: "hanso",
      owner: "team.hanso"
    },
    {
      id: "hanso.sqlite",
      type: "database",
      label: "shared sqlite",
      tech: "SQLite · /data/hanso/hanso.db",
      x: 6380,
      y: 320,
      project: "hanso",
      owner: "team.hanso"
    },
    {
      id: "hanso.users_config",
      type: "database",
      label: "YAML users config",
      tech: "YAML · USERS_CONFIG_PATH",
      x: 6380,
      y: 520,
      project: "hanso",
      owner: "team.hanso",
      adrs: ["HANSO-ADR-004"]
    },
    {
      id: "hanso.minio",
      type: "service",
      label: "minio",
      tech: "MinIO · artifacts",
      x: 6380,
      y: 720,
      project: "hanso",
      owner: "team.hanso",
      adrs: ["HANSO-ADR-007"]
    },
    {
      id: "hanso.remote_portals",
      type: "external",
      label: "Remote portal APIs",
      tech: "prod · senegal · beta · dev",
      x: 6840,
      y: 120,
      project: "hanso",
      owner: "team.hanso"
    },
    {
      id: "hanso.docker_hub",
      type: "external",
      label: "Docker Hub",
      tech: "gateway_service tags",
      x: 6840,
      y: 320,
      project: "hanso",
      owner: "team.hanso"
    },
    {
      id: "hanso.port_service",
      type: "external",
      label: "port_service",
      tech: "host-side · legacy SSH tunnels",
      x: 6840,
      y: 520,
      project: "hanso",
      owner: "team.hanso",
      adrs: ["HANSO-ADR-003"]
    },

    {
      id: "ender.frontend",
      type: "frontend",
      label: "Ender Frontend",
      tech: "React · UI campañas OTAP",
      x: 2300,
      y: 180,
      project: "ender",
      owner: "team.ender",
      adrs: ["ENDER-ADR-01"]
    },
    {
      id: "ender.api",
      type: "service",
      label: "Ender API",
      tech: "Go · REST/HTTP",
      x: 2580,
      y: 180,
      project: "ender",
      owner: "team.ender",
      adrs: ["ENDER-ADR-01"]
    },
    {
      id: "ender.core",
      type: "service",
      label: "Backend Core",
      tech: "Go · CampaignService/Node/Firmware",
      x: 2860,
      y: 180,
      project: "ender",
      owner: "team.ender",
      adrs: ["ENDER-ADR-01", "ENDER-ADR-02", "ENDER-ADR-04", "ENDER-ADR-05"]
    },
    {
      id: "ender.scheduler",
      type: "worker",
      label: "Scheduler",
      tech: "Go · campaign timing",
      x: 2860,
      y: 420,
      project: "ender",
      owner: "team.ender",
      adrs: ["ENDER-ADR-01", "ENDER-ADR-03"]
    },
    {
      id: "ender.worker",
      type: "worker",
      label: "Worker OTAP",
      tech: "Go · step executor",
      x: 3160,
      y: 420,
      project: "ender",
      owner: "team.ender",
      adrs: ["ENDER-ADR-01", "ENDER-ADR-03", "ENDER-ADR-05"]
    },
    {
      id: "ender.server_registry",
      type: "service",
      label: "Server Registry",
      tech: "server_id → HTTP/MQTT config",
      x: 2860,
      y: 660,
      project: "ender",
      owner: "team.ender",
      adrs: ["ENDER-ADR-01"]
    },
    {
      id: "ender.remote_backend",
      type: "external",
      label: "Remote Backend Adapter",
      tech: "HTTP org/gateway discovery",
      x: 3160,
      y: 660,
      project: "ender",
      owner: "team.ender",
      adrs: ["ENDER-ADR-01"]
    },
    {
      id: "ender.mqtt_adapter",
      type: "service",
      label: "MQTT Gateway Adapter",
      tech: "Protobuf + AES-GCM",
      x: 3460,
      y: 180,
      project: "ender",
      owner: "team.ender",
      adrs: ["ENDER-ADR-05"]
    },
    {
      id: "ender.nats",
      type: "queue",
      label: "NATS JetStream",
      tech: "ender.otap.job.v1.*",
      x: 3460,
      y: 420,
      project: "ender",
      owner: "team.ender",
      adrs: ["ENDER-ADR-03"]
    },
    {
      id: "ender.postgres",
      type: "database",
      label: "Ender Postgres",
      tech: "campaign state + audit",
      x: 3460,
      y: 660,
      project: "ender",
      owner: "team.ender",
      adrs: ["ENDER-ADR-02"]
    },
    {
      id: "ender.minio",
      type: "service",
      label: "Ender MinIO",
      tech: "firmware storage S3-compatible",
      x: 3460,
      y: 900,
      project: "ender",
      owner: "team.ender",
      adrs: ["ENDER-ADR-04"]
    },

    {
      id: "mg.bootstrap_runtime",
      type: "service",
      label: "Bootstrap & Runtime",
      tech: "main.py · systemd entrypoint",
      x: 3760,
      y: 180,
      project: "metal-gear",
      owner: "team.metal_gear",
      adrs: ["MG-ADR-0001"]
    },
    {
      id: "mg.cloud_mqtt_runtime",
      type: "gateway",
      label: "Cloud MQTT Runtime",
      tech: "models/mqtt_client.py",
      x: 4040,
      y: 180,
      project: "metal-gear",
      owner: "team.metal_gear",
      adrs: ["MG-ADR-0001", "MG-ADR-0002", "MG-ADR-0005"]
    },
    {
      id: "mg.local_command_service",
      type: "gateway",
      label: "Local MQTT Command Service",
      tech: "LocalCommandService + Paho local",
      x: 4040,
      y: 420,
      project: "metal-gear",
      owner: "team.metal_gear",
      adrs: ["MG-ADR-0002", "MG-ADR-0005"]
    },
    {
      id: "mg.otap_core",
      type: "service",
      label: "OTAP Ender Core",
      tech: "OTAPHandler + steps/services",
      x: 4320,
      y: 180,
      project: "metal-gear",
      owner: "team.metal_gear",
      adrs: ["MG-ADR-0001", "MG-ADR-0002", "MG-ADR-0003"]
    },
    {
      id: "mg.watchdog_subsystem",
      type: "service",
      label: "Watchdog Subsystem",
      tech: "WatchdogManager + BaseWatchdog",
      x: 4320,
      y: 420,
      project: "metal-gear",
      owner: "team.metal_gear",
      adrs: ["MG-ADR-0001", "MG-ADR-0004", "MG-ADR-0005"]
    },
    {
      id: "mg.infrastructure_adapters",
      type: "service",
      label: "Infrastructure Adapters",
      tech: "Linux/Timezone/MQTT/Wirepas/Config",
      x: 4600,
      y: 300,
      project: "metal-gear",
      owner: "team.metal_gear",
      adrs: ["MG-ADR-0001", "MG-ADR-0005"]
    },
    {
      id: "mg.command_stack",
      type: "service",
      label: "Command Stack",
      tech: "Dispatcher + domain commands",
      x: 4600,
      y: 540,
      project: "metal-gear",
      owner: "team.metal_gear",
      adrs: ["MG-ADR-0001", "MG-ADR-0005"]
    },
    {
      id: "mg.local_broker",
      type: "broker",
      label: "Local Broker",
      tech: "MQTT local EMQX/Wirepas",
      x: 4880,
      y: 420,
      project: "metal-gear",
      owner: "team.metal_gear",
      adrs: ["MG-ADR-0002"]
    },
    {
      id: "mg.wirepas_mesh",
      type: "external",
      label: "Wirepas Mesh",
      tech: "wirepas_mqtt_library",
      x: 4880,
      y: 180,
      project: "metal-gear",
      owner: "team.metal_gear",
      adrs: ["MG-ADR-0003", "MG-ADR-0005"]
    },
    {
      id: "mg.habaki_agent",
      type: "external",
      label: "Habaki Agent",
      tech: "status relay",
      x: 4880,
      y: 660,
      project: "metal-gear",
      owner: "team.metal_gear",
      adrs: ["MG-ADR-0004"]
    },
    {
      id: "mg.host_os",
      type: "external",
      label: "Linux Host Services",
      tech: "systemd · Docker · mmcli · timedatectl",
      x: 5160,
      y: 300,
      project: "metal-gear",
      owner: "team.metal_gear",
      adrs: ["MG-ADR-0005"]
    },

    {
      id: "gmk.desktop_app",
      type: "frontend",
      label: "Gateway Maker Desktop App",
      tech: "Python · Tkinter · PySerial",
      x: 7240,
      y: 180,
      project: "gateway-maker",
      owner: "team.gateway_maker",
      adrs: ["GMK-ADR-0001", "GMK-ADR-0002", "GMK-ADR-0003", "GMK-ADR-0004"]
    },
    {
      id: "gmk.local_config",
      type: "database",
      label: "Local Config",
      tech: "serial_sequence.json · config/*",
      x: 7520,
      y: 420,
      project: "gateway-maker",
      owner: "team.gateway_maker",
      adrs: ["GMK-ADR-0003"]
    },
    {
      id: "gmk.windows_secrets",
      type: "database",
      label: "Machine Secrets Store",
      tech: "Windows Credential Manager",
      x: 7800,
      y: 420,
      project: "gateway-maker",
      owner: "team.gateway_maker",
      adrs: ["GMK-ADR-0002", "GMK-ADR-0004"]
    },
    {
      id: "gmk.gateway_device",
      type: "gateway",
      label: "Gateway Device (Serial)",
      tech: "USB/serial shell",
      x: 8080,
      y: 180,
      project: "gateway-maker",
      owner: "team.gateway_maker",
      adrs: ["GMK-ADR-0003"]
    },
    {
      id: "gmk.remote_init_api",
      type: "external",
      label: "Remote Init API",
      tech: "HTTP init script",
      x: 8360,
      y: 180,
      project: "gateway-maker",
      owner: "team.gateway_maker",
      adrs: ["GMK-ADR-0002"]
    },
    {
      id: "gmk.remote_creds_api",
      type: "external",
      label: "Remote Credentials API",
      tech: "HTTP signed requests",
      x: 8360,
      y: 340,
      project: "gateway-maker",
      owner: "team.gateway_maker",
      adrs: ["GMK-ADR-0002"]
    },
    {
      id: "gmk.remote_enroll_api",
      type: "external",
      label: "Remote Enroll API",
      tech: "HTTP machine enrollment",
      x: 8360,
      y: 500,
      project: "gateway-maker",
      owner: "team.gateway_maker",
      adrs: ["GMK-ADR-0002"]
    },
    {
      id: "gmk.remote_update_api",
      type: "external",
      label: "Remote Update API",
      tech: "latest.json + ZIP",
      x: 8360,
      y: 660,
      project: "gateway-maker",
      owner: "team.gateway_maker",
      adrs: ["GMK-ADR-0004"]
    },
    {
      id: "gmk.word_printer",
      type: "external",
      label: "Word + Label Printer",
      tech: "python-docx · pywin32",
      x: 7800,
      y: 660,
      project: "gateway-maker",
      owner: "team.gateway_maker",
      adrs: ["GMK-ADR-0001", "GMK-ADR-0004"]
    },
    {
      id: "hms.entrypoint",
      type: "service",
      label: "Hermes Entrypoint",
      tech: "main.go",
      x: 9260,
      y: 180,
      project: "hermes",
      owner: "team.hermes",
      adrs: ["HMS-ADR-001", "HMS-ADR-003", "HMS-ADR-004"]
    },
    {
      id: "hms.config",
      type: "service",
      label: "Config + Logger",
      tech: "YAML + env · logger estructurado",
      x: 9540,
      y: 180,
      project: "hermes",
      owner: "team.hermes",
      adrs: ["HMS-ADR-003"]
    },
    {
      id: "hms.mqtt_client",
      type: "gateway",
      label: "MQTT Client",
      tech: "Paho MQTT · reconnect · subscribe",
      x: 9540,
      y: 380,
      project: "hermes",
      owner: "team.hermes",
      adrs: ["HMS-ADR-002", "HMS-ADR-004"]
    },
    {
      id: "hms.router",
      type: "service",
      label: "Router",
      tech: "dispatch + worker pool",
      x: 9820,
      y: 380,
      project: "hermes",
      owner: "team.hermes",
      adrs: ["HMS-ADR-004"]
    },
    {
      id: "hms.handlers",
      type: "service",
      label: "Handlers",
      tech: "alarms · movement · strategies",
      x: 10100,
      y: 260,
      project: "hermes",
      owner: "team.hermes",
      adrs: ["HMS-ADR-003", "HMS-ADR-004"]
    },
    {
      id: "hms.workers",
      type: "service",
      label: "Retry Workers",
      tech: "alarm/movement/strategy retry",
      x: 10100,
      y: 500,
      project: "hermes",
      owner: "team.hermes",
      adrs: ["HMS-ADR-003"]
    },
    {
      id: "hms.memory_store",
      type: "cache",
      label: "In-Memory Stores",
      tech: "MemoryAlarm/Movement/StrategyStore",
      x: 10380,
      y: 380,
      project: "hermes",
      owner: "team.hermes",
      adrs: ["HMS-ADR-001", "HMS-ADR-003"]
    },
    {
      id: "hms.metrics",
      type: "service",
      label: "Metrics",
      tech: "Prometheus exporter HTTP",
      x: 10380,
      y: 620,
      project: "hermes",
      owner: "team.hermes",
      adrs: ["HMS-ADR-005"]
    },
    {
      id: "hms.prometheus",
      type: "external",
      label: "Prometheus",
      tech: "scrape /metrics",
      x: 10660,
      y: 620,
      project: "hermes",
      owner: "team.hermes",
      adrs: ["HMS-ADR-005"]
    },

    { id: "adr.001", type: "adr", label: "ADR-001", title: "Gateway-Cloud cubre las telecomunicaciones de instalaciones con mini gateways", status: "Accepted", date: "unknown", x: 360, y: 860 },
    { id: "adr.002", type: "adr", label: "ADR-002", title: "Mini gateway sin lógica", status: "Accepted", date: "unknown", x: 80, y: 860 },
    { id: "adr.003", type: "adr", label: "ADR-003", title: "Comunicación asíncrona mediante MQTT", status: "Accepted", date: "unknown", x: 360, y: 970 },
    { id: "adr.004", type: "adr", label: "ADR-004", title: "Routing por servidor MQTT destino", status: "Accepted", date: "unknown", x: 700, y: 860 },
    { id: "adr.005", type: "adr", label: "ADR-005", title: "Gestión de zona horaria por mini gateway", status: "Accepted", date: "unknown", x: 80, y: 970 },
    { id: "adr.006", type: "adr", label: "ADR-006", title: "No pérdida ni duplicación de datos", status: "Accepted", date: "unknown", x: 360, y: 1080 },
    { id: "adr.007", type: "adr", label: "ADR-007", title: "Prioridad en throughput", status: "Accepted", date: "unknown", x: 360, y: 1190 },
    { id: "adr.008", type: "adr", label: "ADR-008", title: "Persistencia limitada al gateway actual", status: "Accepted", date: "unknown", x: 1380, y: 860 },

    { id: "adr.009", type: "adr", label: "ADR-009", title: "Arquitectura modular con Logic Engine como core compartido", status: "Accepted", date: "unknown", x: 1040, y: 860 },
    { id: "adr.010", type: "adr", label: "ADR-010", title: "Partición híbrida por fase del flujo", status: "Accepted", date: "unknown", x: 700, y: 970 },
    { id: "adr.011", type: "adr", label: "ADR-011", title: "Resolución distribuida de nodo por búsqueda secuencial en backends", status: "Accepted", date: "unknown", x: 700, y: 1080 },
    { id: "adr.012", type: "adr", label: "ADR-012", title: "Cache persistente de resolución nodo → servidor MQTT", status: "Accepted", date: "unknown", x: 1620, y: 860 },
    { id: "adr.013", type: "adr", label: "ADR-013", title: "Asociación nodo → servidor MQTT inmutable", status: "Accepted", date: "unknown", x: 1620, y: 970 },
    { id: "adr.014", type: "adr", label: "ADR-014", title: "Redescubrimiento lógico con reutilización de resolución previa", status: "Accepted", date: "unknown", x: 700, y: 1190 },
    { id: "adr.015", type: "adr", label: "ADR-015", title: "Reasociación inmediata de nodo al nuevo mini gateway", status: "Accepted", date: "unknown", x: 700, y: 1300 },
    { id: "adr.016", type: "adr", label: "ADR-016", title: "Conexión MQTT unificada", status: "Accepted", date: "unknown", x: 1860, y: 860 },

    { id: "adr.017", type: "adr", label: "ADR-017", title: "Conexiones MQTT por servidor MQTT destino", status: "Accepted", date: "unknown", x: 1040, y: 970 },
    { id: "adr.018", type: "adr", label: "ADR-018", title: "Pipeline de procesamiento compartido", status: "Accepted", date: "unknown", x: 1040, y: 1080 },
    { id: "adr.019", type: "adr", label: "ADR-019", title: "Procesamiento concurrente por mini gateway con streaming controlado", status: "Accepted", date: "unknown", x: 360, y: 1300 },
    { id: "adr.020", type: "adr", label: "ADR-020", title: "Orden de procesamiento por nodo", status: "Accepted", date: "unknown", x: 1380, y: 970 },
    { id: "adr.021", type: "adr", label: "ADR-021", title: "Workers dinámicos por nodo", status: "Accepted", date: "unknown", x: 1380, y: 1080 },
    { id: "adr.022", type: "adr", label: "ADR-022", title: "Pipeline de handlers con dispatch por tipo de mensaje", status: "Superseded", date: "unknown", x: 1380, y: 1190 },
    { id: "adr.023", type: "adr", label: "ADR-023", title: "Estado en memoria por nodo con respaldo en Redis", status: "Superseded", date: "unknown", x: 1620, y: 1080 },
    { id: "adr.024", type: "adr", label: "ADR-024", title: "Inicialización de estado por nodo con fallback a Redis", status: "Superseded", date: "unknown", x: 1620, y: 1190 },

    { id: "adr.025", type: "adr", label: "ADR-025", title: "Procesamiento de consumos por sesión de nodo", status: "Superseded", date: "unknown", x: 1380, y: 1300 },
    { id: "adr.026", type: "adr", label: "ADR-026", title: "Resiliencia de consumos en el nodo", status: "Superseded", date: "unknown", x: 1380, y: 1410 },
    { id: "adr.027", type: "adr", label: "ADR-027", title: "Concurrencia por conexión MQTT", status: "Accepted", date: "unknown", x: 360, y: 1410 },
    { id: "adr.028", type: "adr", label: "ADR-028", title: "Delegación de procesamiento fuera de la goroutine de conexión MQTT", status: "Accepted", date: "unknown", x: 360, y: 1520 },
    { id: "adr.029", type: "adr", label: "ADR-029", title: "Uso de channel como buffer de entrada controlado", status: "Accepted", date: "unknown", x: 360, y: 1630 },
    { id: "adr.030", type: "adr", label: "ADR-030", title: "Channel global compartido para entrada de mensajes", status: "Accepted", date: "unknown", x: 360, y: 1740 },
    { id: "adr.031", type: "adr", label: "ADR-031", title: "Estrategia de concurrencia del Dispatcher", status: "Accepted", date: "unknown", x: 1380, y: 1520 },
    { id: "adr.032", type: "adr", label: "ADR-032", title: "Gestión de Node Workers con map + mutex", status: "Accepted", date: "unknown", x: 1380, y: 1630 },

    { id: "adr.033", type: "adr", label: "ADR-033", title: "Lifecycle de Node Worker basado en timeout", status: "Accepted", date: "unknown", x: 1380, y: 1740 },
    { id: "adr.034", type: "adr", label: "ADR-034", title: "Delegación de lógica de negocio al Logic Engine vía gRPC", status: "Accepted", date: "unknown", x: 1040, y: 1190 },
    { id: "adr.035", type: "adr", label: "ADR-035", title: "Estrategia de integración Logic Engine ↔ gateway: sombra, canary, takeover", status: "Accepted", date: "unknown", x: 1040, y: 1300 },
    { id: "adr.036", type: "adr", label: "ADR-036", title: "Sistema de comparación de paridad Python ↔ Logic Engine", status: "Accepted", date: "unknown", x: 1040, y: 1410 },
    { id: "adr.037", type: "adr", label: "ADR-037", title: "Tabla de tolerancias de paridad Python ↔ Logic Engine", status: "Accepted", date: "unknown", x: 1040, y: 1520 },
    { id: "adr.038", type: "adr", label: "ADR-038", title: "Separación de estado: telecom vs Logic Engine durante la convivencia", status: "Accepted", date: "unknown", x: 1040, y: 1630 },
    { id: "adr.039", type: "adr", label: "ADR-039", title: "Lógica desacoplada de infraestructura: repositorios por dominio", status: "Accepted", date: "unknown", x: 1380, y: 1850 },
    { id: "adr.040", type: "adr", label: "ADR-040", title: "Escalado horizontal: consistent hashing por node_id y sharding de BD", status: "Accepted", date: "unknown", x: 1380, y: 1960 }
  ],

  containerEdges: [
    { from: "c.physical_gateway", to: "c.mini_gateway", label: "aloja enlace telecom", protocol: "runtime" },
    { from: "c.physical_gateway", to: "c.logic_engine", label: "usa lógica de gateway", protocol: "runtime" },
    { from: "c.mini_gateway", to: "c.mqtt_gateway_manager", label: "MQTT uplink", protocol: "mqtt" },
    { from: "c.dest_broker", to: "c.mqtt_gateway_manager", label: "downlink backend", protocol: "mqtt" },
    { from: "c.mqtt_gateway_manager", to: "c.discovery_assoc", label: "eventos normalizados" },
    { from: "c.discovery_assoc", to: "c.telecom_cache", label: "node ↔ gateway", protocol: "redis" },
    { from: "c.discovery_assoc", to: "c.node_resolution", label: "resolve if missing" },
    { from: "c.node_resolution", to: "c.backend_connector", label: "consultas secuenciales" },
    { from: "c.node_resolution", to: "c.telecom_cache", label: "node → servidor MQTT", protocol: "redis" },
    { from: "c.discovery_assoc", to: "c.logic_engine_client", label: "evento enriquecido" },
    { from: "c.mqtt_gateway_manager", to: "c.logic_engine_client", label: "backend command / gateway command" },
    { from: "c.logic_engine_client", to: "c.logic_engine", label: "gRPC HandleEvent", protocol: "grpc" },
    { from: "c.logic_engine_client", to: "c.mqtt_gateway_manager", label: "acciones SEND_TO_NODE / Subscribe" },
    { from: "c.logic_engine_client", to: "c.backend_connector", label: "acciones SEND_TO_BACKEND" },
    { from: "c.backend_connector", to: "c.backend", label: "lookup + notificaciones" },
    { from: "c.mqtt_gateway_manager", to: "c.dest_broker", label: "publish / subscribe por servidor", protocol: "mqtt" },
    { from: "c.mqtt_gateway_manager", to: "c.mini_gateway", label: "MQTT downlink", protocol: "mqtt" },
    { from: "c.logic_engine", to: "c.logic_cache", label: "read/write-through", protocol: "redis" },
    { from: "c.logic_engine", to: "c.nodes_db", label: "discovery / lumos / neighbors", protocol: "sql" },
    { from: "c.logic_engine", to: "c.status_db", label: "status / last_seen", protocol: "sql" },
    { from: "c.logic_engine", to: "c.strategy_db", label: "strategy / kit", protocol: "sql" },
    { from: "c.logic_engine", to: "c.alarms_db", label: "alarm status", protocol: "sql" },
    { from: "c.logic_engine", to: "c.consumptions_db", label: "raw / coef / lost", protocol: "sql" },
    { from: "hanso.nginx", to: "hanso.app", label: "HTTP / SSE / WebSocket", protocol: "http" },
    { from: "hanso.app", to: "hanso.broker", label: "exec / terminal HTTP API", protocol: "http" },
    { from: "hanso.broker", to: "hanso.redis", label: "presence TTL + gateway:events", protocol: "redis" },
    { from: "hanso.app", to: "hanso.redis", label: "presence read + pub/sub consume", protocol: "redis" },
    { from: "hanso.app", to: "hanso.postgres", label: "inventory / metrics / versions", protocol: "sql" },
    { from: "hanso.app", to: "hanso.sqlite", label: "legacy shared operational state", protocol: "sql" },
    { from: "hanso.app", to: "hanso.users_config", label: "users + bcrypt hashes", protocol: "file" },
    { from: "hanso.app", to: "hanso.minio", label: "artifacts + presigned URLs", protocol: "http" },
    { from: "hanso.app", to: "hanso.remote_portals", label: "org / service / location sync", protocol: "http" },
    { from: "hanso.app", to: "hanso.docker_hub", label: "gateway_service tags", protocol: "http" },
    { from: "hanso.app", to: "hanso.port_service", label: "legacy SSH tunnel management", protocol: "http" },
    { from: "c.physical_gateway", to: "hanso.broker", label: "QUIC / WS · Habaki", protocol: "quic" },
    { from: "hanso.broker", to: "c.physical_gateway", label: "exec / terminal / updates", protocol: "quic" },
    { from: "c.mini_gateway", to: "hanso.broker", label: "QUIC UDP 4433 / WS legacy · auth / heartbeat / metrics", protocol: "quic" },
    { from: "hanso.broker", to: "c.mini_gateway", label: "exec / terminal relay / update commands", protocol: "quic" },

    { from: "ender.frontend", to: "ender.api", label: "HTTP/JSON", protocol: "http" },
    { from: "ender.api", to: "ender.core", label: "service calls" },
    { from: "ender.core", to: "ender.postgres", label: "campaigns / gateways / logs", protocol: "sql" },
    { from: "ender.core", to: "ender.minio", label: "firmware metadata + object URL", protocol: "http" },
    { from: "ender.core", to: "ender.scheduler", label: "scheduled campaigns" },
    { from: "ender.scheduler", to: "ender.nats", label: "create OTAP jobs", protocol: "nats" },
    { from: "ender.nats", to: "ender.worker", label: "deliver OTAP job", protocol: "nats" },
    { from: "ender.worker", to: "ender.core", label: "step status/events" },
    { from: "ender.worker", to: "ender.postgres", label: "persist step execution", protocol: "sql" },
    { from: "ender.worker", to: "ender.minio", label: "download firmware", protocol: "http" },
    { from: "ender.core", to: "ender.server_registry", label: "resolve server config" },
    { from: "ender.server_registry", to: "ender.remote_backend", label: "HTTP gateway discovery", protocol: "http" },
    { from: "ender.worker", to: "ender.mqtt_adapter", label: "publish OTAP commands" },
    { from: "ender.mqtt_adapter", to: "c.dest_broker", label: "MQTT encrypted envelope", protocol: "mqtt" },
    { from: "ender.mqtt_adapter", to: "c.physical_gateway", label: "ender/command/otap/{step}/{gateway_id}", protocol: "mqtt" },
    { from: "c.physical_gateway", to: "ender.mqtt_adapter", label: "ender/status/otap/{step}/{gateway_id}", protocol: "mqtt" },
    { from: "ender.mqtt_adapter", to: "c.mini_gateway", label: "ender/command/otap/{step}/{gateway_id}", protocol: "mqtt" },
    { from: "c.mini_gateway", to: "ender.mqtt_adapter", label: "ender/status/otap/{step}/{gateway_id}", protocol: "mqtt" },

    { from: "c.physical_gateway", to: "mg.bootstrap_runtime", label: "co-residente en gateway", protocol: "runtime" },
    { from: "mg.bootstrap_runtime", to: "mg.cloud_mqtt_runtime", label: "arranque runtime cloud" },
    { from: "mg.bootstrap_runtime", to: "mg.local_command_service", label: "arranque runtime local" },
    { from: "mg.cloud_mqtt_runtime", to: "mg.otap_core", label: "ender/command/otap/{step}/{gateway_id}", protocol: "mqtt" },
    { from: "mg.otap_core", to: "mg.cloud_mqtt_runtime", label: "ender/status/otap/{step}/{gateway_id}", protocol: "mqtt" },
    { from: "mg.cloud_mqtt_runtime", to: "mg.command_stack", label: "cl-req/gw/{gw_id}", protocol: "mqtt" },
    { from: "mg.command_stack", to: "mg.infrastructure_adapters", label: "comandos host/network" },
    { from: "mg.watchdog_subsystem", to: "mg.infrastructure_adapters", label: "watchdog checks" },
    { from: "mg.local_command_service", to: "mg.local_broker", label: "gateway/command/wirepas/{gw_id}", protocol: "mqtt" },
    { from: "mg.local_broker", to: "mg.local_command_service", label: "gateway/response/wirepas/{gw_id}", protocol: "mqtt" },
    { from: "mg.otap_core", to: "mg.wirepas_mesh", label: "inventory/propagate/processing/collect", protocol: "wirepas" },
    { from: "mg.watchdog_subsystem", to: "mg.habaki_agent", label: "/tmp/metal-gear-status.json", protocol: "file" },
    { from: "mg.infrastructure_adapters", to: "mg.host_os", label: "systemd · Docker · mmcli · timezone", protocol: "os" },
    { from: "mg.cloud_mqtt_runtime", to: "c.dest_broker", label: "legacy + OTAP publish", protocol: "mqtt" },
    { from: "c.dest_broker", to: "mg.cloud_mqtt_runtime", label: "legacy + OTAP consume", protocol: "mqtt" },
    { from: "ender.mqtt_adapter", to: "mg.cloud_mqtt_runtime", label: "ender/command/otap/{step}/{gateway_id}", protocol: "mqtt" },
    { from: "mg.cloud_mqtt_runtime", to: "ender.mqtt_adapter", label: "ender/status/otap/{step}/{gateway_id}", protocol: "mqtt" },
    { from: "mg.habaki_agent", to: "hanso.broker", label: "métricas gateway", protocol: "quic" },

    { from: "gmk.desktop_app", to: "gmk.local_config", label: "carga secuencia/config", protocol: "file" },
    { from: "gmk.desktop_app", to: "gmk.windows_secrets", label: "token + clave privada máquina", protocol: "os" },
    { from: "gmk.desktop_app", to: "gmk.gateway_device", label: "login + secuencia serial", protocol: "serial" },
    { from: "gmk.desktop_app", to: "gmk.remote_init_api", label: "descarga autorun.sh", protocol: "http" },
    { from: "gmk.desktop_app", to: "gmk.remote_creds_api", label: "credenciales runtime firmadas", protocol: "http" },
    { from: "gmk.desktop_app", to: "gmk.remote_enroll_api", label: "enrolado de máquina", protocol: "http" },
    { from: "gmk.desktop_app", to: "gmk.remote_update_api", label: "latest.json + ZIP", protocol: "http" },
    { from: "gmk.desktop_app", to: "gmk.word_printer", label: "etiquetas GW_ID", protocol: "print" },
    { from: "gmk.desktop_app", to: "c.physical_gateway", label: "provisión por USB/serie", protocol: "serial" },
    { from: "gmk.remote_init_api", to: "hanso.app", label: "script init por destino/cluster", protocol: "http" },
    { from: "gmk.remote_creds_api", to: "hanso.app", label: "credenciales de ejecución", protocol: "http" },
    { from: "gmk.remote_enroll_api", to: "hanso.app", label: "registro máquina operadora", protocol: "http" },
    { from: "gmk.remote_update_api", to: "hanso.app", label: "metadatos de versión Gateway Maker", protocol: "http" },
    { from: "gmk.remote_update_api", to: "hanso.minio", label: "artefactos de actualización", protocol: "http" },

    { from: "hms.entrypoint", to: "hms.config", label: "init config + logger" },
    { from: "hms.entrypoint", to: "hms.mqtt_client", label: "init MQTT runtime" },
    { from: "hms.entrypoint", to: "hms.router", label: "register handlers + pool" },
    { from: "hms.mqtt_client", to: "hms.router", label: "message ingress", protocol: "mqtt" },
    { from: "hms.router", to: "hms.handlers", label: "topic dispatch" },
    { from: "hms.handlers", to: "hms.memory_store", label: "set/update pending state" },
    { from: "hms.handlers", to: "hms.workers", label: "notify pending retry" },
    { from: "hms.workers", to: "hms.memory_store", label: "scan pending + cleanup" },
    { from: "hms.workers", to: "hms.mqtt_client", label: "retry publish", protocol: "mqtt" },
    { from: "hms.entrypoint", to: "hms.metrics", label: "expose KPIs" },
    { from: "hms.prometheus", to: "hms.metrics", label: "scrape /metrics", protocol: "http" },
    { from: "hms.mqtt_client", to: "c.dest_broker", label: "consume/publish MQTT IoT", protocol: "mqtt" },
    { from: "c.dest_broker", to: "hms.mqtt_client", label: "topics IoT hacia Hermes", protocol: "mqtt" },

    { from: "adr.001", to: "c.mqtt_gateway_manager", kind: "adr" },
    { from: "adr.002", to: "c.mini_gateway", kind: "adr" },
    { from: "adr.003", to: "c.mqtt_gateway_manager", kind: "adr" },
    { from: "adr.004", to: "c.node_resolution", kind: "adr" },
    { from: "adr.005", to: "c.mini_gateway", kind: "adr" },
    { from: "adr.006", to: "c.mqtt_gateway_manager", kind: "adr" },
    { from: "adr.007", to: "c.mqtt_gateway_manager", kind: "adr" },
    { from: "adr.008", to: "c.logic_engine", kind: "adr" },
    { from: "adr.009", to: "c.logic_engine_client", kind: "adr" },
    { from: "adr.010", to: "c.discovery_assoc", kind: "adr" },
    { from: "adr.011", to: "c.node_resolution", kind: "adr" },
    { from: "adr.012", to: "c.telecom_cache", kind: "adr" },
    { from: "adr.013", to: "c.telecom_cache", kind: "adr" },
    { from: "adr.014", to: "c.discovery_assoc", kind: "adr" },
    { from: "adr.015", to: "c.discovery_assoc", kind: "adr" },
    { from: "adr.016", to: "c.dest_broker", kind: "adr" },
    { from: "adr.017", to: "c.backend_connector", kind: "adr" },
    { from: "adr.018", to: "c.logic_engine_client", kind: "adr" },
    { from: "adr.019", to: "c.mqtt_gateway_manager", kind: "adr" },
    { from: "adr.020", to: "c.logic_engine", kind: "adr" },
    { from: "adr.021", to: "c.logic_engine", kind: "adr" },
    { from: "adr.022", to: "c.logic_engine", kind: "adr" },
    { from: "adr.023", to: "c.logic_cache", kind: "adr" },
    { from: "adr.024", to: "c.logic_cache", kind: "adr" },
    { from: "adr.025", to: "c.logic_engine", kind: "adr" },
    { from: "adr.026", to: "c.logic_engine", kind: "adr" },
    { from: "adr.027", to: "c.mqtt_gateway_manager", kind: "adr" },
    { from: "adr.028", to: "c.mqtt_gateway_manager", kind: "adr" },
    { from: "adr.029", to: "c.mqtt_gateway_manager", kind: "adr" },
    { from: "adr.030", to: "c.mqtt_gateway_manager", kind: "adr" },
    { from: "adr.031", to: "c.logic_engine", kind: "adr" },
    { from: "adr.032", to: "c.logic_engine", kind: "adr" },
    { from: "adr.033", to: "c.logic_engine", kind: "adr" },
    { from: "adr.034", to: "c.logic_engine_client", kind: "adr" },
    { from: "adr.035", to: "c.logic_engine_client", kind: "adr" },
    { from: "adr.036", to: "c.logic_engine_client", kind: "adr" },
    { from: "adr.037", to: "c.logic_engine_client", kind: "adr" },
    { from: "adr.038", to: "c.logic_engine_client", kind: "adr" },
    { from: "adr.039", to: "c.logic_engine", kind: "adr" },
    { from: "adr.040", to: "c.logic_engine", kind: "adr" }
  ],

  components: {
    "c.physical_gateway": [
      { id: "cmp.physical.gateway_service", type: "worker", label: "gateway_service", tech: "runtime en instalación", desc: "Software del gateway físico desplegado en campo." },
      { id: "cmp.physical.telecom_side", type: "handler", label: "telecom side", tech: "Mini Gateway / MQTT", desc: "Parte que enlaza nodos y backend por telecomunicaciones." },
      { id: "cmp.physical.logic_side", type: "handler", label: "logic side", tech: "lógica de gateway", desc: "Parte que consume la lógica del gateway." }
    ],
    "c.mqtt_gateway_manager": [
      { id: "cmp.mqtt.connection_manager", type: "worker", label: "ConnectionManager", tech: "1 goroutine por servidor", desc: "Mantiene conexiones MQTT activas, aisladas y con reconexión." },
      { id: "cmp.mqtt.connection", type: "worker", label: "MQTTConnection", tech: "MQTT", desc: "Recibe, publica y delega inmediatamente el mensaje entrante." },
      { id: "cmp.mqtt.ingress_adapter", type: "handler", label: "IngressAdapter", tech: "MQTT → internal", desc: "Normaliza node_id, gateway_id y payload hacia el formato interno." },
      { id: "cmp.mqtt.global_channel", type: "worker", label: "GlobalChannel", tech: "buffer controlado", desc: "Absorbe ráfagas y aplica backpressure antes del dispatch." },
      { id: "cmp.mqtt.dispatcher", type: "handler", label: "Dispatcher", tech: "routing por node_id", desc: "Enruta cada mensaje al worker del nodo correspondiente." },
      { id: "cmp.mqtt.node_worker_manager", type: "worker", label: "NodeWorkerManager", tech: "map + mutex", desc: "Crea o reutiliza workers dinámicos por nodo." },
      { id: "cmp.mqtt.node_worker", type: "worker", label: "NodeWorker", tech: "secuencial por nodo", desc: "Garantiza orden por nodo y emite timeouts de sesión." },
      { id: "cmp.mqtt.egress_adapter", type: "handler", label: "EgressAdapter", tech: "publish / subscribe", desc: "Ejecuta acciones MQTT devueltas por Logic Engine." }
    ],
    "c.discovery_assoc": [
      { id: "cmp.discovery.association", type: "handler", label: "DiscoveryAssociation", tech: "node ↔ gateway", desc: "Registra avistamientos y decide si el nodo debe resolverse." },
      { id: "cmp.discovery.reassociation", type: "handler", label: "ReassociationPolicy", tech: "redescubrimiento lógico", desc: "Reasocia inmediatamente un nodo al mini gateway que lo vuelve a ver." }
    ],
    "c.node_resolution": [
      { id: "cmp.resolution.lookup", type: "handler", label: "SequentialBackendResolver", tech: "lookup secuencial", desc: "Consulta backends uno a uno hasta encontrar el servidor MQTT del nodo." },
      { id: "cmp.resolution.cache_writer", type: "handler", label: "ResolutionCacheWriter", tech: "Redis", desc: "Persiste la resolución node_id → servidor MQTT como caché persistente." }
    ],
    "c.logic_engine_client": [
      { id: "cmp.grpc.adapter", type: "handler", label: "GRPCAdapter", tech: "HandleEvent", desc: "Envía LogicRequest al Logic Engine y recibe ActionList." },
      { id: "cmp.grpc.timeout_bridge", type: "handler", label: "TimeoutBridge", tech: "NODE_TIMEOUT", desc: "Convierte timeouts de node workers en eventos lógicos gRPC." },
      { id: "cmp.grpc.action_executor", type: "handler", label: "ActionExecutor", tech: "Publish / Subscribe", desc: "Despacha PublishCloud, SendWirepas, Subscribe y Unsubscribe." }
    ],
    "c.backend_connector": [
      { id: "cmp.backend.lookup", type: "handler", label: "BackendLookup", tech: "resolver", desc: "Resuelve nodos contra backends y devuelve el servidor MQTT asociado." },
      { id: "cmp.backend.publisher", type: "handler", label: "BackendPublisher", tech: "notifications", desc: "Envía presencia, descubrimiento y eventos procesados hacia backend." }
    ],
    "c.logic_engine": [
      { id: "cmp.logic.wirepas_chain", type: "handler", label: "WirepasHandlerChain", tech: "21 handlers", desc: "Procesa uplink, status, consumos, alarmas y UNIC_MSG." },
      { id: "cmp.logic.cloud_node_chain", type: "handler", label: "CloudNodeHandlerChain", tech: "9 handlers", desc: "Procesa comandos cloud → nodo y confirma estrategias, kits y raws." },
      { id: "cmp.logic.cloud_gateway_chain", type: "handler", label: "CloudGatewayChain", tech: "3 handlers", desc: "Procesa comandos cloud → gateway y utilidades compartidas." },
      { id: "cmp.logic.calculate_consumptions", type: "worker", label: "CalculateConsumptionsService", tech: "polyfit + métricas", desc: "Calcula coeficientes, ahorro, consumo y publica resultados." },
      { id: "cmp.logic.keepalive_watchdog", type: "worker", label: "CheckNodesKeepaliveWatchdog", tech: "cada 30 s", desc: "Detecta nodos caídos, fuerza cierre y limpia estado." },
      { id: "cmp.logic.lost_watchdog", type: "worker", label: "CheckConsumptionLostWatchdog", tech: "cada 25 s", desc: "Recompone DALI perdido y relanza el cálculo final." }
    ],
    "hanso.app": [
      { id: "hanso.cmp.auth_session", type: "handler", label: "Auth + session", tech: "Flask session · YAML · bcrypt", desc: "Gestiona login, sesión cookie, roles y allowed_sources." },
      { id: "hanso.cmp.portal_api", type: "handler", label: "Portal / API controllers", tech: "Flask controllers", desc: "Expone gateway, monitoring, config, OTA y Gateway Maker." },
      { id: "hanso.cmp.use_cases", type: "handler", label: "Application services / use cases", tech: "dependency-injector", desc: "Orquesta CRUD, bootstrap, presencia, updates y command templates." },
      { id: "hanso.cmp.infrastructure_adapters", type: "handler", label: "Infrastructure adapters", tech: "BrokerCommandExecutor · repos · MinIO", desc: "Conecta use cases con broker, PostgreSQL, SQLite, Redis, MinIO y portales remotos." },
      { id: "hanso.cmp.broker_events_worker", type: "worker", label: "broker_events_worker", tech: "Redis pub/sub", desc: "Consume gateway:events y persiste métricas/eventos en PostgreSQL." },
      { id: "hanso.cmp.legacy_provisioning", type: "handler", label: "Legacy provisioning", tech: "ansible-playbook", desc: "Mantiene /provision como flujo heredado sobre SSH." }
    ],
    "hanso.broker": [
      { id: "hanso.cmp.broker.quic_ws", type: "handler", label: "QUIC / WS listener", tech: "quic-go · WebSocket", desc: "Acepta conexiones persistentes de Habaki y autentica gateways." },
      { id: "hanso.cmp.broker.presence_writer", type: "worker", label: "Presence writer", tech: "Redis SETEX / SADD / SREM", desc: "Mantiene gateway:presence:{gw_id} y gateway:online." },
      { id: "hanso.cmp.broker.events_publisher", type: "worker", label: "Events publisher", tech: "Redis pub/sub", desc: "Publica connected, disconnected y metrics en gateway:events." },
      { id: "hanso.cmp.broker.http_api", type: "handler", label: "Internal HTTP API", tech: "net/http · :8090", desc: "Expone health, online, status, exec y terminal/open para Hansō." },
      { id: "hanso.cmp.broker.relay_worker", type: "worker", label: "Exec / terminal relay", tech: "Habaki protocol", desc: "Reenvía exec y terminal entre Hansō, browser y gateway conectado." }
    ],
    "ender.api": [
      { id: "ender.cmp.api.campaign", type: "handler", label: "CampaignAPI", tech: "Go HTTP", desc: "Crea campañas, inicia flujos y consulta estado OTAP." },
      { id: "ender.cmp.api.node", type: "handler", label: "NodeAPI", tech: "Go HTTP", desc: "Consulta nodos y metadatos operativos." },
      { id: "ender.cmp.api.gateway", type: "handler", label: "GatewayAPI", tech: "Go HTTP", desc: "Lista gateways de organización en servidor remoto." },
      { id: "ender.cmp.api.firmware", type: "handler", label: "FirmwareAPI", tech: "Go HTTP", desc: "Carga firmware y expone metadata de artifacts." }
    ],
    "ender.core": [
      { id: "ender.cmp.core.campaign_service", type: "handler", label: "CampaignService", tech: "Go domain", desc: "Orquesta lifecycle OTAP, pasos, timeouts y reintentos." },
      { id: "ender.cmp.core.node_service", type: "handler", label: "NodeService", tech: "Go domain", desc: "Gestiona metadatos de nodos para campañas." },
      { id: "ender.cmp.core.gateway_service", type: "handler", label: "GatewayService", tech: "Go domain", desc: "Resuelve gateways por servidor + organización." },
      { id: "ender.cmp.core.firmware_service", type: "handler", label: "FirmwareService", tech: "Go domain", desc: "Mantiene metadata firmware y acceso a MinIO." }
    ],
    "ender.scheduler": [
      { id: "ender.cmp.scheduler.tick", type: "worker", label: "SchedulerTick", tech: "interval loop", desc: "Detecta campañas ready/stuck y república jobs idempotentes." },
      { id: "ender.cmp.scheduler.producer", type: "worker", label: "JobProducer", tech: "JetStream producer", desc: "Publica mensajes ender.otap.job.v1.{step}." }
    ],
    "ender.worker": [
      { id: "ender.cmp.worker.consumer", type: "worker", label: "OTAP Job Consumer", tech: "JetStream durable", desc: "Consume jobs, aplica idempotency_key y ejecuta step." },
      { id: "ender.cmp.worker.step_executor", type: "handler", label: "StepExecutor", tech: "propagate/processing/collect", desc: "Secuencia fases OTAP y actualiza campaign_steps." },
      { id: "ender.cmp.worker.state_writer", type: "handler", label: "StateWriter", tech: "Postgres", desc: "Persiste estado por gateway, eventos y cierres de step." }
    ],
    "ender.mqtt_adapter": [
      { id: "ender.cmp.mqtt.envelope_codec", type: "handler", label: "EnvelopeCodec", tech: "protobuf EnvelopeV1", desc: "Serializa/deserializa envelope y payload OTAP." },
      { id: "ender.cmp.mqtt.crypto_codec", type: "handler", label: "AESGCMCodec", tech: "AES-GCM", desc: "Cifra y descifra payload MQTT usando MQTT_PAYLOAD_KEY." },
      { id: "ender.cmp.mqtt.topic_router", type: "handler", label: "TopicRouter", tech: "MQTT topics", desc: "Publica commands y procesa status por step/gateway." }
    ],
    "mg.otap_core": [
      { id: "mg.cmp.otap.handler", type: "handler", label: "OTAPHandler", tech: "step router", desc: "Gestiona ciclo OTAP y enruta INVENTORY/PROPAGATE/PROCESSING/COLLECT." },
      { id: "mg.cmp.otap.inventory", type: "handler", label: "InventoryStep", tech: "firmware + node scan", desc: "Descarga firmware, inventaría nodos y calcula secuencia máxima." },
      { id: "mg.cmp.otap.propagate", type: "handler", label: "PropagateStep", tech: "scratchpad propagation", desc: "Inicia propagación y reporta progreso parcial de nodos." },
      { id: "mg.cmp.otap.processing", type: "handler", label: "ProcessingStep", tech: "phase transition", desc: "Ejecuta fase de processing con reintentos acotados." },
      { id: "mg.cmp.otap.collect", type: "handler", label: "CollectStep", tech: "final classification", desc: "Clasifica nodos actualizados/no actualizados y cierra campaña." },
      { id: "mg.cmp.otap.downloader", type: "handler", label: "FirmwareDownloader", tech: "system adapter", desc: "Gestiona descarga y validación del firmware de campaña." }
    ],
    "mg.watchdog_subsystem": [
      { id: "mg.cmp.wd.manager", type: "worker", label: "WatchdogManager", tech: "lifecycle manager", desc: "Arranque/parada coordinada de watchdogs de resiliencia." },
      { id: "mg.cmp.wd.container", type: "worker", label: "ContainerWatchdog", tech: "container health", desc: "Supervisa contenedores críticos del gateway." },
      { id: "mg.cmp.wd.timezone", type: "worker", label: "TimezoneWatchdog", tech: "timezone policy", desc: "Calcula zona horaria por coordenadas y la persiste." },
      { id: "mg.cmp.wd.connectivity", type: "worker", label: "ConnectivityWatchdog", tech: "network backoff", desc: "Gestiona política de conectividad y reintento de enlace." },
      { id: "mg.cmp.wd.habaki", type: "worker", label: "HabakiStatusWatchdog", tech: "status snapshot", desc: "Escribe snapshot atómico consumido por Habaki." },
      { id: "mg.cmp.wd.wirepas", type: "worker", label: "WirepasNodesWatchdog", tech: "wirepas_mqtt_library", desc: "Sincroniza estado de nodos Wirepas y máximos diarios." }
    ],
    "mg.command_stack": [
      { id: "mg.cmp.cmd.dispatcher", type: "handler", label: "CommandDispatcher", tech: "application service", desc: "Despacha comandos remotos hacia puertos de infraestructura." },
      { id: "mg.cmp.cmd.legacy", type: "handler", label: "LegacyCloudCommands", tech: "cl-req/gw/*", desc: "Procesa comandos legacy de cloud para gateway." },
      { id: "mg.cmp.cmd.otap", type: "handler", label: "OTAPCommandRouter", tech: "ender/command/otap/*", desc: "Enruta comandos OTAP entrantes hacia OTAP Core." }
    ],
    "mg.infrastructure_adapters": [
      { id: "mg.cmp.iface.system", type: "handler", label: "LinuxSystemAdapter", tech: "systemd/docker/mmcli", desc: "Ejecuta acciones de sistema sobre host Linux." },
      { id: "mg.cmp.iface.mqtt", type: "handler", label: "PahoMQTTAdapter", tech: "MQTT ports", desc: "Abstrae broker cloud/local y contratos de topics." },
      { id: "mg.cmp.iface.wirepas", type: "handler", label: "WirepasAdapter", tech: "wirepas_mqtt_library", desc: "Acceso desacoplado a operaciones de red Wirepas." }
    ],
    "gmk.desktop_app": [
      { id: "gmk.cmp.ui.orchestrator", type: "handler", label: "SerialAutomationApp", tech: "Tkinter", desc: "Orquesta UI, puertos, ejecución de secuencia y estado operativo." },
      { id: "gmk.cmp.serial.runner", type: "handler", label: "SerialSequenceRunner", tech: "PySerial", desc: "Gestiona login shell, prompts, timeouts y secuencia declarativa." },
      { id: "gmk.cmp.print.label", type: "handler", label: "LabelPrinter", tech: "python-docx + pywin32", desc: "Genera e imprime etiquetas físicas con GW_ID y puerto." },
      { id: "gmk.cmp.config.loader", type: "handler", label: "ConfigLoader", tech: "JSON config", desc: "Carga DEFAULT_CONFIG y serial_sequence.json con templates curl." },
      { id: "gmk.cmp.security.enroll", type: "handler", label: "EnrollmentSecurity", tech: "Ed25519 + token_machine", desc: "Firma requests, obtiene credenciales runtime y enrola máquina." },
      { id: "gmk.cmp.update.windows", type: "worker", label: "WindowsUpdater", tech: "PyInstaller + PowerShell", desc: "Valida latest.json, descarga ZIP, verifica sha256 y reemplaza .exe." }
    ],
    "hms.router": [
      { id: "hms.cmp.router.dispatch", type: "handler", label: "Router", tech: "topic registry", desc: "Despacha mensajes MQTT a handlers registrados por topic." },
      { id: "hms.cmp.router.pool", type: "worker", label: "RouterWorkerPool", tech: "concurrency pool", desc: "Gestiona procesamiento concurrente de handlers." }
    ],
    "hms.handlers": [
      { id: "hms.cmp.handler.alarm_set", type: "handler", label: "AlarmSetHandler", tech: "Handle(topic,payload)", desc: "Procesa creación de alarmas y actualiza store temporal." },
      { id: "hms.cmp.handler.alarm_completed", type: "handler", label: "AlarmCompletedHandler", tech: "Handle(topic,payload)", desc: "Confirma y remueve alarmas pendientes del store." },
      { id: "hms.cmp.handler.movement_assignment", type: "handler", label: "MovementAssignmentHandler", tech: "Handle(topic,payload)", desc: "Registra asignaciones de movimiento pendientes." },
      { id: "hms.cmp.handler.movement_completed", type: "handler", label: "MovementCompletedHandler", tech: "Handle(topic,payload)", desc: "Confirma movimientos y limpia pendientes." },
      { id: "hms.cmp.handler.strategy_set", type: "handler", label: "StrategySetHandler", tech: "Handle(topic,payload)", desc: "Registra estrategias activas para reintento/seguimiento." },
      { id: "hms.cmp.handler.strategy_completed", type: "handler", label: "StrategyCompletedHandler", tech: "Handle(topic,payload)", desc: "Confirma estrategia y elimina estado temporal." }
    ],
    "hms.workers": [
      { id: "hms.cmp.worker.alarm_retry", type: "worker", label: "AlarmRetryWorker", tech: "periodic retry", desc: "Reintenta alarmas pendientes periódicamente." },
      { id: "hms.cmp.worker.movement_retry", type: "worker", label: "MovementRetryWorker", tech: "periodic retry", desc: "Reintenta asignaciones de movimiento y maneja fallos." },
      { id: "hms.cmp.worker.strategy_retry", type: "worker", label: "StrategyRetryWorker", tech: "periodic retry", desc: "Reintenta estrategias pendientes y elimina expiradas." }
    ],
    "hms.memory_store": [
      { id: "hms.cmp.store.alarm", type: "handler", label: "MemoryAlarmStore", tech: "in-memory", desc: "Almacena alarmas pendientes para confirmación/reintento." },
      { id: "hms.cmp.store.movement", type: "handler", label: "MemoryMovementStore", tech: "in-memory", desc: "Almacena asignaciones de movimiento pendientes." },
      { id: "hms.cmp.store.strategy", type: "handler", label: "MemoryStrategyStore", tech: "in-memory", desc: "Almacena estrategias activas y expirables." }
    ]
  },

  componentEdges: {
    "c.physical_gateway": [
      { from: "cmp.physical.gateway_service", to: "cmp.physical.telecom_side" },
      { from: "cmp.physical.gateway_service", to: "cmp.physical.logic_side" }
    ],
    "c.mqtt_gateway_manager": [
      { from: "cmp.mqtt.connection_manager", to: "cmp.mqtt.connection" },
      { from: "cmp.mqtt.connection", to: "cmp.mqtt.ingress_adapter" },
      { from: "cmp.mqtt.ingress_adapter", to: "cmp.mqtt.global_channel" },
      { from: "cmp.mqtt.global_channel", to: "cmp.mqtt.dispatcher" },
      { from: "cmp.mqtt.dispatcher", to: "cmp.mqtt.node_worker_manager" },
      { from: "cmp.mqtt.node_worker_manager", to: "cmp.mqtt.node_worker" },
      { from: "cmp.mqtt.node_worker", to: "cmp.mqtt.egress_adapter" }
    ],
    "c.discovery_assoc": [
      { from: "cmp.discovery.association", to: "cmp.discovery.reassociation" }
    ],
    "c.node_resolution": [
      { from: "cmp.resolution.lookup", to: "cmp.resolution.cache_writer" }
    ],
    "c.logic_engine_client": [
      { from: "cmp.grpc.timeout_bridge", to: "cmp.grpc.adapter" },
      { from: "cmp.grpc.adapter", to: "cmp.grpc.action_executor" }
    ],
    "c.backend_connector": [
      { from: "cmp.backend.lookup", to: "cmp.backend.publisher" }
    ],
    "c.logic_engine": [
      { from: "cmp.logic.wirepas_chain", to: "cmp.logic.calculate_consumptions" },
      { from: "cmp.logic.cloud_node_chain", to: "cmp.logic.calculate_consumptions" },
      { from: "cmp.logic.cloud_gateway_chain", to: "cmp.logic.calculate_consumptions" },
      { from: "cmp.logic.keepalive_watchdog", to: "cmp.logic.calculate_consumptions" },
      { from: "cmp.logic.lost_watchdog", to: "cmp.logic.calculate_consumptions" }
    ],
    "hanso.app": [
      { from: "hanso.cmp.auth_session", to: "hanso.cmp.portal_api" },
      { from: "hanso.cmp.portal_api", to: "hanso.cmp.use_cases" },
      { from: "hanso.cmp.use_cases", to: "hanso.cmp.infrastructure_adapters" },
      { from: "hanso.cmp.broker_events_worker", to: "hanso.cmp.infrastructure_adapters" },
      { from: "hanso.cmp.portal_api", to: "hanso.cmp.legacy_provisioning" }
    ],
    "hanso.broker": [
      { from: "hanso.cmp.broker.quic_ws", to: "hanso.cmp.broker.presence_writer" },
      { from: "hanso.cmp.broker.quic_ws", to: "hanso.cmp.broker.events_publisher" },
      { from: "hanso.cmp.broker.http_api", to: "hanso.cmp.broker.relay_worker" },
      { from: "hanso.cmp.broker.relay_worker", to: "hanso.cmp.broker.quic_ws" }
    ],
    "ender.api": [
      { from: "ender.cmp.api.campaign", to: "ender.cmp.api.firmware" },
      { from: "ender.cmp.api.gateway", to: "ender.cmp.api.campaign" },
      { from: "ender.cmp.api.node", to: "ender.cmp.api.campaign" }
    ],
    "ender.core": [
      { from: "ender.cmp.core.gateway_service", to: "ender.cmp.core.campaign_service" },
      { from: "ender.cmp.core.firmware_service", to: "ender.cmp.core.campaign_service" },
      { from: "ender.cmp.core.node_service", to: "ender.cmp.core.campaign_service" }
    ],
    "ender.scheduler": [
      { from: "ender.cmp.scheduler.tick", to: "ender.cmp.scheduler.producer" }
    ],
    "ender.worker": [
      { from: "ender.cmp.worker.consumer", to: "ender.cmp.worker.step_executor" },
      { from: "ender.cmp.worker.step_executor", to: "ender.cmp.worker.state_writer" }
    ],
    "ender.mqtt_adapter": [
      { from: "ender.cmp.mqtt.envelope_codec", to: "ender.cmp.mqtt.crypto_codec" },
      { from: "ender.cmp.mqtt.crypto_codec", to: "ender.cmp.mqtt.topic_router" }
    ],
    "mg.otap_core": [
      { from: "mg.cmp.otap.handler", to: "mg.cmp.otap.inventory" },
      { from: "mg.cmp.otap.inventory", to: "mg.cmp.otap.propagate" },
      { from: "mg.cmp.otap.propagate", to: "mg.cmp.otap.processing" },
      { from: "mg.cmp.otap.processing", to: "mg.cmp.otap.collect" },
      { from: "mg.cmp.otap.inventory", to: "mg.cmp.otap.downloader" }
    ],
    "mg.watchdog_subsystem": [
      { from: "mg.cmp.wd.manager", to: "mg.cmp.wd.container" },
      { from: "mg.cmp.wd.manager", to: "mg.cmp.wd.timezone" },
      { from: "mg.cmp.wd.manager", to: "mg.cmp.wd.connectivity" },
      { from: "mg.cmp.wd.manager", to: "mg.cmp.wd.habaki" },
      { from: "mg.cmp.wd.manager", to: "mg.cmp.wd.wirepas" }
    ],
    "mg.command_stack": [
      { from: "mg.cmp.cmd.legacy", to: "mg.cmp.cmd.dispatcher" },
      { from: "mg.cmp.cmd.otap", to: "mg.cmp.cmd.dispatcher" }
    ],
    "gmk.desktop_app": [
      { from: "gmk.cmp.config.loader", to: "gmk.cmp.ui.orchestrator" },
      { from: "gmk.cmp.ui.orchestrator", to: "gmk.cmp.serial.runner" },
      { from: "gmk.cmp.ui.orchestrator", to: "gmk.cmp.security.enroll" },
      { from: "gmk.cmp.ui.orchestrator", to: "gmk.cmp.print.label" },
      { from: "gmk.cmp.ui.orchestrator", to: "gmk.cmp.update.windows" }
    ],
    "hms.router": [
      { from: "hms.cmp.router.dispatch", to: "hms.cmp.router.pool" }
    ],
    "hms.handlers": [
      { from: "hms.cmp.handler.alarm_set", to: "hms.cmp.handler.alarm_completed" },
      { from: "hms.cmp.handler.movement_assignment", to: "hms.cmp.handler.movement_completed" },
      { from: "hms.cmp.handler.strategy_set", to: "hms.cmp.handler.strategy_completed" }
    ],
    "hms.workers": [
      { from: "hms.cmp.worker.alarm_retry", to: "hms.cmp.worker.movement_retry" },
      { from: "hms.cmp.worker.movement_retry", to: "hms.cmp.worker.strategy_retry" }
    ]
  },

  endpoints: {
    "c.mqtt_gateway_manager": [
      { method: "MQTT", path: "gw-req/gw/{GW_ID}", desc: "nuevo nodo / posicionamiento hacia cloud" },
      { method: "MQTT", path: "gw-req/n/{node_id}", desc: "status, movimiento y coeficientes" },
      { method: "MQTT", path: "gw-res/n/{node_id}", desc: "confirmaciones, estrategias y passthrough" },
      { method: "MQTT", path: "alarm/n/{node_id}", desc: "alarmas hacia cloud" },
      { method: "MQTT", path: "cl-req/n/{node_id}", desc: "comandos backend → nodo" },
      { method: "MQTT", path: "cl-res/n/{node_id}", desc: "respuestas backend → nodo" },
      { method: "MQTT", path: "cl-req/gw/{GW_ID}", desc: "comandos backend → gateway" },
      { method: "MQTT", path: "cl-res/gw/{GW_ID}", desc: "respuestas backend → gateway" }
    ],
    "c.logic_engine": [
      { method: "RPC", path: "HandleEvent(LogicRequest)", desc: "contrato canónico request/response" },
      { method: "RPC", path: "HandleWirepasUplink(WirepasUplink)", desc: "RPC legacy de transición" },
      { method: "RPC", path: "HandleCloudNodeMessage(CloudMessage)", desc: "RPC legacy de transición" },
      { method: "RPC", path: "HandleCloudGatewayMessage(CloudMessage)", desc: "RPC legacy de transición" }
    ],
    "hanso.app": [
      { method: "GET", path: "/gateways", desc: "portal de inventario y operación de gateways" },
      { method: "POST", path: "/gateways/software-updates/start", desc: "inicia update single gateway" },
      { method: "POST", path: "/gateways/software-updates/batch-start", desc: "inicia update batch gateways" },
      { method: "GET", path: "/gateways/software-updates/stream/<job_id>", desc: "SSE de logs de job" },
      { method: "POST", path: "/provision", desc: "provisioning legacy con ansible-playbook" }
    ],
    "hanso.broker": [
      { method: "QUIC", path: "UDP :4433", desc: "auth, ping/pong, metrics y disconnect desde Habaki" },
      { method: "WS", path: "TCP :443 legacy", desc: "ruta de compatibilidad para gateways legacy" },
      { method: "GET", path: "/health", desc: "estado del broker y gateways conectados" },
      { method: "GET", path: "/api/gateways/online", desc: "lista de gateways online para debugging/admin" },
      { method: "GET", path: "/api/gateways/{gw_id}/status", desc: "estado de un gateway conectado" },
      { method: "POST", path: "/api/gateways/{gw_id}/exec", desc: "relay de comando exec hacia gateway" },
      { method: "POST", path: "/api/gateways/{gw_id}/terminal/open", desc: "abre sesión de terminal" },
      { method: "WS", path: "/terminal/{session_id}", desc: "tráfico stdin/stdout browser ↔ broker ↔ Habaki" }
    ],
    "ender.api": [
      { method: "POST", path: "/campaigns", desc: "crea campaña OTAP (organization + server + firmware)" },
      { method: "GET", path: "/campaigns/{campaign_id}", desc: "consulta estado global y por step" },
      { method: "GET", path: "/nodes", desc: "consulta nodos y metadatos" },
      { method: "GET", path: "/gateways", desc: "lista gateways por organización y server remoto" },
      { method: "POST", path: "/firmwares", desc: "sube firmware y metadata" }
    ],
    "ender.mqtt_adapter": [
      { method: "MQTT", path: "ender/command/otap/{step}/{gateway_id}", desc: "command topics Ender → Gateway" },
      { method: "MQTT", path: "ender/status/otap/{step}/{gateway_id}", desc: "status topics Gateway → Ender" },
      { method: "MQTT", path: "ender/command/otap/inventory/{gateway_id}", desc: "inventory step command" },
      { method: "MQTT", path: "ender/status/otap/inventory/{gateway_id}", desc: "inventory step response" }
    ],
    "ender.nats": [
      { method: "NATS", path: "ender.otap.job.v1.propagate", desc: "jobs persistentes de propagate" },
      { method: "NATS", path: "ender.otap.job.v1.processing", desc: "jobs persistentes de processing" },
      { method: "NATS", path: "ender.otap.job.v1.collect", desc: "jobs persistentes de collect" }
    ],
    "mg.cloud_mqtt_runtime": [
      { method: "MQTT", path: "cl-req/gw/{gw_id}", desc: "consume comandos legacy para gateway" },
      { method: "MQTT", path: "cl-req/gw/gateway_data", desc: "consume comandos de operación y estado" },
      { method: "MQTT", path: "cl-res/gw/gateway_data", desc: "publica respuestas legacy de gateway" },
      { method: "MQTT", path: "ender/command/otap/{step}/{gateway_id}", desc: "consume comandos OTAP de Ender" },
      { method: "MQTT", path: "ender/status/otap/{step}/{gateway_id}", desc: "publica estado OTAP al orquestador" }
    ],
    "mg.local_command_service": [
      { method: "MQTT", path: "gateway/command/wirepas/{gw_id}", desc: "consume comandos Wirepas locales" },
      { method: "MQTT", path: "gateway/response/wirepas/{gw_id}", desc: "publica ACK/resultado local" }
    ],
    "mg.watchdog_subsystem": [
      { method: "FILE", path: "/tmp/metal-gear-status.json", desc: "snapshot atómico de estado para Habaki" }
    ],
    "gmk.desktop_app": [
      { method: "SERIAL", path: "auto-detect serial port", desc: "detección de puerto y validación de gateway" },
      { method: "SERIAL", path: "login shell + steps from serial_sequence.json", desc: "ejecución declarativa de secuencia serial" },
      { method: "HTTP", path: "remote init endpoint", desc: "obtiene script autorun.sh por destino" },
      { method: "HTTP", path: "remote credentials endpoint", desc: "obtiene username/default_password/new_password" },
      { method: "HTTP", path: "remote enroll endpoint", desc: "enrola máquina con enroll_code" },
      { method: "HTTP", path: "latest.json", desc: "consulta versión y modo de instalación" },
      { method: "PRINT", path: "Word COM print", desc: "imprime etiquetas docx en Windows" }
    ],
    "hms.mqtt_client": [
      { method: "MQTT", path: "topics de alarmas", desc: "consume/publica eventos de alarmas" },
      { method: "MQTT", path: "topics de movement", desc: "consume/publica asignaciones y completados" },
      { method: "MQTT", path: "topics de strategies", desc: "consume/publica estrategias y confirmaciones" }
    ],
    "hms.metrics": [
      { method: "HTTP", path: "/metrics", desc: "exposición de métricas Prometheus" }
    ]
  },

  schemas: {
    "c.logic_cache": [
      { table: "node:status:{id}", cols: ["led_status", "dimming", "timestamp"] },
      { table: "node:rgb_status:{id}", cols: ["led_status", "red", "green", "blue", "timestamp"] },
      { table: "node:last_seen:{id}", cols: ["epoch"] },
      { table: "node:strategy:{id}", cols: ["status", "strategy_id"] },
      { table: "node:kit:{id}", cols: ["status", "kit_id"] },
      { table: "node:alarm:{node_id}:{alarm_id}", cols: ["alarm_id", "alarm_status"] },
      { table: "node:consumption:dali_consumptions:{id}", cols: ["values[]"] },
      { table: "node:consumption:solar_consumptions:{id}", cols: ["values[]"] }
    ],
    "c.nodes_db": [
      { table: "node_discovery", cols: ["id", "node_type", "created_at"] },
      { table: "lost_nodes", cols: ["id", "death_node", "created_at"] },
      { table: "lumos_maxima", cols: ["id", "max_apparent_power", "dimming", "updated_at"] },
      { table: "movement_sensor", cols: ["node_id", "status", "updated_at"] },
      { table: "node_neighbors", cols: ["id", "node_id", "message_id", "next_hop_id", "number_nbors", "neighbors_json", "updated_at"] }
    ],
    "c.status_db": [
      { table: "led_status_dimming", cols: ["node_id", "led_status", "dimming"] },
      { table: "rgb_status", cols: ["node_id", "led_status", "red", "green", "blue"] },
      { table: "last_seen", cols: ["node_id", "last_seen_time"] }
    ],
    "c.strategy_db": [
      { table: "strategy_status", cols: ["node_id", "strategy_id", "status", "created_at"] },
      { table: "kit_status", cols: ["node_id", "kit_id", "status", "created_at"] }
    ],
    "c.alarms_db": [
      { table: "alarm_status", cols: ["id", "node_id", "alarm_id", "alarm_status", "created_at"] },
      { table: "alarm_list_integers", cols: ["node_id", "alarm_integers"] }
    ],
    "c.consumptions_db": [
      { table: "dali_consumptions", cols: ["id", "node_id", "time", "apparent_power", "current_cc_pcb", "power_factor", "temperature_driver", "voltage_cc_pcb", "voltage_net_ca"] },
      { table: "allegro_consumptions", cols: ["id", "node_id", "time", "voltage_net_ca", "power_factor", "apparent_power", "current_net_ca"] },
      { table: "dali_allegro_consumptions", cols: ["id", "node_id", "time", "voltage_net_ca", "power_factor_net_ca", "apparent_power", "current_net_ca", "voltage_pcb_cc", "current_pcb_cc", "temperature_driver"] },
      { table: "solar_consumptions", cols: ["id", "node_id", "time", "SOC", "battery_voltage", "battery_current", "driver_state", "luminaire_power", "charge_power"] },
      { table: "coef_consumptions", cols: ["id", "node_id", "coef_type", "data", "time"] },
      { table: "alpha_consumptions", cols: ["id", "node_id", "time", "alpha_previous", "alpha_current", "sunset_voltage_previous", "sunset_voltage_current", "sunrise_voltage_previous", "sunrise_voltage_current", "charge_today", "consumption_today"] },
      { table: "dali_voltage_current_cc_flag", cols: ["id", "node_id", "consumption_saved", "time"] },
      { table: "dali_temperature_voltage_ca_flag", cols: ["id", "node_id", "consumption_saved", "time"] },
      { table: "dali_power_factor_apparent_power_flag", cols: ["id", "node_id", "consumption_saved", "time"] },
      { table: "apparent_power_lost", cols: ["id", "node_id", "time", "apparent_power"] }
    ],
    "hanso.postgres": [
      { table: "gateways", cols: ["gw_id", "cluster", "organization", "service", "versions", "coordinates", "status"] },
      { table: "gateway_metrics", cols: ["gw_id", "ts", "disk_usage_pct", "ram_usage_pct", "load_1m", "modem_signal_dbm", "wirepas_nodes"] },
      { table: "metal_gear_versions", cols: ["version", "artifact"] },
      { table: "gateway_maker_versions", cols: ["version", "platform", "artifact"] },
      { table: "gateway_maker_credentials", cols: ["machine", "credential"] },
      { table: "gateway_maker_enroll_codes", cols: ["code", "status"] },
      { table: "gateway_maker_machines", cols: ["machine", "status"] }
    ],
    "hanso.sqlite": [
      { table: "gateway_ports", cols: ["gw_id", "port", "source"] },
      { table: "gateway_configs", cols: ["gw_id", "env_values", "updated_at"] },
      { table: "gateway_connection_states", cols: ["gw_id", "state", "updated_at"] },
      { table: "gateway_monitoring_settings", cols: ["gw_id", "settings"] },
      { table: "gateway_sql_query_templates", cols: ["name", "query"] }
    ],
    "hanso.redis": [
      { table: "gateway:presence:{gw_id}", cols: ["ttl", "iso8601_timestamp"] },
      { table: "gateway:online", cols: ["gw_id"] },
      { table: "gateway:events", cols: ["event", "gw_id", "ts", "data"] }
    ],
    "hanso.users_config": [
      { table: "users.yml", cols: ["username", "password_hash", "role", "allowed_sources"] }
    ],
    "ender.postgres": [
      { table: "campaigns", cols: ["id", "name", "organization", "server_id", "status", "current_step", "step_started_at", "step_timeout_at", "started_at", "finished_at", "retry_of", "firmware_id"] },
      { table: "campaign_gateways", cols: ["campaign_id", "gateway_id", "step", "status", "error", "updated_at"] },
      { table: "campaign_steps", cols: ["campaign_id", "step", "status", "started_at", "timeout_at", "finished_at"] },
      { table: "firmwares", cols: ["id", "label", "version", "url", "checksum", "size_bytes", "created_at"] },
      { table: "events", cols: ["id", "campaign_id", "gateway_id", "event_type", "payload_json", "received_at"] }
    ],
    "gmk.local_config": [
      { table: "serial_sequence.json", cols: ["baudrate", "read_timeout", "shell_prompt", "steps[]", "curl_templates"] },
      { table: "config/local", cols: ["token_machine", "device_private_key", "destination", "cluster"] }
    ],
    "gmk.windows_secrets": [
      { table: "CredentialManager", cols: ["machine_id", "token_machine", "ed25519_private_key"] }
    ],
    "hms.memory_store": [
      { table: "alarms_pending", cols: ["node_id", "payload", "status", "retry_count", "last_attempt"] },
      { table: "movements_pending", cols: ["node_id", "payload", "status", "retry_count", "last_attempt"] },
      { table: "strategies_pending", cols: ["node_id", "payload", "status", "retry_count", "last_attempt"] }
    ]
  },

  flows: [
    {
      id: "flow.gateway_cloud.discovery",
      name: "Descubrimiento y asociación de nodo",
      type: "technical",
      criticality: "critical",
      description: "Un mini gateway ve un nodo, Gateway-Cloud lo asocia, resuelve su servidor MQTT y delega el evento al Logic Engine.",
      sync: false,
      idempotent: true,
      traceable: true,
      retry: "none",
      timeout: 10000,
      expectedLatency: 800,
      ordering: "per-device",
      steps: [
        { from: "c.mini_gateway", to: "c.mqtt_gateway_manager", protocol: "mqtt", label: "uplink MQTT" },
        { from: "c.mqtt_gateway_manager", to: "c.discovery_assoc", protocol: "runtime", label: "evento normalizado" },
        { from: "c.discovery_assoc", to: "c.telecom_cache", protocol: "redis", label: "guarda nodo-gateway" },
        { from: "c.discovery_assoc", to: "c.node_resolution", protocol: "runtime", label: "resolve si falta" },
        { from: "c.node_resolution", to: "c.backend_connector", protocol: "http", label: "lookup secuencial" },
        { from: "c.node_resolution", to: "c.telecom_cache", protocol: "redis", label: "cache nodo-servidor" },
        { from: "c.discovery_assoc", to: "c.logic_engine_client", protocol: "runtime", label: "evento enriquecido" },
        { from: "c.logic_engine_client", to: "c.logic_engine", protocol: "grpc", label: "HandleEvent" }
      ],
      owners: ["team.gateway_cloud"],
      projects: ["gateway-cloud"],
      adrs: ["ADR-002", "ADR-010", "ADR-011", "ADR-012", "ADR-014", "ADR-015", "ADR-034"],
      triggers: ["mini gateway publishes node sighting"],
      risks: ["Resolución backend incompleta", "cache de servidor obsoleta"],
      gaps: "La documentación no fija latencia objetivo; se deja p95 inicial de referencia."
    },
    {
      id: "flow.gateway_cloud.downlink_command",
      name: "Comando backend hacia nodo",
      type: "technical",
      criticality: "critical",
      description: "Un comando llega por el broker MQTT destino, pasa por Logic Engine y se enruta al mini gateway que ve el nodo.",
      sync: false,
      idempotent: false,
      traceable: true,
      retry: "linear",
      timeout: 15000,
      expectedLatency: 1200,
      ordering: "per-device",
      steps: [
        { from: "c.dest_broker", to: "c.mqtt_gateway_manager", protocol: "mqtt", label: "downlink backend" },
        { from: "c.mqtt_gateway_manager", to: "c.logic_engine_client", protocol: "runtime", label: "BACKEND_COMMAND" },
        { from: "c.logic_engine_client", to: "c.logic_engine", protocol: "grpc", label: "HandleEvent" },
        { from: "c.logic_engine_client", to: "c.mqtt_gateway_manager", protocol: "runtime", label: "SEND_TO_NODE" },
        { from: "c.mqtt_gateway_manager", to: "c.mini_gateway", protocol: "mqtt", label: "MQTT downlink" }
      ],
      owners: ["team.gateway_cloud"],
      projects: ["gateway-cloud"],
      adrs: ["ADR-003", "ADR-004", "ADR-016", "ADR-017", "ADR-020", "ADR-034"],
      triggers: ["backend publishes command"],
      risks: ["Comando no idempotente", "mini gateway desconectado"],
      gaps: "No hay SLA cerrado para comandos downlink en la doc actual."
    },
    {
      id: "flow.ender.otap_campaign",
      name: "Campaña OTAP Ender a gateway",
      type: "business",
      criticality: "high",
      description: "Un operador crea una campaña OTAP, Ender genera jobs persistentes y Metal Gear ejecuta los steps sobre la red Wirepas.",
      sync: false,
      idempotent: true,
      traceable: true,
      retry: "exponential",
      timeout: 600000,
      expectedLatency: 0,
      ordering: "strict",
      steps: [
        { from: "ender.frontend", to: "ender.api", protocol: "http", label: "crear campaña" },
        { from: "ender.api", to: "ender.core", protocol: "http", label: "orquestar lifecycle" },
        { from: "ender.core", to: "ender.scheduler", protocol: "runtime", label: "scheduled campaigns" },
        { from: "ender.scheduler", to: "ender.nats", protocol: "nats", label: "create OTAP jobs" },
        { from: "ender.nats", to: "ender.worker", protocol: "nats", label: "deliver job" },
        { from: "ender.worker", to: "ender.mqtt_adapter", protocol: "mqtt", label: "publish command" },
        { from: "ender.mqtt_adapter", to: "c.dest_broker", protocol: "mqtt", label: "encrypted envelope" },
        { from: "c.dest_broker", to: "mg.cloud_mqtt_runtime", protocol: "mqtt", label: "consume OTAP" },
        { from: "mg.cloud_mqtt_runtime", to: "mg.otap_core", protocol: "mqtt", label: "step command" },
        { from: "mg.otap_core", to: "mg.wirepas_mesh", protocol: "wirepas", label: "inventory/propagate" }
      ],
      owners: ["team.ender", "team.metal_gear", "team.gateway_cloud"],
      projects: ["ender", "metal-gear", "gateway-cloud"],
      adrs: ["ENDER-ADR-03", "ENDER-ADR-05", "MG-ADR-0002", "MG-ADR-0003"],
      triggers: ["operator starts OTAP campaign"],
      risks: ["Jobs duplicados", "timeouts por gateway", "estado parcial de campaña"],
      gaps: "La latencia depende de fases OTAP y tamaño de red; no se fija expectedLatency."
    },
    {
      id: "flow.hanso.gateway_update",
      name: "Actualización remota de gateway",
      type: "business",
      criticality: "high",
      description: "Hansō prepara artefactos/versiones y ordena una actualización remota al gateway conectado por broker.",
      sync: false,
      idempotent: true,
      traceable: true,
      retry: "linear",
      timeout: 300000,
      expectedLatency: 0,
      ordering: "per-device",
      steps: [
        { from: "hanso.app", to: "hanso.minio", protocol: "http", label: "artifact URL" },
        { from: "hanso.app", to: "hanso.docker_hub", protocol: "http", label: "gateway_service tag" },
        { from: "hanso.app", to: "hanso.broker", protocol: "http", label: "update command" },
        { from: "hanso.broker", to: "c.physical_gateway", protocol: "quic", label: "relay command" },
        { from: "c.physical_gateway", to: "hanso.broker", protocol: "quic", label: "logs/metrics" },
        { from: "hanso.broker", to: "hanso.redis", protocol: "redis", label: "gateway events" },
        { from: "hanso.app", to: "hanso.redis", protocol: "redis", label: "consume status" }
      ],
      owners: ["team.hanso"],
      projects: ["hanso", "gateway-cloud"],
      adrs: ["HANSO-ADR-002", "HANSO-ADR-006", "HANSO-ADR-007"],
      triggers: ["operator starts software update"],
      risks: ["Gateway offline", "artefacto no disponible", "rollback no documentado"],
      gaps: "La doc no detalla un rollback end-to-end; queda como riesgo operativo."
    },
    {
      id: "flow.gateway_maker.provisioning",
      name: "Aprovisionamiento de gateway físico",
      type: "business",
      criticality: "medium",
      description: "Gateway Maker automatiza preparación local por serie, credenciales remotas, enrolado y etiquetado físico.",
      sync: true,
      idempotent: false,
      traceable: true,
      retry: "none",
      timeout: 180000,
      expectedLatency: 0,
      ordering: "strict",
      steps: [
        { from: "gmk.desktop_app", to: "gmk.local_config", protocol: "file", label: "load sequence" },
        { from: "gmk.desktop_app", to: "gmk.windows_secrets", protocol: "os", label: "machine secrets" },
        { from: "gmk.desktop_app", to: "gmk.gateway_device", protocol: "serial", label: "serial shell" },
        { from: "gmk.desktop_app", to: "gmk.remote_init_api", protocol: "http", label: "download init" },
        { from: "gmk.remote_init_api", to: "hanso.app", protocol: "http", label: "remote script" },
        { from: "gmk.desktop_app", to: "gmk.remote_creds_api", protocol: "http", label: "runtime creds" },
        { from: "gmk.remote_creds_api", to: "hanso.app", protocol: "http", label: "credential API" },
        { from: "gmk.desktop_app", to: "c.physical_gateway", protocol: "serial", label: "provision gateway" },
        { from: "gmk.desktop_app", to: "gmk.word_printer", protocol: "print", label: "label GW_ID" }
      ],
      owners: ["team.gateway_maker", "team.hanso"],
      projects: ["gateway-maker", "hanso", "gateway-cloud"],
      adrs: ["GMK-ADR-0001", "GMK-ADR-0002", "GMK-ADR-0003", "GMK-ADR-0004"],
      triggers: ["operator starts gateway preparation"],
      risks: ["Secuencia serie no idempotente", "credenciales locales sensibles"],
      gaps: "El flujo mezcla acciones locales y remotas; no hay transacción única de rollback."
    },
    {
      id: "flow.hermes.event_retry",
      name: "Evento Hermes con reintento",
      type: "technical",
      criticality: "medium",
      description: "Hermes consume eventos MQTT, despacha handlers, guarda estado temporal y reintenta respuestas pendientes.",
      sync: false,
      idempotent: true,
      traceable: true,
      retry: "linear",
      timeout: 30000,
      expectedLatency: 1000,
      ordering: "none",
      steps: [
        { from: "c.dest_broker", to: "hms.mqtt_client", protocol: "mqtt", label: "evento IoT" },
        { from: "hms.mqtt_client", to: "hms.router", protocol: "mqtt", label: "message ingress" },
        { from: "hms.router", to: "hms.handlers", protocol: "runtime", label: "topic dispatch" },
        { from: "hms.handlers", to: "hms.memory_store", protocol: "runtime", label: "pending state" },
        { from: "hms.handlers", to: "hms.workers", protocol: "runtime", label: "notify retry" },
        { from: "hms.workers", to: "hms.memory_store", protocol: "runtime", label: "scan pending" },
        { from: "hms.workers", to: "hms.mqtt_client", protocol: "mqtt", label: "retry publish" },
        { from: "hms.mqtt_client", to: "c.dest_broker", protocol: "mqtt", label: "response" }
      ],
      owners: ["team.hermes"],
      projects: ["hermes", "gateway-cloud"],
      adrs: ["HMS-ADR-001", "HMS-ADR-002", "HMS-ADR-003", "HMS-ADR-004"],
      triggers: ["MQTT IoT event received"],
      risks: ["Estado en memoria no durable", "duplicidad por reintento"],
      gaps: "La documentación no especifica claves de idempotencia para todos los eventos."
    },
    {
      id: "flow.metal_gear.watchdog_telemetry",
      name: "Telemetría operativa Metal Gear hacia Hansō",
      type: "technical",
      criticality: "low",
      description: "Watchdogs de Metal Gear producen estado local, Habaki lo publica y Hansō lo consume como presencia/métricas.",
      sync: false,
      idempotent: true,
      traceable: true,
      retry: "linear",
      timeout: 30000,
      expectedLatency: 2000,
      ordering: "none",
      steps: [
        { from: "mg.watchdog_subsystem", to: "mg.infrastructure_adapters", protocol: "os", label: "health checks" },
        { from: "mg.watchdog_subsystem", to: "mg.habaki_agent", protocol: "file", label: "status snapshot" },
        { from: "mg.habaki_agent", to: "hanso.broker", protocol: "quic", label: "gateway metrics" },
        { from: "hanso.broker", to: "hanso.redis", protocol: "redis", label: "presence/events" },
        { from: "hanso.app", to: "hanso.redis", protocol: "redis", label: "read presence" },
        { from: "hanso.app", to: "hanso.postgres", protocol: "sql", label: "persist metrics" }
      ],
      owners: ["team.metal_gear", "team.hanso"],
      projects: ["metal-gear", "hanso"],
      adrs: ["MG-ADR-0004", "MG-ADR-0005", "HANSO-ADR-002", "HANSO-ADR-006"],
      triggers: ["watchdog status tick"],
      risks: ["Snapshot local stale", "gateway desconectado"],
      gaps: "La cadencia exacta de publicación Habaki no está consolidada en el blueprint."
    }
  ],

  adrCatalog: {
    "ENDER-ADR-01": { label: "ENDER-ADR-01", title: "Elección de Go como lenguaje backend", status: "Accepted", date: "unknown" },
    "ENDER-ADR-02": { label: "ENDER-ADR-02", title: "Elección de Postgres como base de datos", status: "Accepted", date: "unknown" },
    "ENDER-ADR-03": { label: "ENDER-ADR-03", title: "Elección de NATS JetStream como sistema de colas", status: "Accepted", date: "unknown" },
    "ENDER-ADR-04": { label: "ENDER-ADR-04", title: "Elección de MinIO como almacenamiento de firmware OTAP", status: "Accepted", date: "unknown" },
    "ENDER-ADR-05": { label: "ENDER-ADR-05", title: "Serialización y cifrado MQTT (protobuf + AES-GCM)", status: "Accepted", date: "unknown" },
    "HANSO-ADR-001": { label: "HANSO-ADR-001", title: "Adopt Hexagonal Architecture (Ports & Adapters)", status: "Accepted", date: "2026-02-16" },
    "HANSO-ADR-002": { label: "HANSO-ADR-002", title: "Reverse Gateway Connectivity via WebSocket / QUIC", status: "Accepted", date: "2026-02-16" },
    "HANSO-ADR-003": { label: "HANSO-ADR-003", title: "Move Provisioning Away From Ansible-Over-SSH", status: "Accepted", date: "2026-02-16" },
    "HANSO-ADR-004": { label: "HANSO-ADR-004", title: "Migrate from SHA-256 to bcrypt for Password Hashing", status: "Accepted", date: "2026-02-16" },
    "HANSO-ADR-005": { label: "HANSO-ADR-005", title: "Hybrid Template Versioning (Git + Database)", status: "Accepted", date: "2026-02-16" },
    "HANSO-ADR-006": { label: "HANSO-ADR-006", title: "Go Broker para Gestión de Conexiones Persistentes de Gateway", status: "Accepted", date: "2026-02-26" },
    "HANSO-ADR-007": { label: "HANSO-ADR-007", title: "Remote Software Updates and Command Plans", status: "Accepted", date: "2026-04-30" },
    "MG-ADR-0001": { label: "MG-ADR-0001", title: "Arquitectura por capas con migración incremental desde runtime legacy", status: "Accepted", date: "2026-04-30" },
    "MG-ADR-0002": { label: "MG-ADR-0002", title: "Contratos MQTT separados por dominio (legacy, OTAP Ender y comandos locales)", status: "Accepted", date: "2026-04-30" },
    "MG-ADR-0003": { label: "MG-ADR-0003", title: "OTAP Ender modelado como máquina de campaña con estado compartido y cleanup", status: "Accepted", date: "2026-04-30" },
    "MG-ADR-0004": { label: "MG-ADR-0004", title: "Watchdogs como subsistema de resiliencia y telemetría operativa", status: "Accepted", date: "2026-04-30" },
    "MG-ADR-0005": { label: "MG-ADR-0005", title: "Adaptadores de infraestructura como frontera de integración con sistemas externos", status: "Accepted", date: "2026-04-30" },
    "GMK-ADR-0001": { label: "GMK-ADR-0001", title: "Aplicación de escritorio monolítica en Python/Tkinter", status: "Accepted", date: "2026-04-30" },
    "GMK-ADR-0002": { label: "GMK-ADR-0002", title: "Credenciales runtime remotas y firma de máquina", status: "Accepted", date: "2026-04-30" },
    "GMK-ADR-0003": { label: "GMK-ADR-0003", title: "Secuencia serie declarativa en JSON", status: "Accepted", date: "2026-04-30" },
    "GMK-ADR-0004": { label: "GMK-ADR-0004", title: "Empaquetado Windows con PyInstaller y actualización obligatoria", status: "Accepted", date: "2026-04-30" },
    "HMS-ADR-001": { label: "HMS-ADR-001", title: "Uso de almacenamiento en memoria para entidades temporales", status: "Accepted", date: "2026-04-30" },
    "HMS-ADR-002": { label: "HMS-ADR-002", title: "Uso de MQTT como bus de eventos principal", status: "Accepted", date: "2026-04-30" },
    "HMS-ADR-003": { label: "HMS-ADR-003", title: "Separación de Handlers y Workers para procesamiento y reintentos", status: "Accepted", date: "2026-04-30" },
    "HMS-ADR-004": { label: "HMS-ADR-004", title: "Uso de un Router centralizado para el despacho de mensajes", status: "Accepted", date: "2026-04-30" },
    "HMS-ADR-005": { label: "HMS-ADR-005", title: "Exposición de métricas Prometheus vía HTTP", status: "Accepted", date: "2026-04-30" }
  }
};

window.BLUEPRINT = BLUEPRINT;
