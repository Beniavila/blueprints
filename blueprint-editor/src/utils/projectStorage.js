import { initialEdges, initialNodes } from "../data/initialData";
import { BLUEPRINT_PROJECTS_STORAGE_KEY, DEFAULT_PROJECT_ID } from "../constants/storage";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createDefaultProject() {
  return {
    id: DEFAULT_PROJECT_ID,
    name: "Proyecto principal",
    folders: [],
    files: [],
    blueprint: {
      nodes: initialNodes,
      edges: initialEdges,
      selectedId: "traffic",
      selectedIds: ["traffic"],
      connectMode: false,
      connectSource: null,
      viewport: {
        scale: 0.55,
        pos: { x: -80, y: -40 }
      }
    }
  };
}

function createDefaultStore() {
  const defaultProject = createDefaultProject();

  return {
    activeProjectId: DEFAULT_PROJECT_ID,
    projects: {
      [DEFAULT_PROJECT_ID]: defaultProject
    }
  };
}

function normalizeStore(rawStore) {
  const fallback = createDefaultStore();
  if (!rawStore || typeof rawStore !== "object") {
    return fallback;
  }

  const activeProjectId = rawStore.activeProjectId || DEFAULT_PROJECT_ID;
  const projects = { ...fallback.projects, ...(rawStore.projects || {}) };
  const activeProject = projects[activeProjectId] || fallback.projects[DEFAULT_PROJECT_ID];

  return {
    activeProjectId,
    projects: {
      ...projects,
      [activeProjectId]: {
        ...createDefaultProject(),
        ...activeProject,
        blueprint: {
          ...createDefaultProject().blueprint,
          ...(activeProject.blueprint || {}),
          viewport: {
            ...createDefaultProject().blueprint.viewport,
            ...(activeProject.blueprint?.viewport || {})
          }
        }
      }
    }
  };
}

export function loadProjectStore() {
  if (!canUseStorage()) {
    return createDefaultStore();
  }

  try {
    const rawValue = window.localStorage.getItem(BLUEPRINT_PROJECTS_STORAGE_KEY);
    if (!rawValue) {
      return createDefaultStore();
    }

    return normalizeStore(JSON.parse(rawValue));
  } catch {
    return createDefaultStore();
  }
}

export function saveProjectStore(store) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    BLUEPRINT_PROJECTS_STORAGE_KEY,
    JSON.stringify(normalizeStore(store))
  );
}

export function loadActiveProjectBlueprint() {
  const store = loadProjectStore();
  const project = store.projects[store.activeProjectId] || createDefaultProject();
  return {
    projectId: project.id,
    projectName: project.name,
    nodes: project.blueprint.nodes,
    edges: project.blueprint.edges,
    selectedId: project.blueprint.selectedId,
    selectedIds: project.blueprint.selectedIds,
    connectMode: project.blueprint.connectMode,
    connectSource: project.blueprint.connectSource,
    viewport: project.blueprint.viewport,
    folders: project.folders,
    files: project.files
  };
}

export function saveActiveProjectBlueprint(blueprintPatch) {
  const store = loadProjectStore();
  const activeProjectId = store.activeProjectId || DEFAULT_PROJECT_ID;
  const currentProject = store.projects[activeProjectId] || createDefaultProject();

  const nextStore = {
    ...store,
    activeProjectId,
    projects: {
      ...store.projects,
      [activeProjectId]: {
        ...currentProject,
        blueprint: {
          ...currentProject.blueprint,
          ...blueprintPatch,
          viewport: {
            ...currentProject.blueprint.viewport,
            ...(blueprintPatch.viewport || {})
          }
        }
      }
    }
  };

  saveProjectStore(nextStore);
}
