import { DEFAULT_RADIAL_MENU_SETTINGS } from '../types';

type RadialMenuModifierKey = 'ctrl' | 'alt' | 'shift';

interface ShortcutItem {
  id: string;
  name: string;
  url: string;
  icon: string;
  order: number;
}

interface RadialMenuSettings {
  enabled: boolean;
  modifierKey: RadialMenuModifierKey;
  scale: number;
  shortcuts: ShortcutItem[];
}

const STORAGE_KEY = 'newtab-radial-menu';
const SVG_NS = 'http://www.w3.org/2000/svg';

const defaultSettings: RadialMenuSettings = {
  ...DEFAULT_RADIAL_MENU_SETTINGS,
  shortcuts: [...DEFAULT_RADIAL_MENU_SETTINGS.shortcuts]
};

let radialSettings: RadialMenuSettings = { ...defaultSettings };


const BASE_OUTER_RADIUS = 190;
const BASE_INNER_RADIUS = 92;
const BASE_ICON_SIZE = 42;
const BASE_CENTER_PANEL_GAP = 28;
const BASE_GLOW_RADIUS_PADDING = 24;

let isOpen = false;
let centerX = 0;
let centerY = 0;
let hoveredIndex = -1;
let activeShortcuts: ShortcutItem[] = [];

let lastPointerX = 0;
let lastPointerY = 0;
let rafMoveId: number | null = null;

const host = document.createElement('div');
host.style.position = 'fixed';
host.style.inset = '0';
host.style.pointerEvents = 'none';
host.style.zIndex = '2147483647';

const shadowRoot = host.attachShadow({ mode: 'open' });
const root = document.createElement('div');
root.id = 'open-tab-radial-root';
shadowRoot.appendChild(root);

const style = document.createElement('style');
style.textContent = `
  #wrap {
    position: fixed;
    inset: 0;
    pointer-events: none;
    user-select: none;
    display: none;
  }
  #center {
    position: fixed;
    transform: translate(-50%, -50%);
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.92);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    box-shadow: 0 12px 44px rgba(2, 6, 23, 0.55);
  }
  .sub {
    font-size: 15px;
    line-height: 1.2;
    color: rgba(148, 163, 184, 0.95);
  }
  .main {
    font-size: 24px;
    line-height: 1.15;
    color: #f8fafc;
    font-weight: 800;
    margin-top: 6px;
    max-width: 220px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.02em;
  }
`;

const wrap = document.createElement('div');
wrap.id = 'wrap';

const svg = document.createElementNS(SVG_NS, 'svg');
const defs = document.createElementNS(SVG_NS, 'defs');
const radialGradient = document.createElementNS(SVG_NS, 'radialGradient');
radialGradient.setAttribute('id', 'ot-ring-glow');
radialGradient.setAttribute('cx', '50%');
radialGradient.setAttribute('cy', '50%');
radialGradient.setAttribute('r', '60%');

const stopStart = document.createElementNS(SVG_NS, 'stop');
stopStart.setAttribute('offset', '0%');
stopStart.setAttribute('stop-color', 'rgba(59,130,246,0.16)');
const stopEnd = document.createElementNS(SVG_NS, 'stop');
stopEnd.setAttribute('offset', '100%');
stopEnd.setAttribute('stop-color', 'rgba(15,23,42,0)');
radialGradient.appendChild(stopStart);
radialGradient.appendChild(stopEnd);
defs.appendChild(radialGradient);

const glowCircle = document.createElementNS(SVG_NS, 'circle');
glowCircle.setAttribute('fill', 'url(#ot-ring-glow)');

const sectorsGroup = document.createElementNS(SVG_NS, 'g');

svg.appendChild(defs);
svg.appendChild(glowCircle);
svg.appendChild(sectorsGroup);

const centerPanel = document.createElement('div');
centerPanel.id = 'center';
const centerSub = document.createElement('div');
centerSub.className = 'sub';
centerSub.textContent = '即将打开';
const centerMain = document.createElement('div');
centerMain.className = 'main';
centerMain.textContent = '移动选择';
centerPanel.appendChild(centerSub);
centerPanel.appendChild(centerMain);

wrap.appendChild(svg);
wrap.appendChild(centerPanel);
root.appendChild(style);
root.appendChild(wrap);
document.documentElement.appendChild(host);

const sectorPaths: SVGPathElement[] = [];

const isValidUrl = (url: string) => {
  try {
    const value = url.trim();
    if (!value) return false;
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const normalizeUrl = (url: string) => {
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
};

const isSafeImageUrl = (url: string) => {
  if (!url) return false;
  if (/^data:image\//i.test(url)) return true;
  return isValidUrl(url);
};

const getShortcutIcon = (item: ShortcutItem) => {
  const customIcon = item.icon?.trim() || '';
  if (customIcon && isSafeImageUrl(customIcon)) return customIcon;
  try {
    const hostname = new URL(normalizeUrl(item.url)).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return '';
  }
};

const safeShortcuts = () => {
  return (radialSettings.shortcuts || [])
    .filter((item) => item.name?.trim() && isValidUrl(item.url))
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, 8)
    .map((item) => ({
      ...item,
      name: item.name.trim().slice(0, 60),
      url: normalizeUrl(item.url),
      icon: item.icon?.trim() || ''
    }))
    .filter((item) => !!item.url);
};

const getScale = () => Math.min(140, Math.max(70, radialSettings.scale || 70)) / 100;
const getOuterRadius = () => BASE_OUTER_RADIUS * getScale();
const getInnerRadius = () => BASE_INNER_RADIUS * getScale();
const getIconSize = () => BASE_ICON_SIZE * getScale();
const getCenterPanelGap = () => BASE_CENTER_PANEL_GAP * getScale();
const getGlowRadiusPadding = () => BASE_GLOW_RADIUS_PADDING * getScale();

const polar = (radius: number, angle: number) => ({
  x: centerX + radius * Math.cos(angle),
  y: centerY + radius * Math.sin(angle)
});

const sectorPath = (start: number, end: number) => {
  const outerRadius = getOuterRadius();
  const innerRadius = getInnerRadius();
  const p1 = polar(outerRadius, start);
  const p2 = polar(outerRadius, end);
  const p3 = polar(innerRadius, end);
  const p4 = polar(innerRadius, start);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`;
};

const getIndexByPoint = (x: number, y: number, count: number) => {
  const dx = x - centerX;
  const dy = y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const innerRadius = getInnerRadius();
  const outerRadius = getOuterRadius();
  if (distance < innerRadius || distance > outerRadius) return -1;

  const start = -Math.PI / 2;
  const angle = Math.atan2(dy, dx);
  const normalized = (angle - start + Math.PI * 2) % (Math.PI * 2);
  const per = (Math.PI * 2) / count;
  return Math.floor(normalized / per);
};

const setLayout = () => {
  const centerPanelSize = getInnerRadius() * 2 - getCenterPanelGap();
  const glowRadius = getOuterRadius() + getGlowRadiusPadding();

  svg.setAttribute('width', String(window.innerWidth));
  svg.setAttribute('height', String(window.innerHeight));
  glowCircle.setAttribute('cx', String(centerX));
  glowCircle.setAttribute('cy', String(centerY));
  glowCircle.setAttribute('r', String(glowRadius));

  centerPanel.style.left = `${centerX}px`;
  centerPanel.style.top = `${centerY}px`;
  centerPanel.style.width = `${centerPanelSize}px`;
  centerPanel.style.height = `${centerPanelSize}px`;
};

const rebuildSectors = () => {
  sectorsGroup.textContent = '';
  sectorPaths.length = 0;

  const count = activeShortcuts.length;
  if (!count) return;

  const per = (Math.PI * 2) / count;
  const start = -Math.PI / 2;
  const innerRadius = getInnerRadius();
  const outerRadius = getOuterRadius();
  const iconSize = getIconSize();

  activeShortcuts.forEach((item, index) => {
    const segStart = start + per * index;
    const segEnd = segStart + per;
    const d = sectorPath(segStart, segEnd);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'rgba(17,24,39,0.78)');
    sectorsGroup.appendChild(path);
    sectorPaths.push(path);

    const icon = getShortcutIcon(item);
    if (!icon || !isSafeImageUrl(icon)) return;

    const mid = segStart + per / 2;
    const iconPoint = polar(innerRadius + (outerRadius - innerRadius) * 0.58, mid);

    const image = document.createElementNS(SVG_NS, 'image');
    image.setAttribute('href', icon);
    image.setAttribute('x', String(iconPoint.x - iconSize / 2));
    image.setAttribute('y', String(iconPoint.y - iconSize / 2));
    image.setAttribute('width', String(iconSize));
    image.setAttribute('height', String(iconSize));
    sectorsGroup.appendChild(image);
  });
};

const updateSelectionUI = () => {
  for (let i = 0; i < sectorPaths.length; i++) {
    sectorPaths[i].setAttribute('fill', i === hoveredIndex ? 'rgba(37,99,235,0.9)' : 'rgba(17,24,39,0.78)');
  }

  const text = hoveredIndex >= 0 && hoveredIndex < activeShortcuts.length
    ? activeShortcuts[hoveredIndex].name
    : '移动选择';
  centerMain.textContent = text;
};

const unbindActiveListeners = () => {
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('mouseup', onMouseUp, true);
  window.removeEventListener('blur', onBlur);

  if (rafMoveId !== null) {
    cancelAnimationFrame(rafMoveId);
    rafMoveId = null;
  }
};

const closeRadial = () => {
  isOpen = false;
  hoveredIndex = -1;
  activeShortcuts = [];
  wrap.style.display = 'none';
  unbindActiveListeners();
};

const openRadialAt = (x: number, y: number) => {
  const shortcuts = safeShortcuts();
  if (!shortcuts.length) return;

  centerX = x;
  centerY = y;
  hoveredIndex = -1;
  activeShortcuts = shortcuts;
  isOpen = true;

  setLayout();
  rebuildSectors();
  updateSelectionUI();
  wrap.style.display = 'block';

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('mouseup', onMouseUp, true);
  window.addEventListener('blur', onBlur);
};

const openUrlInActiveNewTab = async (url: string) => {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return false;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'OPEN_TAB_IN_CURRENT_WINDOW',
      payload: { url }
    });
    return !!response?.ok;
  } catch {
    return false;
  }
};

const openUrlForHovered = async () => {
  if (hoveredIndex < 0 || hoveredIndex >= activeShortcuts.length) return;
  const url = normalizeUrl(activeShortcuts[hoveredIndex].url);
  if (!url) return;

  const openedByExtension = await openUrlInActiveNewTab(url);
  if (!openedByExtension) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

const modifierMatched = (e: MouseEvent) => {
  if (radialSettings.modifierKey === 'ctrl') return e.ctrlKey;
  if (radialSettings.modifierKey === 'alt') return e.altKey;
  return e.shiftKey;
};

const shouldIgnoreTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return true;
  return target.isContentEditable;
};

function onMouseDown(e: MouseEvent) {
  if (!radialSettings.enabled) return;
  if (e.button !== 0) return;
  if (!modifierMatched(e)) return;
  if (shouldIgnoreTarget(e.target)) return;

  e.preventDefault();
  e.stopPropagation();

  openRadialAt(e.clientX, e.clientY);
}

function onMouseMove(e: MouseEvent) {
  if (!isOpen || !activeShortcuts.length) return;

  lastPointerX = e.clientX;
  lastPointerY = e.clientY;

  if (rafMoveId !== null) return;

  rafMoveId = requestAnimationFrame(() => {
    rafMoveId = null;
    if (!isOpen || !activeShortcuts.length) return;

    const nextIndex = getIndexByPoint(lastPointerX, lastPointerY, activeShortcuts.length);
    if (nextIndex !== hoveredIndex) {
      hoveredIndex = nextIndex;
      updateSelectionUI();
    }
  });
}

function onMouseUp(e: MouseEvent) {
  if (!isOpen) return;
  e.preventDefault();
  e.stopPropagation();
  void openUrlForHovered();
  closeRadial();
}

function onBlur() {
  if (isOpen) closeRadial();
}

const applySettings = (next: Partial<RadialMenuSettings> | undefined) => {
  const raw = next || {};
  radialSettings = {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : defaultSettings.enabled,
    modifierKey: (raw.modifierKey === 'alt' || raw.modifierKey === 'shift' || raw.modifierKey === 'ctrl')
      ? raw.modifierKey
      : defaultSettings.modifierKey,
    scale: typeof raw.scale === 'number' ? Math.min(140, Math.max(70, raw.scale)) : defaultSettings.scale,
    shortcuts: Array.isArray(raw.shortcuts) ? raw.shortcuts : [...defaultSettings.shortcuts]
  };
};


const loadSettings = async () => {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    applySettings(defaultSettings);
    return;
  }

  const result = await chrome.storage.local.get(STORAGE_KEY);
  applySettings(result[STORAGE_KEY] as RadialMenuSettings | undefined);
};

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') return;
    if (!changes[STORAGE_KEY]) return;
    applySettings(changes[STORAGE_KEY].newValue as RadialMenuSettings | undefined);
    if (isOpen) {
      closeRadial();
    }
  });
}

void loadSettings();

document.addEventListener('mousedown', onMouseDown, true);
