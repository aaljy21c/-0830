// Todo Planner & Calendar - app.js

// Initialize State
let state = {
  todos: {}, // YYYY-MM-DD -> Array of { id, text, category, completed, isRoutine, rolledFrom }
  routines: [], // Array of { id, text, category }
  routinesPopulatedDates: {}, // YYYY-MM-DD -> true
  selectedDate: '', // YYYY-MM-DD
  currentMonth: null, // Date object representing the month currently displayed
  selectedCategory: 'health', // Default selected category for new todo
  todoFilterCategory: 'all', // Category filter for Todo list ('all' or specific category ID)
  categories: {}, // Combined default and custom categories
  device: 'pc', // 'pc' or 'phone'
  fontSize: 16, // Font size in px (10-28)
  dateSize: 14, // Date number font size in px (10-28)
  showCalendar: true, // Calendar visibility toggle
  showControlPanel: false, // Control panel visibility toggle (collapsed by default)
  showAnalytics: false, // Analytics panel visibility toggle
  showTimeline: false, // Timeline panel visibility toggle
  showDdays: false, // Ddays panel visibility toggle
  ddays: [], // Array of D-day objects
  editingDdayId: null, // ID of D-day currently being edited
  clearMode: false, // Schedule clear mode toggle
  theme: 'dark', // 'dark' or 'light'
  editingCategoryId: null, // ID of category currently being edited
  selectedTodoIdForDates: null, // ID of todo expanded to show other dates
  copyingTodoId: null, // ID of todo currently in "copying/adding to other dates" mode
  showDrilldown: false, // Overall rate card drilldown toggle
  showCompletedDrilldown: false, // Completed tasks drilldown toggle
  showPendingDrilldown: false, // Pending tasks drilldown toggle
  diaries: {}, // Diary entries indexed by dateKey (now storing array of record objects)
  diaryDraftImages: [], // Draft array of image base64 strings for the record being created/edited
  diaryDraftDrawing: [], // Draft array of strokes for the drawing board
  diaryDraftAudio: [], // Draft array of audio objects {src, transcription}
  editingRecordId: null, // ID of the record being edited ('new' for adding new, numeric ID for edit, null for none)
  editingTimelineRecordId: null, // ID of the record being inline edited in the timeline
  renderedDiaryDate: null, // Track which date is currently rendered in diary view to auto-collapse creator on date shift
  showRecordPhotos: true, // Whether to display photos in saved records list
  showTodos: true, // Whether the Todo list section is expanded
  showRecords: true, // Whether the Records section is expanded
  showRoutines: false, // Routines management panel visibility toggle
  showSearch: true, // Whether the search box is visible
  allowLinkNavigation: true, // Clickable link navigation toggle
  headerButtonOrder: ['search', 'calendar', 'todos', 'records', 'routines', 'timeline', 'ddays', 'analytics', 'settings'],
  bgHue: 0, // Custom background pastel hue (0 = gray/neutral)
  bgIntensity: 0, // Custom background pastel intensity (0-100)
  accentTheme: 'indigo', // Custom active buttons accent theme ('indigo', 'purple', 'teal', 'emerald', 'amber', 'rose', 'pink')
  accentIntensity: 100, // Custom active buttons accent intensity (0-100)
  searchQuery: '', // Global search query text
  appTitle: '플래너', // Custom app header title
  tabIcons: { // Custom tab icon emojis
    search: '🔍',
    calendar: '📅',
    todos: '🎯',
    records: '📝',
    routines: '🔄',
    timeline: '⏳',
    ddays: '🎉',
    analytics: '📊',
    settings: '⚙️'
  }
};

// Undo/Redo History Stacks
let undoStack = [];
let redoStack = [];

// Google Drive API State
let gdriveTokenClient = null;
let gdriveAccessToken = null;
let gdriveSyncTimeout = null;
let gdriveRefreshTimer = null;
let gdrivePollInterval = null;

// Carousel Lightbox State
let lightboxImages = [];
let lightboxIndex = 0;
let lightboxIsDraft = false;

// Todo Editing Modal State
let editingTodoId = null;
let modalSelectedCategory = 'none';
let editModalSelectedAmpm = 'AM';
let todoEditDraftImages = [];
let todoEditDraftDrawing = [];
let todoEditDraftAudio = [];

// Search Navigation state tracker
let searchAutoOpenedSections = [];

// Custom Time Picker State for Add Form
let currentSelectedTime = '';

// Default Categories Mapping
const DEFAULT_CATEGORIES = {
  health: { label: '건강', color: '#10b981', class: 'cat-health-style' },
  family: { label: '가정', color: '#f43f5e', class: 'cat-family-style' },
  school: { label: '학교', color: '#0ea5e9', class: 'cat-school-style' },
  dev: { label: '자기개발', color: '#a855f7', class: 'cat-dev-style' },
  exercise: { label: '운동', color: '#f59e0b', class: 'cat-exercise-style' },
  other: { label: '기타', color: '#6b7280', class: 'cat-other-style' }
};

// Recommended Emoji presets for each Tab Icon
const RECOMMENDED_EMOJIS = {
  search: ['🔍', '🔎', '⚡', '🔮', '👀', '🔎', '👁️', '🕵️', '🦁', '🔥'],
  calendar: ['📅', '📆', '🗓️', '🌙', '⭐', '⏰', '⏳', '☀️', '🍀', '🎈'],
  todos: ['🎯', '✅', '📋', '📌', '🔔', '🚀', '🏆', '💯', '⭐', '💫'],
  records: ['📝', '✍️', '📔', '📓', '💭', '✏️', '🎨', '💌', '📸', '🧸'],
  routines: ['🔄', '♾️', '♻️', '🔁', '💪', '🎯', '⚙️', '✨', '🔥', '📆'],
  analytics: ['📊', '📈', '💡', '🍀', '🔥', '📉', '🧬', '💎', '👑', '🎯'],
  settings: ['⚙️', '🔧', '🛠️', '🧩', '🎨', '🔑', '🔒', '🔋', '🌐', '🛸']
};

// Preset colors for new categories
const PRESET_COLORS = [
  '#f43f5e', '#f97316', '#f59e0b', '#10b981', '#14b8a6', '#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef'
];

// Helper to get category details safely

// Helper to check if drawing data exists
function hasDrawingData(data) {
  if (!data) return false;
  if (Array.isArray(data)) return data.length > 0;
  if (data && data.type === 'pdf_drawing') return true;
  return false;
}

function getCategory(categoryId) {
  if (categoryId === 'none' || !categoryId) {
    return { label: '', color: '#ffffff', isNone: true };
  }
  if (state.categories[categoryId]) {
    return state.categories[categoryId];
  }
  // Fallback names for default categories if they are deleted
  const defaultLabels = {
    health: '건강',
    family: '가정',
    school: '학교',
    dev: '자기개발',
    exercise: '운동'
  };
  const label = defaultLabels[categoryId] ? `${defaultLabels[categoryId]}(삭제됨)` : '없음';
  return { label: label, color: '#ffffff', isDeleted: true };
}

// Helper to convert hex color to rgba with opacity
function hexToRgba(hex, alpha) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Helper to extract RGB numbers from hex
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  if (c.length !== 6) return null;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return { r, g, b };
}

// Helper to convert HSL to HEX
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  let rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  let gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  let bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');
  return `#${rHex}${gHex}${bHex}`;
}

// Helper to convert HEX to HSL
function hexToHsl(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  let r = parseInt(c.substring(0, 2), 16) / 255;
  let g = parseInt(c.substring(2, 4), 16) / 255;
  let b = parseInt(c.substring(4, 6), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// DOM Elements
const mainWrapper = document.getElementById('main-wrapper');
const monthYearDisplay = document.getElementById('calendar-month-year');
const calendarGrid = document.getElementById('calendar-grid');
const selectedDateDisplay = document.getElementById('selected-date-display');
const todoInputField = document.getElementById('todo-input-field');
const addTodoBtn = document.getElementById('add-todo-btn');
const categorySelector = document.getElementById('category-selector');
const todoCatFilterTabs = document.getElementById('todo-cat-filter-tabs');
const todoCatFilterContainer = document.getElementById('todo-cat-filter-container');
const todoItemsList = document.getElementById('todo-items-list');
const routineCheckbox = document.getElementById('routine-checkbox');

const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const todayBtn = document.getElementById('today-btn');

// Control Bar Elements
const btnPcView = document.getElementById('btn-pc-view');
const btnPhoneView = document.getElementById('btn-phone-view');
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSizeLabel = document.getElementById('font-size-label');

// Initialize application
function init() {
  // Load data from LocalStorage
  loadFromLocalStorage();

  // Set initial dates
  const today = new Date();
  state.selectedDate = formatDateString(today);
  state.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Apply Rollover for Unfinished past tasks
  rolloverUnfinishedTodos();

  // Populate routines for the selected day if not done yet
  populateRoutinesForDate(state.selectedDate);

  // Setup Preset Colors
  initPresetColors();

  // Setup Event Listeners
  try {
    setupEventListeners();
  } catch (e) {
    console.error("Error in setupEventListeners:", e);
  }

  // Setup floating tabs
  try {
    setupScrollFloatingTabs();
  } catch (e) {
    console.error("Error in setupScrollFloatingTabs:", e);
  }

  // Sort header buttons DOM and bind draggable listeners
  try {
    sortHeaderButtonsDOM();
  } catch (e) {
    console.error("Error in sortHeaderButtonsDOM:", e);
  }
  try {
    setupHeaderButtonsDraggable();
  } catch (e) {
    console.error("Error in setupHeaderButtonsDraggable:", e);
  }

  // Load preferences from state to UI
  try {
    applyPreferences();
  } catch (e) {
    console.error("Error in applyPreferences:", e);
  }
  try {
    applyCalendarVisibility();
  } catch (e) {
    console.error("Error in applyCalendarVisibility:", e);
  }
  try {
    applyControlPanelVisibility();
  } catch (e) {
    console.error("Error in applyControlPanelVisibility:", e);
  }
  try {
    applyAnalyticsVisibility();
  } catch (e) {
    console.error("Error in applyAnalyticsVisibility:", e);
  }
  try {
    applySearchVisibility();
  } catch (e) {
    console.error("Error in applySearchVisibility:", e);
  }
  try {
    applyTimelineVisibility();
  } catch (e) {
    console.error("Error in applyTimelineVisibility:", e);
  }

  // Auto GDrive reconnect if user was previously connected
  if (localStorage.getItem('neon_planner_gdrive_connected') === 'true') {
    const savedToken = localStorage.getItem('neon_planner_gdrive_access_token');
    const savedExpiry = parseInt(localStorage.getItem('neon_planner_gdrive_token_expiry') || '0', 10);
    const gdriveBackupBtn = document.getElementById('btn-gdrive-backup');
    const gdriveRestoreBtn = document.getElementById('btn-gdrive-restore');
    const gdriveLogoutBtn = document.getElementById('btn-gdrive-logout');
    
    if (savedToken) {
      gdriveAccessToken = savedToken;
      if (gdriveBackupBtn) gdriveBackupBtn.disabled = false;
      if (gdriveRestoreBtn) gdriveRestoreBtn.disabled = false;
      if (gdriveLogoutBtn) gdriveLogoutBtn.style.display = 'inline-flex';
      
      const badge = document.getElementById('gdrive-status-badge');
      if (badge) {
        badge.textContent = '연결 완료 (자동 동기화)';
        badge.style.background = 'rgba(16, 185, 129, 0.15)';
        badge.style.color = '#10b981';
        badge.style.borderColor = '#10b981';
      }
      const info = document.getElementById('gdrive-user-info');
      if (info) info.textContent = '구글 드라이브 실시간 동기화 상태';
    }

    if (savedToken && savedExpiry > Date.now() + 60000) {
      scheduleGDriveTokenRefresh(savedExpiry);
      setTimeout(autoSyncWithDrive, 500);
      if (gdrivePollInterval) clearInterval(gdrivePollInterval);
      gdrivePollInterval = setInterval(autoSyncWithDrive, 3000);
    } else if (savedToken) {
      // Token missing or expired, attempt background auto refresh
      setTimeout(autoRefreshGDriveToken, 1000);
    }
  }

  // Update Undo/Redo button status
  updateHistoryButtons();

  // Initialize Routines Panel
  initRoutinesPanel();

  // Initialize SortableJS for drag-and-drop
  if (typeof Sortable !== 'undefined' && todoItemsList) {
    Sortable.create(todoItemsList, {
      delay: 400, // 400ms long press to drag on mobile
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      fallbackTolerance: 5,
      forceFallback: true,
      fallbackOnBody: true,
      scroll: true,
      scrollSensitivity: 80,
      scrollSpeed: 15,
      animation: 150,
      ghostClass: 'sortable-ghost',
      onEnd: function (evt) {
        if (evt.oldIndex === evt.newIndex) return;

        const itemEl = evt.item;
        const todoId = Number(itemEl.getAttribute('data-todo-id'));
        
        const currentTodos = state.todos[state.selectedDate];
        if (!currentTodos) return;
        
        const draggedTodo = currentTodos.find(t => t.id === todoId);
        if (!draggedTodo) return;

        // Helper to check if two items share the same sorting group (ignoring time so they can be mixed freely)
        const isSameGroup = (t1, t2) => {
          return Boolean(t1.completed) === Boolean(t2.completed) && 
                 Boolean(t1.isImportant) === Boolean(t2.isImportant);
        };

        let prevOrder = null;
        let nextOrder = null;

        // Traverse upwards to find the nearest item in the SAME group
        let pNode = itemEl.previousElementSibling;
        while (pNode) {
          const pId = Number(pNode.getAttribute('data-todo-id'));
          const pt = currentTodos.find(t => t.id === pId);
          if (pt && isSameGroup(draggedTodo, pt)) {
            prevOrder = pt.customOrder || pt.id;
            break;
          }
          pNode = pNode.previousElementSibling;
        }

        // Traverse downwards to find the nearest item in the SAME group
        let nNode = itemEl.nextElementSibling;
        while (nNode) {
          const nId = Number(nNode.getAttribute('data-todo-id'));
          const nt = currentTodos.find(t => t.id === nId);
          if (nt && isSameGroup(draggedTodo, nt)) {
            nextOrder = nt.customOrder || nt.id;
            break;
          }
          nNode = nNode.nextElementSibling;
        }

        // Calculate new order within the same group
        if (prevOrder !== null && nextOrder !== null) {
          draggedTodo.customOrder = (prevOrder + nextOrder) / 2;
        } else if (prevOrder !== null) {
          draggedTodo.customOrder = prevOrder + 1000;
        } else if (nextOrder !== null) {
          draggedTodo.customOrder = nextOrder - 1000;
        } else {
          draggedTodo.customOrder = Date.now();
        }

        pushToHistory();
        saveTodos();
        updateUI();
      }
    });
  }

  // Initial render
  updateUI();
}

// Load all items from LocalStorage
function loadFromLocalStorage() {
  const savedTodos = localStorage.getItem('neon_planner_todos');
  if (savedTodos) {
    try {
      const parsedTodos = JSON.parse(savedTodos);
      state.todos = (parsedTodos && typeof parsedTodos === 'object') ? parsedTodos : {};
      
      // Migration: Preserve existing auto-sort order (including time) into customOrder permanently
      let migrated = false;
      Object.keys(state.todos).forEach(dateKey => {
        let dayTodos = state.todos[dateKey];
        if (Array.isArray(dayTodos)) {
          // Sort them how they used to be sorted
          const sorted = [...dayTodos].sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const isImpA = Boolean(a.isImportant);
            const isImpB = Boolean(b.isImportant);
            if (isImpA !== isImpB) return isImpA ? -1 : 1;
            const timeA = a.time || "";
            const timeB = b.time || "";
            if (timeA && timeB) return timeA.localeCompare(timeB);
            if (timeA) return -1;
            if (timeB) return 1;
            return (a.customOrder || a.id) - (b.customOrder || b.id);
          });
          
          // Reassign customOrder strictly based on this index if it hasn't been migrated yet
          // Date.now() is around 1700000000000, we'll use spaced small numbers (e.g., 100000, 200000)
          sorted.forEach((t, i) => {
            if (!t.customOrder || t.customOrder > 1000000000000) {
              t.customOrder = (i + 1) * 100000;
              migrated = true;
            }
          });
        }
      });
      if (migrated) saveTodos();
      
    } catch (e) {
      console.error(e);
      state.todos = {};
    }
  }

  const savedRoutines = localStorage.getItem('neon_planner_routines');
  if (savedRoutines) {
    try {
      const parsedRoutines = JSON.parse(savedRoutines);
      state.routines = (parsedRoutines && Array.isArray(parsedRoutines)) ? parsedRoutines : [];
    } catch (e) {
      console.error(e);
      state.routines = [];
    }
  } else {
    state.routines = [];
  }

  const savedPopulated = localStorage.getItem('neon_planner_populated_dates');
  if (savedPopulated) {
    try {
      const parsedPopulated = JSON.parse(savedPopulated);
      state.routinesPopulatedDates = (parsedPopulated && typeof parsedPopulated === 'object') ? parsedPopulated : {};
    } catch (e) {
      console.error(e);
      state.routinesPopulatedDates = {};
    }
  }

  const savedDevice = localStorage.getItem('neon_planner_device');
  if (savedDevice) state.device = savedDevice;

  const savedFontSize = localStorage.getItem('neon_planner_font_size');
  if (savedFontSize) state.fontSize = parseInt(savedFontSize, 10) || 16;

  const savedDateSize = localStorage.getItem('neon_planner_date_size');
  if (savedDateSize) state.dateSize = parseInt(savedDateSize, 10) || 14;

  const savedShowCalendar = localStorage.getItem('neon_planner_show_calendar');
  if (savedShowCalendar !== null) {
    state.showCalendar = savedShowCalendar === 'true';
  }

  const savedShowSearch = localStorage.getItem('neon_planner_show_search');
  if (savedShowSearch !== null) {
    state.showSearch = savedShowSearch === 'true';
  }

  const savedTheme = localStorage.getItem('neon_planner_theme');
  if (savedTheme) state.theme = savedTheme;

  // Panels should be hidden by default on app load
  state.showControlPanel = false;
  state.showAnalytics = false;
  state.showTimeline = false;
  state.showRoutines = false;
  state.showDdays = false;
  
  // (Optional: remove or ignore the saved values for these states)
  const savedShowControlPanel = localStorage.getItem('neon_planner_show_control_panel');
  const savedShowAnalytics = localStorage.getItem('neon_planner_show_analytics');
  const savedShowTimeline = localStorage.getItem('neon_planner_show_timeline');
  const savedShowRoutines = localStorage.getItem('neon_planner_show_routines');
  const savedShowDdays = localStorage.getItem('neon_planner_show_ddays');

  // Load categories (handles migration from older format)
  const savedCategories = localStorage.getItem('neon_planner_categories');
  if (savedCategories) {
    state.categories = JSON.parse(savedCategories);
  } else {
    const savedCustomCategories = localStorage.getItem('neon_planner_custom_categories');
    let customCategories = {};
    if (savedCustomCategories) {
      try {
        customCategories = JSON.parse(savedCustomCategories);
      } catch (e) {
        console.error(e);
      }
    }
    state.categories = { ...DEFAULT_CATEGORIES, ...customCategories };
    localStorage.setItem('neon_planner_categories', JSON.stringify(state.categories));
  }

  const savedDiaries = localStorage.getItem('neon_planner_diaries');
  if (savedDiaries) {
    try {
      state.diaries = JSON.parse(savedDiaries);
      
      // Migration routine for older single-record diary format to array format
      Object.keys(state.diaries).forEach(dk => {
        const val = state.diaries[dk];
        if (val && !Array.isArray(val)) {
          state.diaries[dk] = [{
            id: Date.now() - Math.floor(Math.random() * 100000),
            text: val.text || '',
            images: val.image ? [val.image] : []
          }];
        }
      });
    } catch (e) {
      console.error(e);
      state.diaries = {};
    }
  } else {
    state.diaries = {};
  }

  // Load button order
  const savedButtonOrder = localStorage.getItem('neon_planner_button_order');
  if (savedButtonOrder) {
    try {
      const parsed = JSON.parse(savedButtonOrder);
      if (parsed && Array.isArray(parsed)) {
        state.headerButtonOrder = parsed;
        if (!state.headerButtonOrder.includes('search')) {
          state.headerButtonOrder.unshift('search');
        }
        if (!state.headerButtonOrder.includes('routines')) {
          const idx = state.headerButtonOrder.indexOf('timeline');
          if (idx !== -1) state.headerButtonOrder.splice(idx, 0, 'routines');
          else state.headerButtonOrder.push('routines');
        }
        if (!state.headerButtonOrder.includes('timeline')) {
          const idx = state.headerButtonOrder.indexOf('analytics');
          if (idx !== -1) state.headerButtonOrder.splice(idx, 0, 'timeline');
          else state.headerButtonOrder.push('timeline');
        }
        if (!state.headerButtonOrder.includes('ddays')) {
          const idx = state.headerButtonOrder.indexOf('timeline');
          if (idx !== -1) state.headerButtonOrder.splice(idx + 1, 0, 'ddays');
          else state.headerButtonOrder.push('ddays');
        }
      } else {
        state.headerButtonOrder = ['search', 'calendar', 'todos', 'records', 'timeline', 'ddays', 'analytics', 'settings'];
      }
    } catch (e) {
      console.error(e);
      state.headerButtonOrder = ['search', 'calendar', 'todos', 'records', 'timeline', 'ddays', 'analytics', 'settings'];
    }
  } else {
    state.headerButtonOrder = ['search', 'calendar', 'todos', 'records', 'timeline', 'ddays', 'analytics', 'settings'];
  }

  const savedAppTitle = localStorage.getItem('neon_planner_app_title');
  if (savedAppTitle) {
    if (savedAppTitle === 'NEON PLANNER') {
      state.appTitle = '플래너';
      localStorage.setItem('neon_planner_app_title', '플래너');
    } else {
      state.appTitle = savedAppTitle;
    }
  }

  const savedTabIcons = localStorage.getItem('neon_planner_tab_icons');
  if (savedTabIcons) {
    try {
      state.tabIcons = { ...state.tabIcons, ...JSON.parse(savedTabIcons) };
    } catch (e) {
      console.error(e);
    }
  }

  // Load link navigation preference
  const savedAllowLink = localStorage.getItem('neon_planner_allow_link_navigation');
  if (savedAllowLink !== null) {
    state.allowLinkNavigation = savedAllowLink === 'true';
  } else {
    state.allowLinkNavigation = true;
  }

  // Load history controls preference
  const savedShowHistory = localStorage.getItem('neon_planner_show_history_controls');
  if (savedShowHistory !== null) {
    state.showHistoryControls = savedShowHistory === 'true';
  } else {
    state.showHistoryControls = true;
  }

  // Load background HSL variables
  const savedBgHue = localStorage.getItem('neon_planner_bg_hue');
  if (savedBgHue !== null) state.bgHue = parseInt(savedBgHue, 10);

  const savedBgIntensity = localStorage.getItem('neon_planner_bg_intensity');
  if (savedBgIntensity !== null) state.bgIntensity = parseInt(savedBgIntensity, 10);

  const savedAccentTheme = localStorage.getItem('neon_planner_accent_theme');
  if (savedAccentTheme !== null) state.accentTheme = savedAccentTheme;

  const savedAccentIntensity = localStorage.getItem('neon_planner_accent_intensity');
  if (savedAccentIntensity !== null) state.accentIntensity = parseInt(savedAccentIntensity, 10);

  const savedGDriveClientId = localStorage.getItem('neon_planner_gdrive_client_id');
  state.gdriveClientId = savedGDriveClientId || '';

  const savedDdays = localStorage.getItem('neon_planner_ddays');
  if (savedDdays) {
    try {
      const parsedDdays = JSON.parse(savedDdays);
      state.ddays = Array.isArray(parsedDdays) ? parsedDdays : [];
    } catch (e) {
      console.error(e);
      state.ddays = [];
    }
  } else {
    state.ddays = [];
  }
}

function saveDdays() {
  localStorage.setItem('neon_planner_ddays', JSON.stringify(state.ddays));
  triggerGDriveAutoSync();
}

function saveRoutines() {
  localStorage.setItem('neon_planner_routines', JSON.stringify(state.routines));
  triggerGDriveAutoSync();
}

// Format Date object to YYYY-MM-DD
function formatDateString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Apply visual view preferences (device mode, font size)
function applyPreferences() {
  // Device
  if (state.device === 'phone') {
    mainWrapper.classList.add('phone-mode');
    btnPcView.classList.remove('active');
    btnPhoneView.classList.add('active');
  } else {
    mainWrapper.classList.remove('phone-mode');
    btnPcView.classList.add('active');
    btnPhoneView.classList.remove('active');
  }

  // Apply dynamic layout section order
  applyLayoutSectionOrder();

  // Font Size (slider)
  document.documentElement.style.fontSize = state.fontSize + 'px';
  const modalFontSizeSlider = document.getElementById('modal-font-size-slider');
  const modalFontSizeLabel = document.getElementById('modal-font-size-label');
  if (fontSizeSlider) fontSizeSlider.value = state.fontSize;
  if (modalFontSizeSlider) modalFontSizeSlider.value = state.fontSize;
  if (fontSizeLabel) fontSizeLabel.textContent = state.fontSize + 'px';
  if (modalFontSizeLabel) modalFontSizeLabel.textContent = state.fontSize + 'px';

  // Date Font Size
  document.documentElement.style.setProperty('--date-font-size', state.dateSize + 'px');
  const dateSizeSlider = document.getElementById('date-size-slider');
  const dateSizeLabel = document.getElementById('date-size-label');
  const modalDateSizeSlider = document.getElementById('modal-date-size-slider');
  const modalDateSizeLabel = document.getElementById('modal-date-size-label');
  if (dateSizeSlider) dateSizeSlider.value = state.dateSize;
  if (modalDateSizeSlider) modalDateSizeSlider.value = state.dateSize;
  if (dateSizeLabel) dateSizeLabel.textContent = state.dateSize + 'px';
  if (modalDateSizeLabel) modalDateSizeLabel.textContent = state.dateSize + 'px';

  // Apply theme
  const btnThemeDark = document.getElementById('btn-theme-dark');
  const btnThemeLight = document.getElementById('btn-theme-light');
  if (state.theme === 'light') {
    document.body.classList.add('light-theme');
    if (btnThemeLight) btnThemeLight.classList.add('active');
    if (btnThemeDark) btnThemeDark.classList.remove('active');
  } else {
    document.body.classList.remove('light-theme');
    if (btnThemeDark) btnThemeDark.classList.add('active');
    if (btnThemeLight) btnThemeLight.classList.remove('active');
  }

  // Apply Link Navigation setting
  const btnLinkEnable = document.getElementById('btn-link-enable');
  const btnLinkDisable = document.getElementById('btn-link-disable');
  if (btnLinkEnable && btnLinkDisable) {
    if (state.allowLinkNavigation) {
      btnLinkEnable.classList.add('active');
      btnLinkDisable.classList.remove('active');
    } else {
      btnLinkEnable.classList.remove('active');
      btnLinkDisable.classList.add('active');
    }
  }

  // Apply History Controls setting
  const btnHistoryEnable = document.getElementById('btn-history-enable');
  const btnHistoryDisable = document.getElementById('btn-history-disable');
  if (btnHistoryEnable && btnHistoryDisable) {
    if (state.showHistoryControls !== false) {
      btnHistoryEnable.classList.add('active');
      btnHistoryDisable.classList.remove('active');
    } else {
      btnHistoryEnable.classList.remove('active');
      btnHistoryDisable.classList.add('active');
    }
  }

  // Apply Background HSL Color variables
  const isLight = (state.theme === 'light');
  let saturation = 100; // Saturation is fixed to 100% for colored presets
  if (state.bgHue === 0) {
    saturation = 0; // Gray/Slate preset has 0% saturation
  }

  let lightness = 0;
  if (isLight) {
    // Light Theme: range from 99% (intensity 0) down to 85% (intensity 100)
    lightness = Math.round(99 - (state.bgIntensity / 100) * 14);
  } else {
    // Dark Theme: range from 4% (intensity 0) up to 16% (intensity 100)
    lightness = Math.round(4 + (state.bgIntensity / 100) * 12);
  }

  document.documentElement.style.setProperty('--bg-hue', state.bgHue);
  document.documentElement.style.setProperty('--bg-saturation', saturation + '%');
  document.documentElement.style.setProperty('--bg-lightness', lightness + '%');

  // Calculate dynamic nested background & border HSL levels (inner layers get progressively lighter/softer than the borders)
  let panelBg, boxBg, panelBorder;
  if (isLight) {
    // Light Theme: outer is L, panel is L+3%, border is L+6% (lighter), box is L+11% (lightest/almost white)
    panelBg = `hsla(${state.bgHue}, ${saturation}%, ${Math.min(100, lightness + 3)}%, 0.65)`;
    panelBorder = `hsla(${state.bgHue}, ${saturation}%, ${Math.min(100, lightness + 6)}%, 0.35)`;
    boxBg = `hsla(${state.bgHue}, ${saturation}%, ${Math.min(100, lightness + 11)}%, 0.75)`;
  } else {
    // Dark Theme: outer is L, panel is L+4%, border is L+9% (lighter), box is L+15% (lightest)
    panelBg = `hsla(${state.bgHue}, ${saturation}%, ${Math.min(100, lightness + 4)}%, 0.65)`;
    panelBorder = `hsla(${state.bgHue}, ${saturation}%, ${Math.min(100, lightness + 9)}%, 0.28)`;
    boxBg = `hsla(${state.bgHue}, ${saturation}%, ${Math.min(100, lightness + 15)}%, 0.55)`;
  }

  document.documentElement.style.setProperty('--panel-bg', panelBg);
  document.documentElement.style.setProperty('--box-bg', boxBg);
  document.documentElement.style.setProperty('--panel-border', panelBorder);

  // Dynamic Point Accent color mapping
  const ACCENT_HUES = {
    'indigo': 240,
    'purple': 270,
    'teal': 190,
    'emerald': 150,
    'amber': 40,
    'rose': 350,
    'pink': 330
  };

  const accentHue = ACCENT_HUES[state.accentTheme] || 240;
  const accentSat = 90;
  let accentLight = 100;
  if (isLight) {
    accentLight = Math.round(100 - (state.accentIntensity / 100) * 52);
  } else {
    accentLight = Math.round(100 - (state.accentIntensity / 100) * 28);
  }

  const accentVal = `hsl(${accentHue}, ${accentSat}%, ${accentLight}%)`;
  const accentGlow = `hsla(${accentHue}, ${accentSat}%, ${accentLight}%, 0.25)`;

  document.documentElement.style.setProperty('--accent-color', accentVal);
  document.documentElement.style.setProperty('--accent-glow', accentGlow);



  // Sync Accent Theme preset buttons active classes
  const accentBtns = Array.from(document.querySelectorAll('.accent-preset-btn'));
  accentBtns.forEach(btn => {
    if (btn.dataset.accent === state.accentTheme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Sync background preset buttons active class
  const presetBtns = Array.from(document.querySelectorAll('.bg-preset-btn'));
  presetBtns.forEach(btn => {
    const hueVal = parseInt(btn.dataset.hue, 10);
    if (hueVal === state.bgHue) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Sync background intensity slider and label
  const intensitySlider = document.getElementById('bg-intensity-slider');
  const intensityLabel = document.getElementById('bg-intensity-label');
  if (intensitySlider) intensitySlider.value = state.bgIntensity;
  if (intensityLabel) intensityLabel.textContent = state.bgIntensity;

  // Sync accent intensity slider and label
  const accentIntensitySlider = document.getElementById('accent-intensity-slider');
  const accentIntensityLabel = document.getElementById('accent-intensity-label');
  if (accentIntensitySlider) accentIntensitySlider.value = state.accentIntensity;
  if (accentIntensityLabel) accentIntensityLabel.textContent = state.accentIntensity;

  // Sync Custom Title input
  const titleInput = document.getElementById('custom-app-title-input');
  if (titleInput) titleInput.value = state.appTitle || '';

  // Sync Google Drive Client ID input
  const gdriveClientIdInput = document.getElementById('gdrive-client-id-input');
  if (gdriveClientIdInput) gdriveClientIdInput.value = state.gdriveClientId || '';
}

// Apply calendar section visibility
function applyCalendarVisibility() {
  const calendarSection = document.querySelector('.calendar-section');
  const appContainer = document.getElementById('app');
  const btnToggleCalendar = document.getElementById('btn-toggle-calendar');
  if (!calendarSection || !appContainer || !btnToggleCalendar) return;

  if (state.showCalendar) {
    calendarSection.classList.remove('hidden');
    appContainer.classList.remove('hide-calendar');
    btnToggleCalendar.classList.add('active-view');
  } else {
    calendarSection.classList.add('hidden');
    appContainer.classList.add('hide-calendar');
    btnToggleCalendar.classList.remove('active-view');
  }
}

// Apply search visibility
function applySearchVisibility() {
  const searchBar = document.querySelector('.header-search');
  const btnToggleSearch = document.getElementById('btn-toggle-search');
  if (!searchBar || !btnToggleSearch) return;

  if (state.showSearch) {
    searchBar.classList.remove('hidden');
    btnToggleSearch.classList.add('active-view');
  } else {
    searchBar.classList.add('hidden');
    btnToggleSearch.classList.remove('active-view');
    state.searchQuery = '';
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('btn-clear-search');
    if (clearBtn) clearBtn.style.display = 'none';
    const section = document.getElementById('search-results-section');
    if (section) section.classList.add('hidden');
  }
}

// Apply control panel visibility
function applyControlPanelVisibility() {
  const panel = document.getElementById('control-panel');
  const btnToggle = document.getElementById('btn-toggle-control-panel');
  if (!panel || !btnToggle) return;

  if (state.showControlPanel) {
    panel.classList.remove('collapsed');
    btnToggle.classList.add('active-view');
  } else {
    panel.classList.add('collapsed');
    btnToggle.classList.remove('active-view');
  }
}

// Apply analytics section visibility
function applyAnalyticsVisibility() {
  const panel = document.getElementById('analytics-panel');
  const btnToggle = document.getElementById('btn-toggle-analytics');
  if (!panel || !btnToggle) return;

  if (state.showAnalytics) {
    panel.classList.remove('hidden');
    btnToggle.classList.add('active-view');
    updateAnalytics();
  } else {
    panel.classList.add('hidden');
    btnToggle.classList.remove('active-view');
  }
}

// Apply routines section visibility
function applyRoutinesVisibility() {
  const panel = document.getElementById('routines-panel');
  const btnToggle = document.getElementById('btn-toggle-routines');
  if (!panel || !btnToggle) return;

  if (state.showRoutines) {
    panel.classList.remove('hidden');
    btnToggle.classList.add('active-view');
    renderRoutinesPanel();
  } else {
    panel.classList.add('hidden');
    btnToggle.classList.remove('active-view');
  }
}

// Apply timeline section visibility
function applyTimelineVisibility() {
  const panel = document.getElementById('timeline-panel');
  const btnToggle = document.getElementById('btn-toggle-timeline');
  if (!panel || !btnToggle) return;

  if (state.showTimeline) {
    panel.classList.remove('hidden');
    btnToggle.classList.add('active-view');
    renderTimeline();
  } else {
    panel.classList.add('hidden');
    btnToggle.classList.remove('active-view');
  }
}

// Apply dynamic layout order and grid borders for both PC and Phone modes
function applyLayoutSectionOrder() {
  const appContainer = document.getElementById('app');
  const mainWrapper = document.getElementById('main-wrapper');
  const controlPanel = document.getElementById('control-panel');
  const calendarSection = document.querySelector('.calendar-section');
  const todoSection = document.querySelector('.todo-section');
  const recordsWrapper = document.getElementById('records-wrapper-block');
  const analyticsPanel = document.getElementById('analytics-panel');
  const timelinePanel = document.getElementById('timeline-panel');
  const routinesPanel = document.getElementById('routines-panel');

  if (!appContainer || !mainWrapper || !controlPanel || !calendarSection || !todoSection || !recordsWrapper || !analyticsPanel) return;

  // Handle Control Panel reparenting based on mode
  if (state.device === 'phone') {
    if (controlPanel.parentNode !== appContainer) {
      appContainer.insertBefore(controlPanel, appContainer.firstChild);
    }
    controlPanel.style.order = -1;
  } else {
    const globalHeader = document.querySelector('.global-header');
    if (globalHeader && controlPanel.parentNode !== mainWrapper) {
      mainWrapper.insertBefore(controlPanel, globalHeader.nextSibling);
    }
    controlPanel.style.order = '';
  }

  // Handle all 6 section visibilities
  const ddaysPanel = document.getElementById('ddays-panel');
  if (state.showCalendar) calendarSection.classList.remove('hidden');
  else calendarSection.classList.add('hidden');

  if (state.showTodos) todoSection.classList.remove('hidden');
  else todoSection.classList.add('hidden');

  if (state.showRecords) {
    if (recordsWrapper) recordsWrapper.classList.remove('hidden');
  } else {
    if (recordsWrapper) recordsWrapper.classList.add('hidden');
  }

  if (state.showRoutines) {
    if (routinesPanel) routinesPanel.classList.remove('hidden');
  } else {
    if (routinesPanel) routinesPanel.classList.add('hidden');
  }

  if (state.showTimeline) {
    if (timelinePanel) timelinePanel.classList.remove('hidden');
  } else {
    if (timelinePanel) timelinePanel.classList.add('hidden');
  }

  if (state.showDdays) {
    if (ddaysPanel) ddaysPanel.classList.remove('hidden');
  } else {
    if (ddaysPanel) ddaysPanel.classList.add('hidden');
  }

  if (state.showAnalytics) analyticsPanel.classList.remove('hidden');
  else analyticsPanel.classList.add('hidden');

  // Always ensure panels are siblings inside appContainer for layout grid
  if (recordsWrapper && recordsWrapper.parentNode !== appContainer) {
    appContainer.appendChild(recordsWrapper);
  }
  if (routinesPanel && routinesPanel.parentNode !== appContainer) {
    appContainer.appendChild(routinesPanel);
  }
  if (timelinePanel && timelinePanel.parentNode !== appContainer) {
    appContainer.appendChild(timelinePanel);
  }
  if (ddaysPanel && ddaysPanel.parentNode !== appContainer) {
    appContainer.appendChild(ddaysPanel);
  }

  // Set order for the 6 layout sections
  const orderMap = {
    'calendar': calendarSection,
    'todos': todoSection,
    'records': recordsWrapper,
    'routines': routinesPanel,
    'timeline': timelinePanel,
    'ddays': ddaysPanel,
    'analytics': analyticsPanel
  };

  const otherOrder = state.headerButtonOrder.filter(id => id !== 'settings' && id !== 'search');
  otherOrder.forEach((sectionId, idx) => {
    const element = orderMap[sectionId];
    if (element) {
      element.style.order = idx + 1;
    }
  });

  if (state.device === 'phone' || window.innerWidth <= 900) {
    // --- PHONE MODE or SQUEEZED PC VIEWPORT ---
    [calendarSection, todoSection, recordsWrapper, routinesPanel, analyticsPanel].forEach(el => {
      el.style.borderLeft = '';
      el.style.paddingLeft = '';
      el.style.borderTop = '';
      el.style.paddingTop = '';
    });
    appContainer.style.display = 'flex';
    appContainer.style.flexDirection = 'column';
    appContainer.style.gridTemplateColumns = '';
  } else {
    // --- PC MODE ---
    appContainer.style.display = 'grid';
    appContainer.style.flexDirection = '';

    // Determine grid columns dynamically based on number of visible top-row sections
    const visibleColumns = [];
    if (state.showCalendar && calendarSection) visibleColumns.push(calendarSection);
    if (state.showTodos && todoSection) visibleColumns.push(todoSection);
    if (state.showRecords && recordsWrapper) visibleColumns.push(recordsWrapper);
    if (state.showRoutines && routinesPanel) visibleColumns.push(routinesPanel);
    if (state.showTimeline && timelinePanel) visibleColumns.push(timelinePanel);
    if (state.showDdays && ddaysPanel) visibleColumns.push(ddaysPanel);
    if (state.showAnalytics && analyticsPanel) visibleColumns.push(analyticsPanel);

    // Sort visible sections by order
    visibleColumns.sort((a, b) => (parseInt(a.style.order) || 0) - (parseInt(b.style.order) || 0));

    // Reset default layout styles
    [calendarSection, todoSection, recordsWrapper, routinesPanel, timelinePanel, ddaysPanel, analyticsPanel].forEach(el => {
      if (el) {
        el.style.borderLeft = '';
        el.style.paddingLeft = '';
        el.style.borderTop = '';
        el.style.paddingTop = '';
      }
    });

    if (visibleColumns.length <= 1) {
      appContainer.style.gridTemplateColumns = '1fr';
    } else {
      appContainer.style.gridTemplateColumns = '1.2fr 1fr';
      
      // Apply separator borders to the right-column items (odd indexes)
      visibleColumns.forEach((el, index) => {
        if (index % 2 === 1) {
          el.style.borderLeft = '1px solid var(--panel-border)';
          el.style.paddingLeft = '30px';
        }
      });
    }
  }
}

// Schedule a background token refresh before the current token expires
function scheduleGDriveTokenRefresh(expiryTime) {
  if (gdriveRefreshTimer) {
    clearTimeout(gdriveRefreshTimer);
    gdriveRefreshTimer = null;
  }
  
  const now = Date.now();
  // Refresh 5 minutes before the token actually expires
  const refreshDelay = (expiryTime - now) - (5 * 60 * 1000);
  
  if (refreshDelay > 0) {
    gdriveRefreshTimer = setTimeout(autoRefreshGDriveToken, refreshDelay);
  } else {
    // Already within 5 minutes or expired, try to refresh shortly
    gdriveRefreshTimer = setTimeout(autoRefreshGDriveToken, 1000);
  }
}

// Silently refresh the Google Drive access token using promptless GIS client
function autoRefreshGDriveToken() {
  let clientId = (state.gdriveClientId || '').trim();
  if (!clientId) return;
  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    clientId += '.apps.googleusercontent.com';
  }

  if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
    console.warn('Google Identity Services script not ready for silent refresh.');
    return;
  }

  const gdriveBackupBtn = document.getElementById('btn-gdrive-backup');
  const gdriveRestoreBtn = document.getElementById('btn-gdrive-restore');
  const gdriveLogoutBtn = document.getElementById('btn-gdrive-logout');

  try {
    gdriveTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.appdata',
      callback: (tokenResponse) => {
        if (tokenResponse.error !== undefined) {
          console.error('Silent Google Drive token refresh failed:', tokenResponse.error);
          return;
        }
        gdriveAccessToken = tokenResponse.access_token;
        const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
        localStorage.setItem('neon_planner_gdrive_access_token', gdriveAccessToken);
        localStorage.setItem('neon_planner_gdrive_token_expiry', expiryTime);

        if (gdriveBackupBtn) gdriveBackupBtn.disabled = false;
        if (gdriveRestoreBtn) gdriveRestoreBtn.disabled = false;
        if (gdriveLogoutBtn) gdriveLogoutBtn.style.display = 'inline-flex';

        const badge = document.getElementById('gdrive-status-badge');
        if (badge) {
          badge.textContent = '연결 완료 (자동 동기화)';
          badge.style.background = 'rgba(16, 185, 129, 0.15)';
          badge.style.color = '#10b981';
          badge.style.borderColor = '#10b981';
        }
        const info = document.getElementById('gdrive-user-info');
        if (info) info.textContent = '구글 드라이브 실시간 동기화 상태';
        
        scheduleGDriveTokenRefresh(expiryTime);
        if (gdrivePollInterval) clearInterval(gdrivePollInterval);
        gdrivePollInterval = setInterval(autoSyncWithDrive, 3000);
      }
    });

    // Silent request (no login popup, prompt: '')
    gdriveTokenClient.requestAccessToken({ prompt: '' });
  } catch (e) {
    console.error('Silent token refresh initialization failed:', e);
  }
}

// Background Auto-sync to Google Drive (if logged in and connected)
function triggerGDriveAutoSync() {
  const prevMod = parseInt(localStorage.getItem('neon_planner_last_modified') || '0', 10);
  const newMod = Math.max(Date.now(), prevMod + 1);
  localStorage.setItem('neon_planner_last_modified', newMod.toString());
  if (!gdriveAccessToken) return; // Silent if not connected

  if (gdriveSyncTimeout) {
    clearTimeout(gdriveSyncTimeout);
  }

  // Debounce for 1.5 seconds to group rapid user actions (like toggling multiple checkboxes)
  gdriveSyncTimeout = setTimeout(async () => {
    const statusBadge = document.getElementById('gdrive-status-badge');
    if (statusBadge) {
      statusBadge.textContent = '🔄 동기화 중...';
      statusBadge.style.background = 'rgba(59, 130, 246, 0.15)';
      statusBadge.style.color = '#3b82f6';
      statusBadge.style.borderColor = '#3b82f6';
    }

    try {
      const backupData = {
        todos: JSON.parse(localStorage.getItem('neon_planner_todos') || '{}'),
        diaries: JSON.parse(localStorage.getItem('neon_planner_diaries') || '{}'),
        categories: JSON.parse(localStorage.getItem('neon_planner_categories') || '{}'),
        tabIcons: JSON.parse(localStorage.getItem('neon_planner_tab_icons') || '{}'),
        appTitle: localStorage.getItem('neon_planner_app_title') || '',
        ddays: JSON.parse(localStorage.getItem('neon_planner_ddays') || '[]'),
        routines: JSON.parse(localStorage.getItem('neon_planner_routines') || '[]'),
        routinesPopulatedDates: JSON.parse(localStorage.getItem('neon_planner_populated_dates') || '{}'),
        preferences: {
          theme: localStorage.getItem('neon_planner_theme') || 'dark',
          fontSize: localStorage.getItem('neon_planner_font_size') || '16',
          dateSize: localStorage.getItem('neon_planner_date_size') || '14',
          bgHue: localStorage.getItem('neon_planner_bg_hue') || '0',
          bgIntensity: localStorage.getItem('neon_planner_bg_intensity') || '0',
          accentColor: localStorage.getItem('neon_planner_accent_color') || 'indigo',
          accentIntensity: localStorage.getItem('neon_planner_accent_intensity') || '100',
          showCalendar: localStorage.getItem('neon_planner_show_calendar') || 'true',
          showTodos: localStorage.getItem('neon_planner_show_todos') || 'true',
          showRecords: localStorage.getItem('neon_planner_show_records') || 'true',
          showAnalytics: localStorage.getItem('neon_planner_show_analytics') || 'false',
          showSearch: localStorage.getItem('neon_planner_show_search') || 'true',
          buttonOrder: localStorage.getItem('neon_planner_button_order') || ''
        },
        lastModified: parseInt(localStorage.getItem('neon_planner_last_modified') || '0', 10)
      };

      const searchUrl = "https://www.googleapis.com/drive/v3/files?q=name='neon_planner_backup.json'+and+trashed=false&spaces=appDataFolder&fields=files(id)";
      const searchRes = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${gdriveAccessToken}` }
      });
      
      if (searchRes.status === 401 || searchRes.status === 403) {
        if (statusBadge) {
          statusBadge.innerHTML = '⚠️ 세션 만료 <span style="text-decoration:underline;">(클릭하여 연장)</span>';
          statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
          statusBadge.style.color = '#ef4444';
          statusBadge.style.borderColor = '#ef4444';
          statusBadge.style.cursor = 'pointer';
          statusBadge.onclick = () => {
            const loginBtn = document.getElementById('btn-gdrive-login');
            if (loginBtn) loginBtn.click();
          };
        }
        throw new Error('Google Drive Token Expired');
      }

      const searchData = await searchRes.json();
      const existingFile = searchData.files && searchData.files[0];

      if (existingFile) {
        localStorage.setItem('neon_planner_gdrive_file_id', existingFile.id);
        const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media&fields=modifiedTime`;
        const updateRes = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${gdriveAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(backupData)
        });
        if (!updateRes.ok) throw new Error('파일 덮어쓰기 실패');
        const updateData = await updateRes.json();
        if (updateData.modifiedTime) {
          localStorage.setItem('neon_planner_gdrive_file_modifiedTime', updateData.modifiedTime);
        }
      } else {
        const boundary = 'neon_planner_multipart_boundary';
        const delimiter = `--${boundary}\r\n`;
        const nextDelimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const metadata = {
          name: 'neon_planner_backup.json',
          mimeType: 'application/json',
          parents: ['appDataFolder']
        };

        const parts = [
          delimiter,
          'Content-Type: application/json; charset=UTF-8\r\n\r\n',
          JSON.stringify(metadata),
          nextDelimiter,
          'Content-Type: application/json; charset=UTF-8\r\n\r\n',
          JSON.stringify(backupData),
          closeDelimiter
        ];

        const blob = new Blob(parts, { type: `multipart/related; boundary=${boundary}` });

        const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime';
        const createRes = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gdriveAccessToken}`
          },
          body: blob
        });
        if (!createRes.ok) {
          const errText = await createRes.text();
          throw new Error('새 파일 업로드 실패: ' + createRes.status + ' - ' + errText);
        }
        const createData = await createRes.json();
        if (createData.id) {
          localStorage.setItem('neon_planner_gdrive_file_id', createData.id);
        }
        if (createData.modifiedTime) {
          localStorage.setItem('neon_planner_gdrive_file_modifiedTime', createData.modifiedTime);
        }
      }

      if (statusBadge) {
        statusBadge.textContent = '연결 완료 (자동 동기화)';
        statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        statusBadge.style.color = '#10b981';
        statusBadge.style.borderColor = '#10b981';
      }
    } catch (err) {
      console.error('Google Drive Auto-sync failed:', err);
      if (statusBadge) {
        statusBadge.textContent = '⚠️ 동기화 실패';
        statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
        statusBadge.style.color = '#ef4444';
        statusBadge.style.borderColor = '#ef4444';
      }
    }
  }, 500); // 0.5초 디바운스로 즉각적인 업로드 반영
}

async function performAutoRestoreAndBackup() {
  try {
    const searchUrl = "https://www.googleapis.com/drive/v3/files?q=name='neon_planner_backup.json'+and+trashed=false&spaces=appDataFolder&fields=files(id)";
    const searchRes = await fetch(searchUrl, { headers: { 'Authorization': `Bearer ${gdriveAccessToken}` } });
    if (searchRes.status === 401 || searchRes.status === 403) throw new Error('Auth Expired');
    const searchData = await searchRes.json();
    const existingFile = searchData.files && searchData.files[0];

    if (existingFile) {
      const contentUrl = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`;
      const contentRes = await fetch(contentUrl, { headers: { 'Authorization': `Bearer ${gdriveAccessToken}` } });
      if (contentRes.ok) {
        const restoreData = await contentRes.json();
        if (restoreData.todos) localStorage.setItem('neon_planner_todos', JSON.stringify(restoreData.todos));
        if (restoreData.diaries) localStorage.setItem('neon_planner_diaries', JSON.stringify(restoreData.diaries));
        if (restoreData.categories) localStorage.setItem('neon_planner_categories', JSON.stringify(restoreData.categories));
        if (restoreData.tabIcons) localStorage.setItem('neon_planner_tab_icons', JSON.stringify(restoreData.tabIcons));
        if (restoreData.appTitle) localStorage.setItem('neon_planner_app_title', restoreData.appTitle);
        if (restoreData.ddays) localStorage.setItem('neon_planner_ddays', JSON.stringify(restoreData.ddays));
        if (restoreData.routines) localStorage.setItem('neon_planner_routines', JSON.stringify(restoreData.routines));
        if (restoreData.routinesPopulatedDates) localStorage.setItem('neon_planner_populated_dates', JSON.stringify(restoreData.routinesPopulatedDates));
        if (restoreData.preferences) {
          const prefs = restoreData.preferences;
          if (prefs.theme) localStorage.setItem('neon_planner_theme', prefs.theme);
          if (prefs.fontSize) localStorage.setItem('neon_planner_font_size', prefs.fontSize);
          if (prefs.dateSize) localStorage.setItem('neon_planner_date_size', prefs.dateSize);
          if (prefs.bgHue) localStorage.setItem('neon_planner_bg_hue', prefs.bgHue);
          if (prefs.bgIntensity) localStorage.setItem('neon_planner_bg_intensity', prefs.bgIntensity);
          if (prefs.accentColor) localStorage.setItem('neon_planner_accent_color', prefs.accentColor);
          if (prefs.accentIntensity) localStorage.setItem('neon_planner_accent_intensity', prefs.accentIntensity);
          if (prefs.showCalendar) localStorage.setItem('neon_planner_show_calendar', prefs.showCalendar);
          if (prefs.showTodos) localStorage.setItem('neon_planner_show_todos', prefs.showTodos);
          if (prefs.showRecords) localStorage.setItem('neon_planner_show_records', prefs.showRecords);
          if (prefs.showAnalytics) localStorage.setItem('neon_planner_show_analytics', prefs.showAnalytics);
          if (prefs.showSearch) localStorage.setItem('neon_planner_show_search', prefs.showSearch);
          if (prefs.buttonOrder) localStorage.setItem('neon_planner_button_order', prefs.buttonOrder);
        }
        localStorage.setItem('neon_planner_last_modified', restoreData.lastModified ? restoreData.lastModified.toString() : Date.now().toString());
      }
    }

    triggerGDriveAutoSync();
    
    setTimeout(() => {
      alert('구글 연동 및 자동 복원/백업이 완료되었습니다. 변경사항 적용을 위해 새로고침합니다.');
      window.location.reload();
    }, 1500);

  } catch (e) {
    console.error('Auto restore/backup failed:', e);
    alert('구글 연동은 완료되었으나 자동 복원/백업 중 오류가 발생했습니다.');
    window.location.reload();
  }
}

function showSyncToast() {
  let toast = document.getElementById('sync-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sync-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '30px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(16, 185, 129, 0.95)';
    toast.style.color = '#fff';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '30px';
    toast.style.fontSize = '0.9rem';
    toast.style.fontWeight = '600';
    toast.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
    toast.style.zIndex = '99999';
    toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    toast.style.pointerEvents = 'none';
    document.body.appendChild(toast);
  }
  toast.innerHTML = '✨ 다른 기기의 변경사항이 화면에 반영되었습니다.';
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(-50%) translateY(20px)';
  
  // Trigger reflow
  void toast.offsetWidth;
  
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  
  if (toast.timeout) clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 4000);
}

async function autoSyncWithDrive() {
  const statusBadge = document.getElementById('gdrive-status-badge');
  try {
    // Do not update UI to 'Checking...' on every poll to keep it silent and seamless

    let existingFile = null;
    let fileId = localStorage.getItem('neon_planner_gdrive_file_id');

    if (fileId) {
      const getUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,modifiedTime`;
      const getRes = await fetch(getUrl, {
        headers: { 
          'Authorization': `Bearer ${gdriveAccessToken}`,
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });
      if (getRes.ok) {
        existingFile = await getRes.json();
      } else if (getRes.status === 404) {
        fileId = null;
        localStorage.removeItem('neon_planner_gdrive_file_id');
      }
    }

    if (!existingFile) {
      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='neon_planner_backup.json'+and+trashed=false&spaces=appDataFolder&fields=files(id,modifiedTime)`;
      const searchRes = await fetch(searchUrl, {
        headers: { 
          'Authorization': `Bearer ${gdriveAccessToken}`,
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });

      if (searchRes.status === 401 || searchRes.status === 403) {
        if (statusBadge) {
          statusBadge.innerHTML = '⚠️ 세션 만료 <span style="text-decoration:underline;">(클릭하여 연장)</span>';
          statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
          statusBadge.style.color = '#ef4444';
          statusBadge.style.borderColor = '#ef4444';
          statusBadge.style.cursor = 'pointer';
          statusBadge.onclick = () => {
            const loginBtn = document.getElementById('btn-gdrive-login');
            if (loginBtn) loginBtn.click();
          };
        }
        return;
      }

      const searchData = await searchRes.json();
      existingFile = searchData.files && searchData.files[0];
      if (existingFile) {
        localStorage.setItem('neon_planner_gdrive_file_id', existingFile.id);
      }
    }

    if (!existingFile) {
      triggerGDriveAutoSync();
      return;
    }

    const lastSeenTime = localStorage.getItem('neon_planner_gdrive_file_modifiedTime');
    if (existingFile.modifiedTime && existingFile.modifiedTime === lastSeenTime) {
      if (statusBadge && statusBadge.textContent !== '✨ 자동 복원 완료 (최신화)') {
        statusBadge.textContent = '연결 완료 (자동 동기화)';
        statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        statusBadge.style.color = '#10b981';
        statusBadge.style.borderColor = '#10b981';
      }
      return;
    }

    const contentUrl = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`;
    const contentRes = await fetch(contentUrl, {
      headers: { 
        'Authorization': `Bearer ${gdriveAccessToken}`,
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!contentRes.ok) throw new Error('백업 데이터 읽기 실패');
    const restoreData = await contentRes.json();
    
    if (existingFile.modifiedTime) {
      localStorage.setItem('neon_planner_gdrive_file_modifiedTime', existingFile.modifiedTime);
    }

    const driveModified = parseInt(restoreData.lastModified || '0', 10);
    const localModified = parseInt(localStorage.getItem('neon_planner_last_modified') || '0', 10);

    if (driveModified > localModified) {
      if (restoreData.todos) localStorage.setItem('neon_planner_todos', JSON.stringify(restoreData.todos));
      if (restoreData.diaries) localStorage.setItem('neon_planner_diaries', JSON.stringify(restoreData.diaries));
      if (restoreData.categories) localStorage.setItem('neon_planner_categories', JSON.stringify(restoreData.categories));
      if (restoreData.tabIcons) localStorage.setItem('neon_planner_tab_icons', JSON.stringify(restoreData.tabIcons));
      if (restoreData.appTitle) localStorage.setItem('neon_planner_app_title', restoreData.appTitle);
      if (restoreData.ddays) localStorage.setItem('neon_planner_ddays', JSON.stringify(restoreData.ddays));
      if (restoreData.routines) localStorage.setItem('neon_planner_routines', JSON.stringify(restoreData.routines));
      if (restoreData.routinesPopulatedDates) localStorage.setItem('neon_planner_populated_dates', JSON.stringify(restoreData.routinesPopulatedDates));
      
      if (restoreData.preferences) {
        const prefs = restoreData.preferences;
        if (prefs.theme) localStorage.setItem('neon_planner_theme', prefs.theme);
        if (prefs.fontSize) localStorage.setItem('neon_planner_font_size', prefs.fontSize);
        if (prefs.dateSize) localStorage.setItem('neon_planner_date_size', prefs.dateSize);
        if (prefs.bgHue) localStorage.setItem('neon_planner_bg_hue', prefs.bgHue);
        if (prefs.bgIntensity) localStorage.setItem('neon_planner_bg_intensity', prefs.bgIntensity);
        if (prefs.accentColor) localStorage.setItem('neon_planner_accent_color', prefs.accentColor);
        if (prefs.accentIntensity) localStorage.setItem('neon_planner_accent_intensity', prefs.accentIntensity);
        if (prefs.showCalendar) localStorage.setItem('neon_planner_show_calendar', prefs.showCalendar);
        if (prefs.showTodos) localStorage.setItem('neon_planner_show_todos', prefs.showTodos);
        if (prefs.showRecords) localStorage.setItem('neon_planner_show_records', prefs.showRecords);
        if (prefs.showAnalytics) localStorage.setItem('neon_planner_show_analytics', prefs.showAnalytics);
        if (prefs.showSearch) localStorage.setItem('neon_planner_show_search', prefs.showSearch);
        if (prefs.buttonOrder) localStorage.setItem('neon_planner_button_order', prefs.buttonOrder);
      }
      localStorage.setItem('neon_planner_last_modified', driveModified.toString());
      
      loadFromLocalStorage();
      updateUI();
      
      showSyncToast();
      
      if (statusBadge) {
        statusBadge.textContent = '✨ 자동 복원 완료 (최신화)';
        statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        statusBadge.style.color = '#10b981';
        statusBadge.style.borderColor = '#10b981';
        setTimeout(() => {
          statusBadge.textContent = '연결 완료 (자동 동기화)';
        }, 5000);
      }
    } else if (localModified > driveModified) {
      triggerGDriveAutoSync();
    } else {
      if (statusBadge) {
        statusBadge.textContent = '연결 완료 (자동 동기화)';
        statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        statusBadge.style.color = '#10b981';
        statusBadge.style.borderColor = '#10b981';
      }
    }
  } catch (err) {
    console.error('Auto sync check failed:', err);
    if (statusBadge) {
      statusBadge.textContent = '⚠️ 자동 동기화 확인 실패';
    }
  }
}

// Sort the header buttons in the DOM based on state.headerButtonOrder
function sortHeaderButtonsDOM() {
  const container = document.getElementById('header-buttons-list');
  if (!container) return;

  // Ensure 'search' is always at the beginning, and 'settings' is always at the end
  state.headerButtonOrder = state.headerButtonOrder.filter(id => id !== 'search' && id !== 'settings');
  state.headerButtonOrder.unshift('search');
  state.headerButtonOrder.push('settings');

  const order = state.headerButtonOrder;
  const buttonMap = {};
  Array.from(container.getElementsByClassName('header-toggle-btn')).forEach(btn => {
    const sectionId = btn.dataset.sectionId;
    if (sectionId) buttonMap[sectionId] = btn;
  });

  order.forEach(sectionId => {
    const btn = buttonMap[sectionId];
    if (btn) {
      container.appendChild(btn);
    }
  });
}

// Setup long-press drag-and-drop horizontal sorting for header buttons
function setupHeaderButtonsDraggable() {
  const container = document.getElementById('header-buttons-list');
  if (!container) return;

  const buttons = Array.from(container.getElementsByClassName('header-toggle-btn'));

  buttons.forEach(button => {
    // Exempt settings and search buttons from being draggable
    if (button.dataset.sectionId === 'settings' || button.dataset.sectionId === 'search') return;

    let pressTimer = null;
    let isDragging = false;
    let startX = 0;
    let draggedElement = null;

    const startDrag = (e, clientX) => {
      if (e.type === 'mousedown' && e.button !== 0) return;

      pressTimer = setTimeout(() => {
        isDragging = true;
        draggedElement = button;
        button.classList.add('dragging');
        startX = clientX;
        
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
      }, 300); // 300ms long press hold
    };

    const moveDrag = (clientX) => {
      if (!isDragging || !draggedElement) return;

      // Exclude settings and search buttons from sortable sibling calculations
      const siblings = Array.from(container.getElementsByClassName('header-toggle-btn'))
        .filter(el => el !== draggedElement && el.dataset.sectionId !== 'settings' && el.dataset.sectionId !== 'search');

      const nextSibling = siblings.find(sibling => {
        const rect = sibling.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        return clientX < center;
      });

      if (nextSibling) {
        if (draggedElement.nextSibling !== nextSibling) {
          container.insertBefore(draggedElement, nextSibling);
        }
      } else {
        // Insert before the settings button so settings button is locked on the far right
        const settingsBtn = document.getElementById('btn-toggle-control-panel');
        if (settingsBtn) {
          container.insertBefore(draggedElement, settingsBtn);
        } else {
          if (container.lastElementChild !== draggedElement) {
            container.appendChild(draggedElement);
          }
        }
      }
    };

    const endDrag = (e) => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }

      if (isDragging) {
        isDragging = false;
        button.classList.remove('dragging');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';

        // Save order
        const sortedButtons = Array.from(container.getElementsByClassName('header-toggle-btn'));
        state.headerButtonOrder = sortedButtons.map(btn => btn.dataset.sectionId);
        localStorage.setItem('neon_planner_button_order', JSON.stringify(state.headerButtonOrder));

        applyLayoutSectionOrder();
        
        e.stopPropagation();
        e.preventDefault();
        
        button.style.pointerEvents = 'none';
        setTimeout(() => {
          button.style.pointerEvents = '';
        }, 100);
      }
      draggedElement = null;
    };

    button.addEventListener('mousedown', (e) => startDrag(e, e.clientX));
    button.addEventListener('touchstart', (e) => {
      startDrag(e, e.touches[0].clientX);
    }, { passive: true });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) moveDrag(e.clientX);
    });

    document.addEventListener('touchmove', (e) => {
      if (isDragging) moveDrag(e.touches[0].clientX);
    }, { passive: false });

    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
  });
}

// Apply overall progress drilldown panel visibility
function applyDrilldownVisibility() {
  const panel = document.getElementById('overall-drilldown-panel');
  if (!panel) return;

  if (state.showDrilldown) {
    panel.classList.remove('hidden');
    updateDrilldownPanel();
  } else {
    panel.classList.add('hidden');
  }
}

// Update the category detailed timeline grid drilldown view (Category -> Task Name -> Date Tiles)
function updateDrilldownPanel() {
  const listContainer = document.getElementById('drilldown-categories-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  Object.keys(state.categories).forEach(catId => {
    const cat = state.categories[catId];
    
    // Find all unique task texts in this category
    const catTasks = new Set();
    Object.keys(state.todos).forEach(dk => {
      state.todos[dk].forEach(todo => {
        if (todo.category === catId && todo.text.trim()) {
          catTasks.add(todo.text.trim());
        }
      });
    });

    // Create Category Row
    const row = document.createElement('div');
    row.classList.add('drilldown-category-row');

    // Category Header
    const header = document.createElement('div');
    header.classList.add('drilldown-category-header');

    // Calculate category totals
    let catTotal = 0;
    let catCompleted = 0;
    Object.keys(state.todos).forEach(dk => {
      state.todos[dk].forEach(todo => {
        if (todo.category === catId) {
          catTotal++;
          if (todo.completed) catCompleted++;
        }
      });
    });
    const rate = catTotal > 0 ? Math.round((catCompleted / catTotal) * 100) : 0;

    const badge = document.createElement('span');
    badge.classList.add('drilldown-category-badge');
    badge.textContent = cat.label;
    badge.style.color = cat.color;
    badge.style.backgroundColor = hexToRgba(cat.color, 0.1);
    badge.style.border = `1px solid ${hexToRgba(cat.color, 0.25)}`;
    header.appendChild(badge);

    const rateLabel = document.createElement('span');
    rateLabel.classList.add('drilldown-category-rate');
    rateLabel.innerHTML = `성취율: <strong>${rate}%</strong> (${catCompleted}/${catTotal}개 완료)`;
    header.appendChild(rateLabel);

    row.appendChild(header);

    // List of tasks in this category
    if (catTasks.size === 0) {
      const empty = document.createElement('div');
      empty.classList.add('empty-state');
      empty.style.fontSize = '0.75rem';
      empty.textContent = '기록된 할 일이 없습니다.';
      row.appendChild(empty);
    } else {
      Array.from(catTasks).sort().forEach(taskText => {
        const occurrences = [];
        let completedCount = 0;
        
        Object.keys(state.todos).forEach(dk => {
          state.todos[dk].forEach(todo => {
            if (todo.category === catId && todo.text.trim().toLowerCase() === taskText.trim().toLowerCase()) {
              occurrences.push({
                dateKey: dk,
                completed: todo.completed
              });
              if (todo.completed) completedCount++;
            }
          });
        });

        occurrences.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        const taskRate = occurrences.length > 0 ? Math.round((completedCount / occurrences.length) * 100) : 0;

        const taskRow = document.createElement('div');
        taskRow.classList.add('drilldown-task-row');

        const taskInfo = document.createElement('div');
        taskInfo.classList.add('drilldown-task-info');

        const taskNameSpan = document.createElement('span');
        taskNameSpan.classList.add('drilldown-task-name');
        taskNameSpan.textContent = taskText;
        taskInfo.appendChild(taskNameSpan);

        const taskRateSpan = document.createElement('span');
        taskRateSpan.classList.add('drilldown-task-rate');
        taskRateSpan.innerHTML = `성공률: <strong>${taskRate}%</strong> (${completedCount}/${occurrences.length}회 완료)`;
        taskInfo.appendChild(taskRateSpan);

        taskRow.appendChild(taskInfo);

        const tilesContainer = document.createElement('div');
        tilesContainer.classList.add('drilldown-tiles');

        occurrences.forEach(occ => {
          const tile = document.createElement('div');
          tile.classList.add('tracker-tile');
          
          if (occ.completed) {
            tile.classList.add('completed');
          } else {
            tile.classList.add('pending');
          }

          const dateSpan = document.createElement('span');
          dateSpan.classList.add('tracker-tile-date');
          dateSpan.textContent = formatDateKeyToMonthDay(occ.dateKey);

          const statusSpan = document.createElement('span');
          statusSpan.classList.add('tracker-tile-status');
          statusSpan.textContent = occ.completed ? '완료' : '미완료';

          tile.appendChild(dateSpan);
          tile.appendChild(statusSpan);

          tile.style.cursor = 'pointer';
          tile.title = `${formatDateKeyToMonthDay(occ.dateKey)} 일정 관리로 이동`;
          tile.addEventListener('click', () => {
            state.selectedDate = occ.dateKey;
            populateRoutinesForDate(occ.dateKey);
            const cellDate = new Date(occ.dateKey);
            state.currentMonth = new Date(cellDate.getFullYear(), cellDate.getMonth(), 1);
            updateUI();
          });

          tilesContainer.appendChild(tile);
        });

        taskRow.appendChild(tilesContainer);
        row.appendChild(taskRow);
      });
    }

    listContainer.appendChild(row);
  });
}

// Apply completed/pending drilldown panels visibility
function applyCompletedPendingDrilldownVisibility() {
  const compPanel = document.getElementById('completed-drilldown-panel');
  const pendPanel = document.getElementById('pending-drilldown-panel');

  if (compPanel) {
    if (state.showCompletedDrilldown) {
      compPanel.classList.remove('hidden');
      updateCompletedDrilldownList();
    } else {
      compPanel.classList.add('hidden');
    }
  }

  if (pendPanel) {
    if (state.showPendingDrilldown) {
      pendPanel.classList.remove('hidden');
      updatePendingDrilldownList();
    } else {
      pendPanel.classList.add('hidden');
    }
  }
}

// Update the list of completed tasks grouped by date
function updateCompletedDrilldownList() {
  const listContainer = document.getElementById('drilldown-completed-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  const grouped = {};
  Object.keys(state.todos).forEach(dk => {
    const compTodos = state.todos[dk].filter(t => t.completed);
    if (compTodos.length > 0) {
      grouped[dk] = compTodos;
    }
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (sortedDates.length === 0) {
    listContainer.innerHTML = '<div class="empty-state">완료한 할 일이 아직 없습니다. 일정을 완수해 보세요!</div>';
    return;
  }

  sortedDates.forEach(dk => {
    const dateGroup = document.createElement('div');
    dateGroup.classList.add('drilldown-date-group');

    const dateHeader = document.createElement('div');
    dateHeader.classList.add('drilldown-date-header');
    dateHeader.textContent = `${formatDateKeyToMonthDay(dk)} (${getDayOfWeek(dk)})`;
    dateGroup.appendChild(dateHeader);

    const itemsContainer = document.createElement('div');
    itemsContainer.classList.add('drilldown-task-items-list');

    grouped[dk].forEach(todo => {
      const item = document.createElement('div');
      item.classList.add('drilldown-task-item', 'completed-task');
      
      const textSpan = document.createElement('span');
      textSpan.classList.add('drilldown-task-item-text');
      
      const cat = getCategory(todo.category);
      textSpan.innerHTML = `<span style="color:${cat.color}; font-weight:700; margin-right:8px">[${cat.label}]</span>${linkify(todo.text)}`;
      item.appendChild(textSpan);

      const statusSpan = document.createElement('span');
      statusSpan.classList.add('drilldown-task-item-status');
      statusSpan.textContent = '완료 ✓';
      item.appendChild(statusSpan);

      item.title = `${formatDateKeyToMonthDay(dk)} 일정 관리로 이동`;
      item.addEventListener('click', () => {
        state.selectedDate = dk;
        populateRoutinesForDate(dk);
        const cellDate = new Date(dk);
        state.currentMonth = new Date(cellDate.getFullYear(), cellDate.getMonth(), 1);
        updateUI();
      });

      itemsContainer.appendChild(item);
    });

    dateGroup.appendChild(itemsContainer);
    listContainer.appendChild(dateGroup);
  });
}

// Update the list of pending tasks grouped by date
function updatePendingDrilldownList() {
  const listContainer = document.getElementById('drilldown-pending-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  const grouped = {};
  Object.keys(state.todos).forEach(dk => {
    const pendTodos = state.todos[dk].filter(t => !t.completed);
    if (pendTodos.length > 0) {
      grouped[dk] = pendTodos;
    }
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (sortedDates.length === 0) {
    listContainer.innerHTML = '<div class="empty-state">남아있는 할 일이 없습니다! 대단해요.</div>';
    return;
  }

  sortedDates.forEach(dk => {
    const dateGroup = document.createElement('div');
    dateGroup.classList.add('drilldown-date-group');

    const dateHeader = document.createElement('div');
    dateHeader.classList.add('drilldown-date-header');
    dateHeader.textContent = `${formatDateKeyToMonthDay(dk)} (${getDayOfWeek(dk)})`;
    dateGroup.appendChild(dateHeader);

    const itemsContainer = document.createElement('div');
    itemsContainer.classList.add('drilldown-task-items-list');

    grouped[dk].forEach(todo => {
      const item = document.createElement('div');
      item.classList.add('drilldown-task-item', 'pending-task');
      
      const textSpan = document.createElement('span');
      textSpan.classList.add('drilldown-task-item-text');
      
      const cat = getCategory(todo.category);
      textSpan.innerHTML = `<span style="color:${cat.color}; font-weight:700; margin-right:8px">[${cat.label}]</span>${linkify(todo.text)}`;
      item.appendChild(textSpan);

      const statusSpan = document.createElement('span');
      statusSpan.classList.add('drilldown-task-item-status');
      statusSpan.textContent = '남음';
      item.appendChild(statusSpan);

      item.title = `${formatDateKeyToMonthDay(dk)} 일정 관리로 이동`;
      item.addEventListener('click', () => {
        state.selectedDate = dk;
        populateRoutinesForDate(dk);
        const cellDate = new Date(dk);
        state.currentMonth = new Date(cellDate.getFullYear(), cellDate.getMonth(), 1);
        updateUI();
      });

      itemsContainer.appendChild(item);
    });

    dateGroup.appendChild(itemsContainer);
    listContainer.appendChild(dateGroup);
  });
}

// Get Korean weekday text from date string
function getDayOfWeek(dateKey) {
  const d = new Date(dateKey);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return weekdays[d.getDay()] || '';
}

// Update and draw all graphs, summaries, and trackers in the analytics panel
function updateAnalytics() {
  const panel = document.getElementById('analytics-panel');
  if (!panel || panel.classList.contains('hidden')) return;

  // 1. Gather all tasks across all dates
  let totalCount = 0;
  let completedCount = 0;
  
  // To track completion by category
  const catTotals = {};
  const catCompletes = {};
  Object.keys(state.categories).forEach(catId => {
    catTotals[catId] = 0;
    catCompletes[catId] = 0;
  });

  // Track unique todo text
  const uniqueTodos = new Set();

  Object.keys(state.todos).forEach(dateKey => {
    state.todos[dateKey].forEach(todo => {
      totalCount++;
      if (todo.completed) completedCount++;

      // Category count
      const catId = todo.category;
      if (catTotals[catId] !== undefined) {
        catTotals[catId]++;
        if (todo.completed) {
          catCompletes[catId]++;
        }
      }

      // Collect unique todo text
      if (todo.text.trim()) {
        uniqueTodos.add(todo.text.trim());
      }
    });
  });

  // 2. Set overall stats
  const totalRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  const statsTotalRate = document.getElementById('stats-total-rate');
  const statsTotalProgress = document.getElementById('stats-total-progress');
  const statsCompletedCount = document.getElementById('stats-completed-count');
  const statsPendingCount = document.getElementById('stats-pending-count');

  if (statsTotalRate) statsTotalRate.textContent = `${totalRate}%`;
  if (statsTotalProgress) statsTotalProgress.style.width = `${totalRate}%`;
  if (statsCompletedCount) statsCompletedCount.textContent = completedCount;
  if (statsPendingCount) statsPendingCount.textContent = totalCount - completedCount;

  // 3. Draw Category Bar Chart
  const categoryBarChart = document.getElementById('category-bar-chart');
  if (categoryBarChart) {
    categoryBarChart.innerHTML = '';
    
    Object.keys(state.categories).forEach(catId => {
      const cat = state.categories[catId];
      const tot = catTotals[catId] || 0;
      const comp = catCompletes[catId] || 0;
      const rate = tot > 0 ? Math.round((comp / tot) * 100) : 0;

      const row = document.createElement('div');
      row.classList.add('chart-bar-row');

      const label = document.createElement('div');
      label.classList.add('chart-bar-label');
      label.textContent = cat.label;
      row.appendChild(label);

      const barWrapper = document.createElement('div');
      barWrapper.classList.add('chart-bar-wrapper');

      const barFill = document.createElement('div');
      barFill.classList.add('chart-bar-fill');
      barFill.style.width = `${rate}%`;
      barFill.style.backgroundColor = cat.color;
      barFill.style.boxShadow = `0 0 8px ${hexToRgba(cat.color, 0.5)}`;
      barWrapper.appendChild(barFill);
      row.appendChild(barWrapper);

      const valLabel = document.createElement('div');
      valLabel.classList.add('chart-bar-value');
      valLabel.textContent = `${rate}% (${comp}/${tot}개)`;
      row.appendChild(valLabel);

      categoryBarChart.appendChild(row);
    });
  }

  // 3.5 Update Routine Stats
  const routineStatsContainer = document.getElementById('routine-stats-container');
  if (routineStatsContainer) {
    routineStatsContainer.innerHTML = '';
    
    // Group routines by text
    const routineCounts = {};
    state.routines.forEach(r => {
      routineCounts[r.text] = { total: 0, completed: 0, category: r.category };
    });
    
    // Count occurrences in todos
    Object.keys(state.todos).forEach(dk => {
      state.todos[dk].forEach(todo => {
        if (todo.isRoutine && routineCounts[todo.text]) {
          routineCounts[todo.text].total++;
          if (todo.completed) {
            routineCounts[todo.text].completed++;
          }
        }
      });
    });

    if (state.routines.length === 0) {
      routineStatsContainer.innerHTML = '<div style="color:var(--text-muted); font-size: 0.85rem; font-style: italic;">아직 등록된 루틴이 없습니다.</div>';
    } else {
      Object.keys(routineCounts).forEach(rText => {
        const stats = routineCounts[rText];
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.background = 'rgba(255,255,255,0.03)';
        row.style.padding = '10px 14px';
        row.style.borderRadius = '8px';
        row.style.border = '1px solid var(--panel-border)';
        
        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.alignItems = 'center';
        left.style.gap = '8px';
        
        const cat = getCategory(stats.category);
        const dot = document.createElement('span');
        dot.style.display = 'inline-block';
        dot.style.width = '10px';
        dot.style.height = '10px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = cat.color;
        
        const label = document.createElement('span');
        label.style.fontWeight = '600';
        label.style.fontSize = '0.9rem';
        label.textContent = rText;
        
        left.appendChild(dot);
        left.appendChild(label);
        
        const right = document.createElement('div');
        right.style.fontWeight = '700';
        right.style.color = 'var(--accent-color)';
        right.style.fontSize = '1rem';
        right.textContent = `총 ${stats.completed}회 완료`;
        
        row.appendChild(left);
        row.appendChild(right);
        routineStatsContainer.appendChild(row);
      });
    }
  }

  // 4. Update Todo Tracker Selector List
  const trackerSelect = document.getElementById('tracker-todo-select');
  if (trackerSelect) {
    const previousSelection = trackerSelect.value;
    trackerSelect.innerHTML = '';

    const sortedTodos = Array.from(uniqueTodos).sort();
    
    if (sortedTodos.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '(등록된 할 일이 없습니다)';
      trackerSelect.appendChild(opt);
    } else {
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '-- 할 일을 선택하세요 --';
      trackerSelect.appendChild(defaultOpt);

      sortedTodos.forEach(text => {
        const opt = document.createElement('option');
        opt.value = text;
        opt.textContent = text;
        trackerSelect.appendChild(opt);
      });
    }

    if (uniqueTodos.has(previousSelection)) {
      trackerSelect.value = previousSelection;
    }
  }

  updateSelectedTodoTracker();
  applyDrilldownVisibility();
  applyCompletedPendingDrilldownVisibility();
}

// Draw the specific timeline history for the selected todo item
function updateSelectedTodoTracker() {
  const trackerSelect = document.getElementById('tracker-todo-select');
  const summaryText = document.getElementById('todo-tracker-summary-text');
  const historyGrid = document.getElementById('tracker-history-grid');

  if (!trackerSelect || !summaryText || !historyGrid) return;

  const selectedText = trackerSelect.value;
  if (!selectedText) {
    summaryText.textContent = '할 일을 선택하시면 완료 기록 분석이 나타납니다.';
    historyGrid.innerHTML = '';
    return;
  }

  const occurrences = [];
  let completedOccur = 0;

  Object.keys(state.todos).forEach(dk => {
    state.todos[dk].forEach(todo => {
      if (todo.text.trim().toLowerCase() === selectedText.trim().toLowerCase()) {
        occurrences.push({
          dateKey: dk,
          completed: todo.completed
        });
        if (todo.completed) completedOccur++;
      }
    });
  });

  occurrences.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const totalOccur = occurrences.length;
  const todoRate = totalOccur > 0 ? Math.round((completedOccur / totalOccur) * 100) : 0;

  summaryText.innerHTML = `🎯 <strong>"${selectedText}"</strong> 성취율: <span style="color:var(--accent-color); text-shadow:0 0 5px var(--accent-glow)">${todoRate}%</span> (총 ${totalOccur}회 중 ${completedOccur}회 완료)`;

  historyGrid.innerHTML = '';
  if (occurrences.length === 0) {
    historyGrid.innerHTML = '<div class="empty-state">해당 항목에 매칭되는 이력이 없습니다.</div>';
    return;
  }

  occurrences.forEach(occ => {
    const tile = document.createElement('div');
    tile.classList.add('tracker-tile');
    
    if (occ.completed) {
      tile.classList.add('completed');
    } else {
      tile.classList.add('pending');
    }

    const dateSpan = document.createElement('span');
    dateSpan.classList.add('tracker-tile-date');
    dateSpan.textContent = formatDateKeyToMonthDay(occ.dateKey);

    const statusSpan = document.createElement('span');
    statusSpan.classList.add('tracker-tile-status');
    statusSpan.textContent = occ.completed ? '완료' : '미완료';

    tile.appendChild(dateSpan);
    tile.appendChild(statusSpan);

    tile.style.cursor = 'pointer';
    tile.title = `${formatDateKeyToMonthDay(occ.dateKey)} 일정 관리로 이동`;
    tile.addEventListener('click', () => {
      state.selectedDate = occ.dateKey;
      populateRoutinesForDate(occ.dateKey);
      const cellDate = new Date(occ.dateKey);
      state.currentMonth = new Date(cellDate.getFullYear(), cellDate.getMonth(), 1);
      updateUI();
    });

    historyGrid.appendChild(tile);
  });
}

// Apply Schedule Clear Mode Visual Indicators
function applyClearMode() {
  const btnClearMode = document.getElementById('btn-clear-mode');
  const calendarGrid = document.getElementById('calendar-grid');

  if (state.clearMode) {
    btnClearMode.classList.add('active');
    calendarGrid.classList.add('clear-mode-active');
  } else {
    btnClearMode.classList.remove('active');
    calendarGrid.classList.remove('clear-mode-active');
  }
}

// History Management: Push snapshot of state
function pushToHistory() {
  const snapshot = {
    todos: JSON.parse(JSON.stringify(state.todos)),
    routines: JSON.parse(JSON.stringify(state.routines)),
    categories: JSON.parse(JSON.stringify(state.categories)),
    diaries: JSON.parse(JSON.stringify(state.diaries || {})),
    ddays: JSON.parse(JSON.stringify(state.ddays || [])),
    routinesPopulatedDates: JSON.parse(JSON.stringify(state.routinesPopulatedDates || {}))
  };
  undoStack.push(snapshot);

  if (undoStack.length > 50) {
    undoStack.shift();
  }

  redoStack = [];
  updateHistoryButtons();
}

function updateHistoryButtons() {
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');

  if (btnUndo) btnUndo.disabled = undoStack.length === 0;
  if (btnRedo) btnRedo.disabled = redoStack.length === 0;
}

function handleUndo() {
  if (undoStack.length === 0) return;

  const currentSnapshot = {
    todos: JSON.parse(JSON.stringify(state.todos)),
    routines: JSON.parse(JSON.stringify(state.routines)),
    categories: JSON.parse(JSON.stringify(state.categories)),
    diaries: JSON.parse(JSON.stringify(state.diaries || {})),
    ddays: JSON.parse(JSON.stringify(state.ddays || [])),
    routinesPopulatedDates: JSON.parse(JSON.stringify(state.routinesPopulatedDates || {}))
  };
  redoStack.push(currentSnapshot);

  const previousSnapshot = undoStack.pop();
  state.todos = previousSnapshot.todos;
  state.routines = previousSnapshot.routines;
  if (previousSnapshot.categories) {
    state.categories = previousSnapshot.categories;
    saveCategories();
  }
  if (previousSnapshot.diaries) {
    state.diaries = previousSnapshot.diaries;
    saveDiaries();
  }
  if (previousSnapshot.ddays) {
    state.ddays = previousSnapshot.ddays;
    saveDdays();
  }
  if (previousSnapshot.routinesPopulatedDates) {
    state.routinesPopulatedDates = previousSnapshot.routinesPopulatedDates;
    saveRoutinesPopulatedDates();
  }

  saveTodos();
  saveRoutines();
  updateHistoryButtons();
  updateUI();
  if (state.showTimeline && typeof renderTimeline === 'function') renderTimeline();
  if (state.showDdays && typeof renderDdays === 'function') renderDdays();
}

function handleRedo() {
  if (redoStack.length === 0) return;

  const currentSnapshot = {
    todos: JSON.parse(JSON.stringify(state.todos)),
    routines: JSON.parse(JSON.stringify(state.routines)),
    categories: JSON.parse(JSON.stringify(state.categories)),
    diaries: JSON.parse(JSON.stringify(state.diaries || {})),
    ddays: JSON.parse(JSON.stringify(state.ddays || [])),
    routinesPopulatedDates: JSON.parse(JSON.stringify(state.routinesPopulatedDates || {}))
  };
  undoStack.push(currentSnapshot);

  const nextSnapshot = redoStack.pop();
  state.todos = nextSnapshot.todos;
  state.routines = nextSnapshot.routines;
  if (nextSnapshot.categories) {
    state.categories = nextSnapshot.categories;
    saveCategories();
  }
  if (nextSnapshot.diaries) {
    state.diaries = nextSnapshot.diaries;
    saveDiaries();
  }
  if (nextSnapshot.ddays) {
    state.ddays = nextSnapshot.ddays;
    saveDdays();
  }
  if (nextSnapshot.routinesPopulatedDates) {
    state.routinesPopulatedDates = nextSnapshot.routinesPopulatedDates;
    saveRoutinesPopulatedDates();
  }

  saveTodos();
  saveRoutines();
  updateHistoryButtons();
  updateUI();
  if (state.showTimeline && typeof renderTimeline === 'function') renderTimeline();
  if (state.showDdays && typeof renderDdays === 'function') renderDdays();
}

// Automatically move unfinished past tasks to today
function rolloverUnfinishedTodos() {
  const todayStr = formatDateString(new Date());
  const pastDates = Object.keys(state.todos).filter(date => date < todayStr);

  let rolledCount = 0;
  pastDates.forEach(date => {
    // Only roll over non-routine tasks or unfinished ones to prevent daily routine duplicates
    const unfinished = state.todos[date].filter(todo => !todo.completed && !todo.isRoutine);
    
    if (unfinished.length > 0) {
      if (!state.todos[todayStr]) {
        state.todos[todayStr] = [];
      }
      
      unfinished.forEach(todo => {
        state.todos[todayStr].push({
          ...todo,
          rolledFrom: date
        });
        rolledCount++;
      });

      // Filter out rolled over items from the past date so they don't show twice
      state.todos[date] = state.todos[date].filter(todo => todo.completed || todo.isRoutine);
      if (state.todos[date].length === 0) {
        delete state.todos[date];
      }
    }
  });

  if (rolledCount > 0) {
    saveTodos();
  }
}

// Populate today/selected date with active routines
function populateRoutinesForDate(dateKey, force = false) {
  if (state.routines.length === 0) return;
  if (!force && state.routinesPopulatedDates[dateKey]) return;

  if (!state.todos[dateKey]) {
    state.todos[dateKey] = [];
  }

  state.routines.forEach(routine => {
    // Check Date Constraints
    if (routine.startDate && dateKey < routine.startDate) return;
    if (routine.endDate && dateKey > routine.endDate) return;

    // Check if it already exists to prevent duplicate insertion
    const exists = state.todos[dateKey].some(t => t.text === routine.text && t.isRoutine);
    if (!exists) {
      state.todos[dateKey].push({
        id: Date.now() + Math.random(),
        text: routine.text,
        category: routine.category,
        completed: false,
        isRoutine: true,
        createdAt: Date.now(),
        customOrder: Date.now() + Math.random()
      });
    }
  });

  state.routinesPopulatedDates[dateKey] = true;
  saveTodos();
  saveRoutinesPopulatedDates();
}

function setupEventListeners() {
  // Theme Toggles
  const btnThemeDark = document.getElementById('btn-theme-dark');
  const btnThemeLight = document.getElementById('btn-theme-light');
  if (btnThemeDark && btnThemeLight) {
    btnThemeDark.addEventListener('click', () => {
      state.theme = 'dark';
      localStorage.setItem('neon_planner_theme', 'dark');
      applyPreferences();
    });
    btnThemeLight.addEventListener('click', () => {
      state.theme = 'light';
      localStorage.setItem('neon_planner_theme', 'light');
      applyPreferences();
    });
  }

  // Link Navigation Toggles
  const btnLinkEnable = document.getElementById('btn-link-enable');
  const btnLinkDisable = document.getElementById('btn-link-disable');
  if (btnLinkEnable && btnLinkDisable) {
    btnLinkEnable.addEventListener('click', () => {
      state.allowLinkNavigation = true;
      localStorage.setItem('neon_planner_allow_link_navigation', 'true');
      applyPreferences();
      updateUI();
    });
    btnLinkDisable.addEventListener('click', () => {
      state.allowLinkNavigation = false;
      localStorage.setItem('neon_planner_allow_link_navigation', 'false');
      applyPreferences();
      updateUI();
    });
  }

  // History Controls Toggles
  const btnHistoryEnable = document.getElementById('btn-history-enable');
  const btnHistoryDisable = document.getElementById('btn-history-disable');
  if (btnHistoryEnable && btnHistoryDisable) {
    btnHistoryEnable.addEventListener('click', () => {
      state.showHistoryControls = true;
      localStorage.setItem('neon_planner_show_history_controls', 'true');
      applyPreferences();
    });
    btnHistoryDisable.addEventListener('click', () => {
      state.showHistoryControls = false;
      localStorage.setItem('neon_planner_show_history_controls', 'false');
      applyPreferences();
      const historyControls = document.getElementById('floating-history-controls');
      if (historyControls) historyControls.classList.remove('visible');
    });
  }

  // Background Color Preset Buttons
  const presetBtns = Array.from(document.querySelectorAll('.bg-preset-btn'));
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.bgHue = parseInt(btn.dataset.hue, 10);
      localStorage.setItem('neon_planner_bg_hue', state.bgHue);
      applyPreferences();
    });
  });

  // Background Intensity Slider
  const bgIntensitySlider = document.getElementById('bg-intensity-slider');
  if (bgIntensitySlider) {
    bgIntensitySlider.addEventListener('input', () => {
      state.bgIntensity = parseInt(bgIntensitySlider.value, 10);
      localStorage.setItem('neon_planner_bg_intensity', state.bgIntensity);
      applyPreferences();
    });
  }

  // Point Accent Color Preset Buttons
  const accentBtns = Array.from(document.querySelectorAll('.accent-preset-btn'));
  accentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.accentTheme = btn.dataset.accent;
      localStorage.setItem('neon_planner_accent_theme', state.accentTheme);
      applyPreferences();
    });
  });

  // Accent Intensity Slider
  const accentIntensitySlider = document.getElementById('accent-intensity-slider');
  if (accentIntensitySlider) {
    accentIntensitySlider.addEventListener('input', () => {
      state.accentIntensity = parseInt(accentIntensitySlider.value, 10);
      localStorage.setItem('neon_planner_accent_intensity', state.accentIntensity);
      applyPreferences();
    });
  }

  // Device Preview Toggles
  btnPcView.addEventListener('click', () => {
    state.device = 'pc';
    localStorage.setItem('neon_planner_device', 'pc');
    applyPreferences();
  });

  btnPhoneView.addEventListener('click', () => {
    state.device = 'phone';
    localStorage.setItem('neon_planner_device', 'phone');
    applyPreferences();
  });

  // Font Size Slider (Mobile Panel)
  fontSizeSlider.addEventListener('input', () => {
    state.fontSize = parseInt(fontSizeSlider.value, 10);
    localStorage.setItem('neon_planner_font_size', state.fontSize);
    applyPreferences();
  });

  // Font Size Slider (PC Modal)
  const modalFontSizeSliderEl = document.getElementById('modal-font-size-slider');
  if (modalFontSizeSliderEl) {
    modalFontSizeSliderEl.addEventListener('input', () => {
      state.fontSize = parseInt(modalFontSizeSliderEl.value, 10);
      localStorage.setItem('neon_planner_font_size', state.fontSize);
      applyPreferences();
    });
  }

  // Date Size Slider (Mobile Panel)
  const dateSizeSlider = document.getElementById('date-size-slider');
  if (dateSizeSlider) {
    dateSizeSlider.addEventListener('input', () => {
      state.dateSize = parseInt(dateSizeSlider.value, 10);
      localStorage.setItem('neon_planner_date_size', state.dateSize);
      applyPreferences();
    });
  }

  // Date Size Slider (PC Modal)
  const modalDateSizeSliderEl = document.getElementById('modal-date-size-slider');
  if (modalDateSizeSliderEl) {
    modalDateSizeSliderEl.addEventListener('input', () => {
      state.dateSize = parseInt(modalDateSizeSliderEl.value, 10);
      localStorage.setItem('neon_planner_date_size', state.dateSize);
      applyPreferences();
    });
  }

  // Open Font Size Modal Button (PC)
  const btnOpenFontSizeModal = document.getElementById('btn-open-font-size-modal');
  const fontSizeModal = document.getElementById('font-size-modal');
  if (btnOpenFontSizeModal && fontSizeModal) {
    btnOpenFontSizeModal.addEventListener('click', () => {
      fontSizeModal.classList.remove('hidden');
    });
  }

  // Close Font Size Modal Button
  const btnCloseFontSizeModal = document.getElementById('btn-font-size-modal-close');
  if (btnCloseFontSizeModal && fontSizeModal) {
    btnCloseFontSizeModal.addEventListener('click', () => {
      fontSizeModal.classList.add('hidden');
    });
  }

  // Font Size Modal Backdrop
  const fontSizeModalBackdrop = document.getElementById('font-size-modal-backdrop');
  if (fontSizeModalBackdrop && fontSizeModal) {
    fontSizeModalBackdrop.addEventListener('click', () => {
      fontSizeModal.classList.add('hidden');
    });
  }

  // Custom App Title Input Listener
  const customTitleInput = document.getElementById('custom-app-title-input');
  if (customTitleInput) {
    customTitleInput.addEventListener('input', () => {
      state.appTitle = customTitleInput.value;
      localStorage.setItem('neon_planner_app_title', state.appTitle);
      updateUI();
    });
  }

  // Centered Tab Emoji Picker Modal binding
  const emojiModal = document.getElementById('tab-emoji-picker-modal');
  const emojiBackdrop = document.getElementById('emoji-picker-backdrop');
  const emojiCancelBtn = document.getElementById('btn-emoji-picker-cancel');
  const emojiApplyBtn = document.getElementById('btn-emoji-picker-apply');
  const btnOpenTabIconsModal = document.getElementById('btn-open-tab-icons-modal');

  const closeEmojiModal = () => {
    if (emojiModal) emojiModal.classList.add('hidden');
  };

  if (emojiCancelBtn) emojiCancelBtn.addEventListener('click', closeEmojiModal);
  if (emojiBackdrop) emojiBackdrop.addEventListener('click', closeEmojiModal);

  if (btnOpenTabIconsModal) {
    btnOpenTabIconsModal.addEventListener('click', () => {
      if (!emojiModal) return;

      const searchInput = document.getElementById('modal-input-search');
      const calendarInput = document.getElementById('modal-input-calendar');
      const todosInput = document.getElementById('modal-input-todos');
      const recordsInput = document.getElementById('modal-input-records');
      const analyticsInput = document.getElementById('modal-input-analytics');
      const settingsInput = document.getElementById('modal-input-settings');

      if (searchInput) searchInput.value = state.tabIcons.search || '';
      if (calendarInput) calendarInput.value = state.tabIcons.calendar || '';
      if (todosInput) todosInput.value = state.tabIcons.todos || '';
      if (recordsInput) recordsInput.value = state.tabIcons.records || '';
      if (analyticsInput) analyticsInput.value = state.tabIcons.analytics || '';
      if (settingsInput) settingsInput.value = state.tabIcons.settings || '';

      emojiModal.classList.remove('hidden');
    });
  }

  const bindPresetClicksForModal = () => {
    const presetWrappers = document.querySelectorAll('.modal-row-presets');
    presetWrappers.forEach(wrapper => {
      const targetInputId = wrapper.dataset.inputId;
      const targetInput = document.getElementById(targetInputId);
      if (targetInput) {
        const presets = wrapper.querySelectorAll('.emoji-preset-btn-item');
        presets.forEach(btn => {
          btn.addEventListener('click', () => {
            targetInput.value = btn.textContent.trim();
          });
        });
      }
    });
  };
  
  bindPresetClicksForModal();

  if (emojiApplyBtn) {
    emojiApplyBtn.addEventListener('click', () => {
      const searchInput = document.getElementById('modal-input-search');
      const calendarInput = document.getElementById('modal-input-calendar');
      const todosInput = document.getElementById('modal-input-todos');
      const recordsInput = document.getElementById('modal-input-records');
      const analyticsInput = document.getElementById('modal-input-analytics');
      const settingsInput = document.getElementById('modal-input-settings');

      if (searchInput) state.tabIcons.search = searchInput.value;
      if (calendarInput) state.tabIcons.calendar = calendarInput.value;
      if (todosInput) state.tabIcons.todos = todosInput.value;
      if (recordsInput) state.tabIcons.records = recordsInput.value;
      if (analyticsInput) state.tabIcons.analytics = analyticsInput.value;
      if (settingsInput) state.tabIcons.settings = settingsInput.value;

      localStorage.setItem('neon_planner_tab_icons', JSON.stringify(state.tabIcons));
      updateUI();
      closeEmojiModal();
    });
  }

  // Menu Toggle via Planner Title (Global)
  const headerLogo = document.querySelector('.header-logo');
  const headerControls = document.getElementById('header-buttons-list');
  if (headerLogo && headerControls) {
    headerLogo.style.cursor = 'pointer';
    headerLogo.title = '메뉴 열기/닫기';
    headerLogo.addEventListener('click', () => {
      headerControls.classList.toggle('show');
    });
  }

  // Calendar Toggle Button
  const btnToggleCalendar = document.getElementById('btn-toggle-calendar');
  btnToggleCalendar.addEventListener('click', () => {
    state.showCalendar = !state.showCalendar;
    localStorage.setItem('neon_planner_show_calendar', state.showCalendar);
    applyCalendarVisibility();
    applyLayoutSectionOrder();
    updateUI();
  });

  // Search Toggle Button
  const btnToggleSearch = document.getElementById('btn-toggle-search');
  if (btnToggleSearch) {
    btnToggleSearch.addEventListener('click', () => {
      state.showSearch = !state.showSearch;
      localStorage.setItem('neon_planner_show_search', state.showSearch);
      applySearchVisibility();
      updateUI();
    });
  }

  // Schedule Clear Mode Button
  const btnClearMode = document.getElementById('btn-clear-mode');
  btnClearMode.addEventListener('click', () => {
    state.clearMode = !state.clearMode;
    applyClearMode();
  });

  // Undo/Redo Buttons
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');

  if (btnUndo) {
    btnUndo.addEventListener('click', handleUndo);
  }
  if (btnRedo) {
    btnRedo.addEventListener('click', handleRedo);
  }

  // Month Navigation
  prevMonthBtn.addEventListener('click', () => {
    state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
    renderCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
    state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
    renderCalendar();
  });

  todayBtn.addEventListener('click', () => {
    const today = new Date();
    state.selectedDate = formatDateString(today);
    state.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    populateRoutinesForDate(state.selectedDate);
    updateUI();
  });
  // Global Search Input Listeners (with Search Lookup Button)
  const searchInput = document.getElementById('global-search-input');
  const clearSearchBtn = document.getElementById('btn-clear-search');
  const searchLookupBtn = document.getElementById('btn-search-lookup');
  const closeSearchResultsBtn = document.getElementById('btn-close-search-results');

  const executeSearchLookup = () => {
    if (!searchInput) return;
    state.searchQuery = searchInput.value;
    if (state.searchQuery.trim() !== '') {
      if (clearSearchBtn) clearSearchBtn.style.display = 'block';
      if (!state.showTodos) {
        state.showTodos = true;
        localStorage.setItem('neon_planner_show_todos', 'true');
      }
      if (!state.showRecords) {
        state.showRecords = true;
        localStorage.setItem('neon_planner_show_records', 'true');
      }
    } else {
      if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    }
    updateUI();
  };

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchInput.value.trim() !== '' ? 'block' : 'none';
      }
      if (searchInput.value.trim() === '') {
        clearSearchState();
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        executeSearchLookup();
      }
    });
  }

  if (searchLookupBtn) {
    searchLookupBtn.addEventListener('click', executeSearchLookup);
  }

  const clearSearchState = () => {
    if (searchInput) searchInput.value = '';
    state.searchQuery = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';

    // Smoothly scroll back to the search input field
    if (searchInput) {
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Collapse any sections that were auto-opened by clicking search results
    if (searchAutoOpenedSections.length > 0) {
      searchAutoOpenedSections.forEach(sec => {
        if (sec === 'calendar') {
          state.showCalendar = false;
          localStorage.setItem('neon_planner_show_calendar', 'false');
        } else if (sec === 'todos') {
          state.showTodos = false;
          localStorage.setItem('neon_planner_show_todos', 'false');
        } else if (sec === 'records') {
          state.showRecords = false;
          localStorage.setItem('neon_planner_show_records', 'false');
        } else if (sec === 'analytics') {
          state.showAnalytics = false;
          localStorage.setItem('neon_planner_show_analytics', 'false');
        } else if (sec === 'settings') {
          state.showControlPanel = false;
          localStorage.setItem('neon_planner_show_control_panel', 'false');
        }
      });
      searchAutoOpenedSections = [];
    }

    updateUI();
  };

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', clearSearchState);
  }

  if (closeSearchResultsBtn) {
    closeSearchResultsBtn.addEventListener('click', clearSearchState);
  }
  // Category Form Inputs
  const newCatName = document.getElementById('new-cat-name');
  if (newCatName) {
    newCatName.addEventListener('input', updateCategoryPreview);
  }

  const newCatColor = document.getElementById('new-cat-color');
  const newCatHue = document.getElementById('new-cat-hue');
  const newCatLightness = document.getElementById('new-cat-lightness');

  if (newCatColor) {
    newCatColor.addEventListener('input', () => {
      document.querySelectorAll('.preset-color-dot').forEach(el => el.classList.remove('active'));
      const hsl = hexToHsl(newCatColor.value);
      if (newCatHue) newCatHue.value = hsl.h;
      if (newCatLightness) newCatLightness.value = hsl.l;
      updateCategoryPreview();
    });
  }

  if (newCatHue) {
    newCatHue.addEventListener('input', () => {
      document.querySelectorAll('.preset-color-dot').forEach(el => el.classList.remove('active'));
      const lightnessVal = newCatLightness ? parseInt(newCatLightness.value, 10) : 60;
      const color = hslToHex(parseInt(newCatHue.value, 10), 85, lightnessVal);
      if (newCatColor) newCatColor.value = color;
      updateCategoryPreview();
    });
  }

  if (newCatLightness) {
    newCatLightness.addEventListener('input', () => {
      document.querySelectorAll('.preset-color-dot').forEach(el => el.classList.remove('active'));
      const hueVal = newCatHue ? parseInt(newCatHue.value, 10) : 270;
      const color = hslToHex(hueVal, 85, parseInt(newCatLightness.value, 10));
      if (newCatColor) newCatColor.value = color;
      updateCategoryPreview();
    });
  }

  // Category Form Actions
  const btnSaveCategory = document.getElementById('btn-save-category');
  if (btnSaveCategory) {
    btnSaveCategory.addEventListener('click', handleSaveCategory);
  }

  const btnCancelCategory = document.getElementById('btn-cancel-category');
  if (btnCancelCategory) {
    btnCancelCategory.addEventListener('click', () => toggleCategoryForm(false));
  }

  // Collapse Control Panel Toggle Button
  const btnToggleControlPanel = document.getElementById('btn-toggle-control-panel');
  if (btnToggleControlPanel) {
    btnToggleControlPanel.addEventListener('click', () => {
      state.showControlPanel = !state.showControlPanel;
      localStorage.setItem('neon_planner_show_control_panel', state.showControlPanel);
      applyControlPanelVisibility();
    });
  }

  // Copy Mode Exit Button
  const btnExitCopy = document.getElementById('btn-exit-copy-mode');
  if (btnExitCopy) {
    btnExitCopy.addEventListener('click', () => {
      state.copyingTodoId = null;
      updateUI();
    });
  }

  // Analytics Panel Toggle Button
  const btnToggleAnalytics = document.getElementById('btn-toggle-analytics');
  if (btnToggleAnalytics) {
    btnToggleAnalytics.addEventListener('click', () => {
      state.showAnalytics = !state.showAnalytics;
      localStorage.setItem('neon_planner_show_analytics', state.showAnalytics);
      applyAnalyticsVisibility();
      applyLayoutSectionOrder();
      updateUI();
    });
  }

  const btnToggleRoutines = document.getElementById('btn-toggle-routines');
  if (btnToggleRoutines) {
    btnToggleRoutines.addEventListener('click', () => {
      state.showRoutines = !state.showRoutines;
      localStorage.setItem('neon_planner_show_routines', state.showRoutines);
      applyRoutinesVisibility();
      applyLayoutSectionOrder();
      updateUI();
    });
  }

  const btnToggleTimeline = document.getElementById('btn-toggle-timeline');
  if (btnToggleTimeline) {
    btnToggleTimeline.addEventListener('click', () => {
      state.showTimeline = !state.showTimeline;
      localStorage.setItem('neon_planner_show_timeline', state.showTimeline);
      applyTimelineVisibility();
      applyLayoutSectionOrder();
      updateUI();
    });
  }

  // D-days Panel Toggle Button
  const btnToggleDdays = document.getElementById('btn-toggle-ddays');
  if (btnToggleDdays) {
    btnToggleDdays.addEventListener('click', () => {
      state.showDdays = !state.showDdays;
      localStorage.setItem('neon_planner_show_ddays', state.showDdays);
      applyDdaysVisibility();
      applyLayoutSectionOrder();
      updateUI();
    });
  }

  // Drilldown Toggle click on Overall Rate Card
  const statsCardOverall = document.getElementById('stats-card-overall');
  if (statsCardOverall) {
    statsCardOverall.addEventListener('click', () => {
      state.showDrilldown = !state.showDrilldown;
      if (state.showDrilldown) {
        state.showCompletedDrilldown = false;
        state.showPendingDrilldown = false;
      }
      applyDrilldownVisibility();
      applyCompletedPendingDrilldownVisibility();
    });
  }

  // Drilldown Toggle click on Completed Tasks Card
  const statsCardCompleted = document.getElementById('stats-card-completed');
  if (statsCardCompleted) {
    statsCardCompleted.addEventListener('click', () => {
      state.showCompletedDrilldown = !state.showCompletedDrilldown;
      if (state.showCompletedDrilldown) {
        state.showDrilldown = false;
        state.showPendingDrilldown = false;
      }
      applyDrilldownVisibility();
      applyCompletedPendingDrilldownVisibility();
    });
  }

  // Drilldown Toggle click on Pending Tasks Card
  const statsCardPending = document.getElementById('stats-card-pending');
  if (statsCardPending) {
    statsCardPending.addEventListener('click', () => {
      state.showPendingDrilldown = !state.showPendingDrilldown;
      if (state.showPendingDrilldown) {
        state.showDrilldown = false;
        state.showCompletedDrilldown = false;
      }
      applyDrilldownVisibility();
      applyCompletedPendingDrilldownVisibility();
    });
  }

  // Analytics Tab View Toggles
  const tabBtnCategories = document.getElementById('tab-btn-categories');
  const tabBtnTodos = document.getElementById('tab-btn-todos');
  const tabBtnRoutines = document.getElementById('tab-btn-routines');
  const viewCategories = document.getElementById('view-categories');
  const viewTodos = document.getElementById('view-todos');
  const viewRoutines = document.getElementById('view-routines');

  if (tabBtnCategories && tabBtnTodos && tabBtnRoutines && viewCategories && viewTodos && viewRoutines) {
    tabBtnCategories.addEventListener('click', () => {
      tabBtnCategories.classList.add('active');
      tabBtnTodos.classList.remove('active');
      tabBtnRoutines.classList.remove('active');
      viewCategories.classList.remove('hidden');
      viewTodos.classList.add('hidden');
      viewRoutines.classList.add('hidden');
      updateAnalytics();
    });

    tabBtnTodos.addEventListener('click', () => {
      tabBtnTodos.classList.add('active');
      tabBtnCategories.classList.remove('active');
      tabBtnRoutines.classList.remove('active');
      viewTodos.classList.remove('hidden');
      viewCategories.classList.add('hidden');
      viewRoutines.classList.add('hidden');
      updateAnalytics();
    });

    tabBtnRoutines.addEventListener('click', () => {
      tabBtnRoutines.classList.add('active');
      tabBtnCategories.classList.remove('active');
      tabBtnTodos.classList.remove('active');
      viewRoutines.classList.remove('hidden');
      viewCategories.classList.add('hidden');
      viewTodos.classList.add('hidden');
      updateAnalytics();
    });
  }

  // Todo Tracker Dropdown Selection
  const trackerTodoSelect = document.getElementById('tracker-todo-select');
  if (trackerTodoSelect) {
    trackerTodoSelect.addEventListener('change', () => {
      updateSelectedTodoTracker();
    });
  }

  // Add Todo
  addTodoBtn.addEventListener('click', handleAddTodo);
  todoInputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      handleAddTodo();
    }
  });

  // Expand/collapse todo input options based on focus/blur
  const todoInputContainer = document.querySelector('.todo-input-container');
  if (todoInputField && todoInputContainer) {
    todoInputField.addEventListener('focus', () => {
      todoInputContainer.classList.add('expanded');
    });

    todoInputField.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        todoInputField.blur();
        if (!todoInputField.value.trim()) {
          todoInputContainer.classList.remove('expanded');
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!todoInputContainer.contains(e.target) && !todoInputField.value.trim()) {
        todoInputContainer.classList.remove('expanded');
      }
    });
  }

  // New Record Creator event listeners
  const btnAddRecordTrigger = document.getElementById('btn-add-record-trigger');
  const btnCancelNewRecord = document.getElementById('btn-cancel-new-record');
  const btnSaveNewRecord = document.getElementById('btn-save-new-record');
  const newRecordText = document.getElementById('new-record-text');
  const newRecordPhotoInput = document.getElementById('new-record-photo-input');

  if (btnAddRecordTrigger) {
    btnAddRecordTrigger.addEventListener('click', () => {
      state.editingRecordId = 'new';
      state.diaryDraftImages = [];
      state.diaryDraftDrawing = [];
      state.diaryDraftAudio = [];
      renderDiary();
      
      // Auto focus textarea
      setTimeout(() => {
        if (newRecordText) newRecordText.focus();
      }, 50);
    });
  }

  if (btnCancelNewRecord) {
    btnCancelNewRecord.addEventListener('click', () => {
      state.editingRecordId = null;
      state.diaryDraftImages = [];
      state.diaryDraftDrawing = [];
      state.diaryDraftAudio = [];
      renderDiary();
    });
  }

  if (btnSaveNewRecord && newRecordText) {
    btnSaveNewRecord.addEventListener('click', () => {
      const dateKey = state.selectedDate;
      const textVal = newRecordText.value.trim();
      const imagesVal = [...state.diaryDraftImages];
      const drawingVal = [...(state.diaryDraftDrawing || [])];
      const audioVal = [...(state.diaryDraftAudio || [])];

      if (!textVal && imagesVal.length === 0 && drawingVal.length === 0 && audioVal.length === 0) {
        alert('내용이나 사진, 그림, 음성 중 하나를 입력해 주세요.');
        return;
      }

      if (!state.diaries[dateKey]) {
        state.diaries[dateKey] = [];
      }

      state.diaries[dateKey].push({
        id: Date.now(),
        text: textVal,
        images: imagesVal,
        drawing: drawingVal,
        audio: audioVal
      });

      saveDiaries();
      state.editingRecordId = null;
      state.diaryDraftImages = [];
      state.diaryDraftDrawing = [];
      state.diaryDraftAudio = [];
      updateUI();
    });
  }

  if (newRecordPhotoInput) {
    newRecordPhotoInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      const statusSpan = document.getElementById('new-record-save-status');
      if (statusSpan) {
        statusSpan.textContent = '사진 압축 중...';
        statusSpan.style.opacity = '1';
      }

      let processed = 0;
      files.forEach(file => {
        if (file.type.startsWith('video/') || file.type === 'application/pdf') {
          FileDB.saveFile(file, file.type, file.name).then(id => {
            state.diaryDraftImages.push({
              fileId: id,
              type: file.type.startsWith('video/') ? 'video' : 'pdf',
              name: file.name
            });
            processed++;
            if (processed === files.length) {
              renderDiary();
              if (statusSpan) {
                statusSpan.textContent = '파일 추가 완료';
                statusSpan.style.opacity = '0.7';
              }
            }
          }).catch(err => console.error(err));
        } else {
          compressAndSaveImage(file, (dataUrl) => {
            state.diaryDraftImages.push({
              src: dataUrl,
              rotate: 0,
              mode: 'cover',
              filter: 'normal'
            });
            processed++;
            if (processed === files.length) {
              renderDiary();
              if (statusSpan) {
                statusSpan.textContent = '사진 추가 완료';
                statusSpan.style.opacity = '0.7';
              }
            }
          });
        }
      });

      newRecordPhotoInput.value = '';
    });
  }

  // Lightbox Close and Navigation event listeners
  const lightboxModal = document.getElementById('image-lightbox-modal');
  const btnCloseLightbox = document.getElementById('btn-close-lightbox');
  const lightboxBackdrop = document.getElementById('lightbox-backdrop');
  const btnPrevLightbox = document.getElementById('btn-prev-lightbox');
  const btnNextLightbox = document.getElementById('btn-next-lightbox');

  const closeLightbox = () => {
    if (lightboxModal) lightboxModal.classList.add('hidden');
    const mediaContainer = document.getElementById('lightbox-media-container');
    if (mediaContainer) {
      mediaContainer.innerHTML = '';
      mediaContainer.style.display = 'none';
    }
  };

  if (btnCloseLightbox) btnCloseLightbox.addEventListener('click', closeLightbox);
  if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);
  if (btnPrevLightbox) {
    btnPrevLightbox.addEventListener('click', () => showLightboxImage(lightboxIndex - 1));
  }
  if (btnNextLightbox) {
    btnNextLightbox.addEventListener('click', () => showLightboxImage(lightboxIndex + 1));
  }

  // Lightbox Image Editing event listeners (Rotate and Fit Mode)
  const btnRotateLightbox = document.getElementById('btn-lightbox-rotate');
  const btnModeLightbox = document.getElementById('btn-lightbox-mode');

  if (btnRotateLightbox) {
    btnRotateLightbox.addEventListener('click', () => {
      if (lightboxImages.length === 0) return;
      let currentImg = lightboxImages[lightboxIndex];
      // Convert string to object on-the-fly if needed
      if (typeof currentImg === 'string') {
        lightboxImages[lightboxIndex] = { src: currentImg, rotate: 0, mode: 'cover', filter: 'normal' };
        currentImg = lightboxImages[lightboxIndex];
      }
      currentImg.rotate = ((currentImg.rotate || 0) + 90) % 360;

      // Re-apply styles to the lightbox image immediately
      const lightboxImg = document.getElementById('lightbox-image');
      if (lightboxImg) {
        lightboxImg.style = getImageStyle(currentImg);
      }

      // Save changes immediately if not in draft mode
      if (!lightboxIsDraft) {
        saveDiaries();
      }
      // Re-render diary backgrounds without closing modal
      renderDiary();
    });
  }



  document.addEventListener('keydown', (e) => {
    if (lightboxModal && !lightboxModal.classList.contains('hidden')) {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        showLightboxImage(lightboxIndex - 1);
      } else if (e.key === 'ArrowRight') {
        showLightboxImage(lightboxIndex + 1);
      }
    }
    const todoEditModal = document.getElementById('todo-edit-modal');
    if (todoEditModal && !todoEditModal.classList.contains('hidden')) {
      if (e.key === 'Escape') {
        closeTodoEditModal();
      }
    }
  });

  // Todo Edit Modal Event Listeners
  const btnTodoSave = document.getElementById('btn-todo-edit-save');
  const btnTodoDelete = document.getElementById('btn-todo-edit-delete');
  const btnTodoCancel = document.getElementById('btn-todo-edit-cancel');
  const todoEditBackdrop = document.getElementById('todo-edit-backdrop');
  const todoEditTextInput = document.getElementById('todo-edit-modal-text');

  if (btnTodoCancel) {
    btnTodoCancel.addEventListener('click', closeTodoEditModal);
  }
  if (todoEditBackdrop) {
    todoEditBackdrop.addEventListener('click', closeTodoEditModal);
  }

  const btnTodoClearTime = document.getElementById('btn-todo-edit-clear-time');
  const btnModalAm = document.getElementById('btn-modal-ampm-am');
  const btnModalPm = document.getElementById('btn-modal-ampm-pm');
  const selectModalHour = document.getElementById('todo-edit-modal-hour');
  const selectModalMin = document.getElementById('todo-edit-modal-min');

  const updateModalAmpm = (ampm) => {
    editModalSelectedAmpm = ampm;
    if (ampm === 'AM') {
      if (btnModalAm) btnModalAm.classList.add('active');
      if (btnModalPm) btnModalPm.classList.remove('active');
    } else {
      if (btnModalPm) btnModalPm.classList.add('active');
      if (btnModalAm) btnModalAm.classList.remove('active');
    }
  };

  if (btnModalAm) {
    btnModalAm.addEventListener('click', (e) => {
      e.stopPropagation();
      updateModalAmpm('AM');
    });
  }

  if (btnModalPm) {
    btnModalPm.addEventListener('click', (e) => {
      e.stopPropagation();
      updateModalAmpm('PM');
    });
  }

  const btnModalShortcutMidnight = document.getElementById('btn-modal-shortcut-midnight');
  const btnModalShortcutNoon = document.getElementById('btn-modal-shortcut-noon');

  if (btnModalShortcutMidnight) {
    btnModalShortcutMidnight.addEventListener('click', (e) => {
      e.stopPropagation();
      updateModalAmpm('AM');
      if (selectModalHour) selectModalHour.value = '12';
      if (selectModalMin) selectModalMin.value = '00';
    });
  }

  if (btnModalShortcutNoon) {
    btnModalShortcutNoon.addEventListener('click', (e) => {
      e.stopPropagation();
      updateModalAmpm('PM');
      if (selectModalHour) selectModalHour.value = '12';
      if (selectModalMin) selectModalMin.value = '00';
    });
  }

  if (btnTodoClearTime) {
    btnTodoClearTime.addEventListener('click', () => {
      if (selectModalHour) selectModalHour.value = '';
      if (selectModalMin) selectModalMin.value = '';
      updateModalAmpm('AM');
    });
  }

  if (btnTodoSave) {
    btnTodoSave.addEventListener('click', () => {
      const originalText = todoEditTextInput ? todoEditTextInput.value.trim() : '';
      if (!originalText) return;

      const parsedResult = parseNaturalLanguageTodo(originalText);
      const text = parsedResult.cleanedText;
      if (!text) return;

      const hourVal = selectModalHour ? selectModalHour.value : '';
      const minVal = selectModalMin ? selectModalMin.value : '';
      const timeValue = parsedResult.time || ((hourVal && minVal) ? convertTo24h(editModalSelectedAmpm, hourVal, minVal) : '');

      const dateKey = state.selectedDate;
      const targetDateKey = parsedResult.dateKey;

      const memoInput = document.getElementById('todo-edit-modal-memo');
      const memoValue = memoInput ? memoInput.value.trim() : '';

      const importantInput = document.getElementById('todo-edit-modal-important');
      const isImportantVal = importantInput ? importantInput.checked : Boolean(todo.isImportant);
      const newImages = [...todoEditDraftImages];
      const newDrawing = [...todoEditDraftDrawing];
      const newAudio = [...todoEditDraftAudio];

      const todo = state.todos[dateKey].find(t => t.id === editingTodoId);
      if (todo) {
        // Save if anything changed (text, category, time, date, memo, importance, memo images, memo drawing, or memo audio)
        if (todo.text !== text || todo.category !== modalSelectedCategory || todo.time !== timeValue || targetDateKey !== dateKey || (todo.memo || '') !== memoValue || Boolean(todo.isImportant) !== isImportantVal || JSON.stringify(todo.memoImages || []) !== JSON.stringify(newImages) || JSON.stringify(todo.memoDrawing || []) !== JSON.stringify(newDrawing) || JSON.stringify(todo.memoAudio || []) !== JSON.stringify(newAudio)) {
          pushToHistory();
          todo.text = text;
          todo.category = modalSelectedCategory;
          todo.time = timeValue;
          todo.memo = memoValue;
          todo.memoImages = newImages;
          todo.memoDrawing = newDrawing;
          todo.memoAudio = newAudio;
          todo.isImportant = isImportantVal;

          // If date has changed, move the todo item
          if (targetDateKey !== dateKey) {
            // Remove from old date
            state.todos[dateKey] = state.todos[dateKey].filter(t => t.id !== todo.id);
            if (state.todos[dateKey].length === 0) {
              delete state.todos[dateKey];
            }
            // Push to new date
            if (!state.todos[targetDateKey]) {
              state.todos[targetDateKey] = [];
            }
            state.todos[targetDateKey].push(todo);
          }

          // If it's a routine, also update the routine template
          if (todo.isRoutine) {
            const routine = state.routines.find(r => r.text === todo.text);
            if (routine) {
              routine.text = text;
              routine.category = modalSelectedCategory;
              saveRoutines();
            }
          }

          saveTodos();
          updateUI();
        }
      }
      closeTodoEditModal();
    });
  }

  if (btnTodoDelete) {
    btnTodoDelete.addEventListener('click', () => {
      if (editingTodoId && confirm('이 할 일을 삭제하시겠습니까?')) {
        const dateKey = state.selectedDate;
        const todo = state.todos[dateKey].find(t => t.id === editingTodoId);
        if (todo) {
          deleteTodo(todo.id, todo.text, todo.isRoutine);
        }
        closeTodoEditModal();
      }
    });
  }

  if (todoEditTextInput) {
    todoEditTextInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (btnTodoSave) btnTodoSave.click();
      } else if (e.key === 'Escape') {
        closeTodoEditModal();
      }
    });
  }

  const todoEditModalPhotoInput = document.getElementById('todo-edit-modal-photo-input');
  if (todoEditModalPhotoInput) {
    todoEditModalPhotoInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      
      const statusSpan = document.getElementById('todo-edit-modal-photo-status');
      if (statusSpan) {
        statusSpan.textContent = '사진 압축 중...';
        statusSpan.style.opacity = '1';
      }
      
      let processed = 0;
      files.forEach(file => {
        if (file.type.startsWith('video/') || file.type === 'application/pdf') {
          FileDB.saveFile(file, file.type, file.name).then(id => {
            todoEditDraftImages.push({
              fileId: id,
              type: file.type.startsWith('video/') ? 'video' : 'pdf',
              name: file.name
            });
            processed++;
            if (processed === files.length) {
              renderTodoEditPreviews();
              if (statusSpan) {
                statusSpan.textContent = '';
              }
            }
          }).catch(err => console.error(err));
        } else {
          compressAndSaveImage(file, (dataUrl) => {
            todoEditDraftImages.push({
              src: dataUrl,
              rotate: 0,
              mode: 'cover',
              filter: 'normal'
            });
            processed++;
            if (processed === files.length) {
              renderTodoEditPreviews();
              if (statusSpan) {
                statusSpan.textContent = '';
              }
            }
          });
        }
      });
      todoEditModalPhotoInput.value = '';
    });
  }

  // Toggle all photos visibility listener
  const togglePhotosBtn = document.getElementById('btn-toggle-all-photos');
  if (togglePhotosBtn) {
    togglePhotosBtn.addEventListener('click', () => {
      state.showRecordPhotos = !state.showRecordPhotos;
      renderDiary();
    });
  }

  // Toggle entire Todo section listener
  const toggleTodosBtn = document.getElementById('btn-toggle-todos');
  if (toggleTodosBtn) {
    toggleTodosBtn.addEventListener('click', () => {
      state.showTodos = !state.showTodos;
      localStorage.setItem('neon_planner_show_todos', state.showTodos);
      applyLayoutSectionOrder();
      updateUI();
    });
  }

  // Toggle entire Records section listener
  const toggleRecordsBtn = document.getElementById('btn-toggle-records');
  if (toggleRecordsBtn) {
    toggleRecordsBtn.addEventListener('click', () => {
      state.showRecords = !state.showRecords;
      localStorage.setItem('neon_planner_show_records', state.showRecords);
      applyLayoutSectionOrder();
      updateUI();
    });
  }

  // Close search dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const searchContainer = document.querySelector('.header-search');
    const dropdown = document.getElementById('search-results-section');
    if (searchContainer && !searchContainer.contains(e.target)) {
      if (dropdown) dropdown.classList.add('hidden');
    }

    // Also close the custom time picker dropdown when clicking outside
    const timeContainer = document.querySelector('.todo-time-custom-container');
    const timeDropdown = document.getElementById('todo-time-dropdown');
    if (timeContainer && !timeContainer.contains(e.target)) {
      if (timeDropdown) timeDropdown.classList.add('hidden');
    }
  });

  // Custom Time Dropdown Picker Event Listeners
  const btnTimeTrigger = document.getElementById('btn-todo-time-trigger');
  const timeDropdown = document.getElementById('todo-time-dropdown');
  const btnTimeConfirm = document.getElementById('btn-todo-time-confirm');
  const btnTimeClear = document.getElementById('btn-todo-time-clear');
  const btnAm = document.getElementById('btn-time-ampm-am');
  const btnPm = document.getElementById('btn-time-ampm-pm');
  const selectHour = document.getElementById('todo-custom-hour');
  const selectMin = document.getElementById('todo-custom-min');

  if (btnTimeTrigger && timeDropdown) {
    btnTimeTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      timeDropdown.classList.toggle('hidden');
    });
  }

  const updateAddFormAmpm = (ampm) => {
    addFormSelectedAmpm = ampm;
    if (ampm === 'AM') {
      if (btnAm) btnAm.classList.add('active');
      if (btnPm) btnPm.classList.remove('active');
    } else {
      if (btnPm) btnPm.classList.add('active');
      if (btnAm) btnAm.classList.remove('active');
    }
  };

  if (btnAm) {
    btnAm.addEventListener('click', (e) => {
      e.stopPropagation();
      updateAddFormAmpm('AM');
    });
  }

  if (btnPm) {
    btnPm.addEventListener('click', (e) => {
      e.stopPropagation();
      updateAddFormAmpm('PM');
    });
  }

  if (btnTimeConfirm) {
    btnTimeConfirm.addEventListener('click', (e) => {
      e.stopPropagation();
      const hourVal = selectHour ? selectHour.value : '';
      const minVal = selectMin ? selectMin.value : '';

      if (hourVal && minVal) {
        currentSelectedTime = convertTo24h(addFormSelectedAmpm, hourVal, minVal);
        if (btnTimeTrigger) {
          btnTimeTrigger.textContent = `⏰ ${formatTimeKorean(currentSelectedTime)}`;
        }
      } else {
        // If incomplete, clear the selection
        currentSelectedTime = '';
        if (btnTimeTrigger) {
          btnTimeTrigger.textContent = '⏰ 시간 설정';
        }
      }
      if (timeDropdown) timeDropdown.classList.add('hidden');
    });
  }

  // Shortcut bindings for Add Form
  const btnShortcutMidnight = document.getElementById('btn-time-shortcut-midnight');
  const btnShortcutNoon = document.getElementById('btn-time-shortcut-noon');

  if (btnShortcutMidnight) {
    btnShortcutMidnight.addEventListener('click', (e) => {
      e.stopPropagation();
      updateAddFormAmpm('AM');
      if (selectHour) selectHour.value = '12';
      if (selectMin) selectMin.value = '00';
      currentSelectedTime = '00:00';
      if (btnTimeTrigger) {
        btnTimeTrigger.textContent = `⏰ ${formatTimeKorean(currentSelectedTime)}`;
      }
      if (timeDropdown) timeDropdown.classList.add('hidden');
    });
  }

  if (btnShortcutNoon) {
    btnShortcutNoon.addEventListener('click', (e) => {
      e.stopPropagation();
      updateAddFormAmpm('PM');
      if (selectHour) selectHour.value = '12';
      if (selectMin) selectMin.value = '00';
      currentSelectedTime = '12:00';
      if (btnTimeTrigger) {
        btnTimeTrigger.textContent = `⏰ ${formatTimeKorean(currentSelectedTime)}`;
      }
      if (timeDropdown) timeDropdown.classList.add('hidden');
    });
  }

  if (btnTimeClear) {
    btnTimeClear.addEventListener('click', (e) => {
      e.stopPropagation();
      currentSelectedTime = '';
      if (selectHour) selectHour.value = '';
      if (selectMin) selectMin.value = '';
      updateAddFormAmpm('AM');
      if (btnTimeTrigger) {
        btnTimeTrigger.textContent = '⏰ 시간 설정';
      }
      if (timeDropdown) timeDropdown.classList.add('hidden');
    });
  }

  // Google Drive Integration Listeners
  const gdriveLoginBtn = document.getElementById('btn-gdrive-login');
  const gdriveBackupBtn = document.getElementById('btn-gdrive-backup');
  const gdriveRestoreBtn = document.getElementById('btn-gdrive-restore');
  const gdriveClientIdInput = document.getElementById('gdrive-client-id-input');

  const gdriveClientIdSaveBtn = document.getElementById('btn-gdrive-client-id-save');

  const saveClientId = () => {
    if (gdriveClientIdInput) {
      state.gdriveClientId = gdriveClientIdInput.value.trim();
      localStorage.setItem('neon_planner_gdrive_client_id', state.gdriveClientId);
      alert('🔑 구글 Client ID가 안전하게 등록되었습니다!');
    }
  };

  if (gdriveClientIdInput) {
    gdriveClientIdInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveClientId();
      }
    });
  }

  if (gdriveClientIdSaveBtn) {
    gdriveClientIdSaveBtn.addEventListener('click', saveClientId);
  }

  if (gdriveLoginBtn) {
    gdriveLoginBtn.addEventListener('click', () => {
      let clientId = (state.gdriveClientId || '').trim();
      if (clientId && !clientId.endsWith('.apps.googleusercontent.com')) {
        clientId += '.apps.googleusercontent.com';
      }
      if (!clientId) {
        alert('구글 드라이브 연동을 진행하려면 먼저 발급받으신 "구글 Client ID"를 아래 상자에 입력해주셔야 합니다.');
        return;
      }

      if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
        alert('구글 로그인 라이브러리가 로드되지 않았습니다.\n\n인터넷 연결을 확인하시거나, 브라우저의 광고 차단 프로그램(AdBlock, Brave Shield 등)이 구글 인증 스크립트를 차단하고 있는지 확인한 뒤 새로고침하여 다시 시도해 주세요!');
        return;
      }

      try {
        gdriveTokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.appdata',
          callback: (tokenResponse) => {
            if (tokenResponse.error !== undefined) {
              alert('구글 인증에 실패했습니다: ' + tokenResponse.error);
              return;
            }
            gdriveAccessToken = tokenResponse.access_token;
            const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
            localStorage.setItem('neon_planner_gdrive_connected', 'true');
            localStorage.setItem('neon_planner_gdrive_access_token', gdriveAccessToken);
            localStorage.setItem('neon_planner_gdrive_token_expiry', expiryTime);
            
            scheduleGDriveTokenRefresh(expiryTime);
            if (gdrivePollInterval) clearInterval(gdrivePollInterval);
            gdrivePollInterval = setInterval(autoSyncWithDrive, 3000);
            
            if (gdriveBackupBtn) gdriveBackupBtn.disabled = false;
            if (gdriveRestoreBtn) gdriveRestoreBtn.disabled = false;
            
            const logoutBtn = document.getElementById('btn-gdrive-logout');
            if (logoutBtn) logoutBtn.style.display = 'inline-flex';

            const badge = document.getElementById('gdrive-status-badge');
            if (badge) {
              badge.textContent = '연결 완료';
              badge.style.background = 'rgba(16, 185, 129, 0.15)';
              badge.style.color = '#10b981';
              badge.style.borderColor = '#10b981';
            }
            const info = document.getElementById('gdrive-user-info');
            if (info) {
              info.textContent = '구글 연동 활성화 (실시간 자동 동기화)';
            }
            performAutoRestoreAndBackup();
          }
        });

        gdriveTokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        console.error(err);
        alert('구글 로그인 클라이언트 생성 실패: ' + err.message + '\nClient ID 형식이 올바른지 재차 확인해주세요.');
      }
    });
  }

  // Logout / Disconnect Button
  const btnLogoutGDrive = document.getElementById('btn-gdrive-logout');
  if (btnLogoutGDrive) {
    btnLogoutGDrive.addEventListener('click', () => {
      gdriveAccessToken = null;
      if (gdrivePollInterval) clearInterval(gdrivePollInterval);
      localStorage.removeItem('neon_planner_gdrive_connected');
      localStorage.removeItem('neon_planner_gdrive_access_token');
      localStorage.removeItem('neon_planner_gdrive_token_expiry');
      localStorage.removeItem('neon_planner_gdrive_file_modifiedTime');

      if (gdriveBackupBtn) gdriveBackupBtn.disabled = true;
      if (gdriveRestoreBtn) gdriveRestoreBtn.disabled = true;
      btnLogoutGDrive.style.display = 'none';

      const badge = document.getElementById('gdrive-status-badge');
      if (badge) {
        badge.textContent = '연결 안 됨';
        badge.style.background = 'rgba(239, 68, 68, 0.15)';
        badge.style.color = '#ef4444';
        badge.style.borderColor = '#ef4444';
      }
      const info = document.getElementById('gdrive-user-info');
      if (info) info.textContent = '구글 로그인 시 클라우드 실시간 동기화';

      alert('구글 계정 연동을 정상적으로 해제했습니다.');
    });
  }

  // Scroll-to-Top Button Listener
  const btnScrollToTop = document.getElementById('btn-scroll-to-top');
  if (btnScrollToTop) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        btnScrollToTop.classList.add('visible');
      } else {
        btnScrollToTop.classList.remove('visible');
      }
    });

    btnScrollToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (gdriveBackupBtn) {
    gdriveBackupBtn.addEventListener('click', async () => {
      if (!gdriveAccessToken) {
        alert('구글 연동 만료 또는 미연결 상태입니다. 구글 로그인 버튼을 다시 눌러주세요.');
        return;
      }

      gdriveBackupBtn.disabled = true;
      gdriveBackupBtn.textContent = '📤 백업 중...';

      try {
        const backupData = {
          todos: JSON.parse(localStorage.getItem('neon_planner_todos') || '{}'),
          diaries: JSON.parse(localStorage.getItem('neon_planner_diaries') || '{}'),
          categories: JSON.parse(localStorage.getItem('neon_planner_categories') || '{}'),
          tabIcons: JSON.parse(localStorage.getItem('neon_planner_tab_icons') || '{}'),
          appTitle: localStorage.getItem('neon_planner_app_title') || '',
          ddays: JSON.parse(localStorage.getItem('neon_planner_ddays') || '[]'),
          preferences: {
            theme: localStorage.getItem('neon_planner_theme') || 'dark',
            fontSize: localStorage.getItem('neon_planner_font_size') || '16',
            dateSize: localStorage.getItem('neon_planner_date_size') || '14',
            bgHue: localStorage.getItem('neon_planner_bg_hue') || '0',
            bgIntensity: localStorage.getItem('neon_planner_bg_intensity') || '0',
            accentColor: localStorage.getItem('neon_planner_accent_color') || 'indigo',
            accentIntensity: localStorage.getItem('neon_planner_accent_intensity') || '100',
            showCalendar: localStorage.getItem('neon_planner_show_calendar') || 'true',
            showTodos: localStorage.getItem('neon_planner_show_todos') || 'true',
            showRecords: localStorage.getItem('neon_planner_show_records') || 'true',
            showAnalytics: localStorage.getItem('neon_planner_show_analytics') || 'false',
            showSearch: localStorage.getItem('neon_planner_show_search') || 'true',
            buttonOrder: localStorage.getItem('neon_planner_button_order') || ''
          },
          lastModified: parseInt(localStorage.getItem('neon_planner_last_modified') || '0', 10)
        };

        const searchUrl = "https://www.googleapis.com/drive/v3/files?q=name='neon_planner_backup.json'+and+trashed=false&spaces=appDataFolder&fields=files(id)";
        const searchRes = await fetch(searchUrl, {
          headers: { 'Authorization': `Bearer ${gdriveAccessToken}` }
        });
        if (searchRes.status === 401 || searchRes.status === 403) {
          alert('구글 로그인 세션이 만료되었습니다. 인증 창이 뜹니다.');
          const loginBtn = document.getElementById('btn-gdrive-login');
          if (loginBtn) loginBtn.click();
          throw new Error('인증 만료 (재로그인 진행)');
        }
        const searchData = await searchRes.json();
        const existingFile = searchData.files && searchData.files[0];

        if (existingFile) {
          const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
          const updateRes = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${gdriveAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(backupData)
          });
          if (!updateRes.ok) throw new Error('파일 덮어쓰기 실패');
        } else {
          const boundary = 'neon_planner_multipart_boundary';
          const delimiter = `--${boundary}\r\n`;
          const nextDelimiter = `\r\n--${boundary}\r\n`;
          const closeDelimiter = `\r\n--${boundary}--`;

          const metadata = {
            name: 'neon_planner_backup.json',
            mimeType: 'application/json',
            parents: ['appDataFolder']
          };

          const parts = [
            delimiter,
            'Content-Type: application/json; charset=UTF-8\r\n\r\n',
            JSON.stringify(metadata),
            nextDelimiter,
            'Content-Type: application/json; charset=UTF-8\r\n\r\n',
            JSON.stringify(backupData),
            closeDelimiter
          ];

          const blob = new Blob(parts, { type: `multipart/related; boundary=${boundary}` });

          const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
          const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${gdriveAccessToken}`
            },
            body: blob
          });
          if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error('새 파일 업로드 실패: ' + createRes.status + ' - ' + errText);
          }
        }

        alert('구글 드라이브 백업이 완료되었습니다! (neon_planner_backup.json 파일로 저장됨)');
      } catch (err) {
        console.error(err);
        alert('백업 업로드 중 오류가 발생했습니다: ' + err.message);
      } finally {
        gdriveBackupBtn.disabled = false;
        gdriveBackupBtn.textContent = '📤 드라이브 백업';
      }
    });
  }

  if (gdriveRestoreBtn) {
    gdriveRestoreBtn.addEventListener('click', async () => {
      if (!gdriveAccessToken) {
        alert('구글 연동 만료 또는 미연결 상태입니다. 구글 로그인 버튼을 다시 눌러주세요.');
        return;
      }

      if (!confirm('정말로 구글 드라이브에서 백업 데이터를 받아와 덮어씌우시겠습니까?\n현재 로컬 데이터는 모두 유실됩니다.')) {
        return;
      }

      gdriveRestoreBtn.disabled = true;
      gdriveRestoreBtn.textContent = '📥 복원 중...';

      try {
        const searchUrl = "https://www.googleapis.com/drive/v3/files?q=name='neon_planner_backup.json'+and+trashed=false&spaces=appDataFolder&fields=files(id)";
        const searchRes = await fetch(searchUrl, {
          headers: { 'Authorization': `Bearer ${gdriveAccessToken}` }
        });
        if (searchRes.status === 401 || searchRes.status === 403) {
          alert('구글 로그인 세션이 만료되었습니다. 인증 창이 뜹니다.');
          const loginBtn = document.getElementById('btn-gdrive-login');
          if (loginBtn) loginBtn.click();
          throw new Error('인증 만료 (재로그인 진행)');
        }
        const searchData = await searchRes.json();
        const existingFile = searchData.files && searchData.files[0];

        if (!existingFile) {
          alert('구글 드라이브 내에 백업된 파일(neon_planner_backup.json)을 발견할 수 없습니다.');
          return;
        }

        const contentUrl = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`;
        const contentRes = await fetch(contentUrl, {
          headers: { 'Authorization': `Bearer ${gdriveAccessToken}` }
        });

        if (!contentRes.ok) throw new Error('백업 데이터 파일 읽기 실패');
        const restoreData = await contentRes.json();

        if (restoreData.todos) localStorage.setItem('neon_planner_todos', JSON.stringify(restoreData.todos));
        if (restoreData.diaries) localStorage.setItem('neon_planner_diaries', JSON.stringify(restoreData.diaries));
        if (restoreData.categories) localStorage.setItem('neon_planner_categories', JSON.stringify(restoreData.categories));
        if (restoreData.tabIcons) localStorage.setItem('neon_planner_tab_icons', JSON.stringify(restoreData.tabIcons));
        if (restoreData.appTitle) localStorage.setItem('neon_planner_app_title', restoreData.appTitle);
        if (restoreData.ddays) localStorage.setItem('neon_planner_ddays', JSON.stringify(restoreData.ddays));
        
        if (restoreData.preferences) {
          const prefs = restoreData.preferences;
          if (prefs.theme) localStorage.setItem('neon_planner_theme', prefs.theme);
          if (prefs.fontSize) localStorage.setItem('neon_planner_font_size', prefs.fontSize);
          if (prefs.dateSize) localStorage.setItem('neon_planner_date_size', prefs.dateSize);
          if (prefs.bgHue) localStorage.setItem('neon_planner_bg_hue', prefs.bgHue);
          if (prefs.bgIntensity) localStorage.setItem('neon_planner_bg_intensity', prefs.bgIntensity);
          if (prefs.accentColor) localStorage.setItem('neon_planner_accent_color', prefs.accentColor);
          if (prefs.accentIntensity) localStorage.setItem('neon_planner_accent_intensity', prefs.accentIntensity);
          if (prefs.showCalendar) localStorage.setItem('neon_planner_show_calendar', prefs.showCalendar);
          if (prefs.showTodos) localStorage.setItem('neon_planner_show_todos', prefs.showTodos);
          if (prefs.showRecords) localStorage.setItem('neon_planner_show_records', prefs.showRecords);
          if (prefs.showAnalytics) localStorage.setItem('neon_planner_show_analytics', prefs.showAnalytics);
          if (prefs.showSearch) localStorage.setItem('neon_planner_show_search', prefs.showSearch);
          if (prefs.buttonOrder) localStorage.setItem('neon_planner_button_order', prefs.buttonOrder);
        }

        localStorage.setItem('neon_planner_last_modified', restoreData.lastModified ? restoreData.lastModified.toString() : Date.now().toString());

        alert('구글 드라이브 백업 데이터 복원에 성공했습니다! 변경사항 적용을 위해 화면을 새로고침합니다.');
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('복원 다운로드 중 오류가 발생했습니다: ' + err.message);
      } finally {
        gdriveRestoreBtn.disabled = false;
        gdriveRestoreBtn.textContent = '📥 드라이브 복원';
      }
    });
  }

  // D-day Add button trigger inside panel
  const btnAddDdayTrigger = document.getElementById('btn-add-dday-trigger');
  if (btnAddDdayTrigger) {
    btnAddDdayTrigger.addEventListener('click', () => {
      openDdayModal();
    });
  }

  // D-day type countdown button inside modal
  const btnDdayTypeCountdown = document.getElementById('btn-dday-type-countdown');
  const btnDdayTypeAnniversary = document.getElementById('btn-dday-type-anniversary');
  if (btnDdayTypeCountdown && btnDdayTypeAnniversary) {
    btnDdayTypeCountdown.addEventListener('click', () => {
      btnDdayTypeCountdown.classList.add('active');
      btnDdayTypeAnniversary.classList.remove('active');
    });
    btnDdayTypeAnniversary.addEventListener('click', () => {
      btnDdayTypeAnniversary.classList.add('active');
      btnDdayTypeCountdown.classList.remove('active');
    });
  }

  // D-day color dots inside modal
  const ddayColorDots = document.querySelectorAll('#dday-modal-colors .dday-color-dot');
  ddayColorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      ddayColorDots.forEach(d => {
        d.classList.remove('active');
        d.style.borderColor = 'transparent';
      });
      dot.classList.add('active');
      dot.style.borderColor = 'white';
    });
  });

  // D-day Save Button
  const btnDdaySave = document.getElementById('btn-dday-save');
  if (btnDdaySave) {
    btnDdaySave.addEventListener('click', saveDdayData);
  }

  // D-day Cancel Button
  const btnDdayCancel = document.getElementById('btn-dday-cancel');
  if (btnDdayCancel) {
    btnDdayCancel.addEventListener('click', closeDdayModal);
  }

  // D-day Modal Backdrop Click
  const ddayModalBackdrop = document.getElementById('dday-modal-backdrop');
  if (ddayModalBackdrop) {
    ddayModalBackdrop.addEventListener('click', closeDdayModal);
  }
}

// Add a new todo item
function handleAddTodo() {
  const originalText = todoInputField.value.trim();
  if (!originalText) return;

  // Run the natural language parser
  const parsedResult = parseNaturalLanguageTodo(originalText);
  const text = parsedResult.cleanedText;
  if (!text) return; // Ignore if only date/time was typed without any todo text

  pushToHistory();

  const dateKey = parsedResult.dateKey;
  if (!state.todos[dateKey]) {
    state.todos[dateKey] = [];
  }

  const isRoutine = routineCheckbox.checked;
  const importantCheckbox = document.getElementById('important-checkbox');
  const isImportant = (importantCheckbox && importantCheckbox.checked) || Boolean(parsedResult.isImportant);
  const timeValue = parsedResult.time || currentSelectedTime;

  const newTodo = {
    id: Date.now(),
    text: text,
    category: state.selectedCategory,
    completed: false,
    isRoutine: isRoutine,
    isImportant: isImportant,
    time: timeValue,
    createdAt: Date.now(),
    customOrder: Date.now()
  };

  state.todos[dateKey].push(newTodo);

  // If marked as routine, save it to the routines template pool
  if (isRoutine) {
    state.routines.push({
      id: Date.now(),
      text: text,
      category: state.selectedCategory
    });
    saveRoutines();
  }

  // Reset inputs
  todoInputField.value = '';
  routineCheckbox.checked = false; // Reset checkbox
  if (importantCheckbox) importantCheckbox.checked = false; // Reset important checkbox

  // Reset custom time picker state
  currentSelectedTime = '';
  addFormSelectedAmpm = 'AM';
  const btnTimeTrigger = document.getElementById('btn-todo-time-trigger');
  if (btnTimeTrigger) {
    btnTimeTrigger.textContent = '⏰ 시간 설정';
  }
  const selectHour = document.getElementById('todo-custom-hour');
  const selectMin = document.getElementById('todo-custom-min');
  if (selectHour) selectHour.value = '';
  if (selectMin) selectMin.value = '';
  const btnAm = document.getElementById('btn-time-ampm-am');
  const btnPm = document.getElementById('btn-time-ampm-pm');
  if (btnAm) btnAm.classList.add('active');
  if (btnPm) btnPm.classList.remove('active');

  const todoInputContainer = document.querySelector('.todo-input-container');
  if (todoInputContainer) {
    todoInputContainer.classList.remove('expanded');
  }

  saveTodos();
  updateUI();
}

// Toggle Todo Completed State
function toggleTodo(todoId) {
  const dateKey = state.selectedDate;
  if (!state.todos[dateKey]) return;

  pushToHistory();

  state.todos[dateKey] = state.todos[dateKey].map(todo => {
    if (todo.id === todoId) {
      return { ...todo, completed: !todo.completed };
    }
    return todo;
  });

  saveTodos();
  updateUI();
}

// Toggle Todo Important / Starred state
function toggleTodoImportant(todoId, dateKeyParam = null) {
  const dateKey = dateKeyParam || state.selectedDate;
  if (!state.todos[dateKey]) return;

  const todo = state.todos[dateKey].find(t => t.id === todoId);
  if (!todo) return;

  pushToHistory();
  todo.isImportant = !todo.isImportant;

  saveTodos();
  updateUI();
}

// Open Todo Edit Modal (Popup)
function openTodoEditModal(todoId) {
  const dateKey = state.selectedDate;
  if (!state.todos[dateKey]) return;

  const todo = state.todos[dateKey].find(t => t.id === todoId);
  if (!todo) return;

  editingTodoId = todoId;
  modalSelectedCategory = todo.category || 'none';
  todoEditDraftImages = todo.memoImages ? JSON.parse(JSON.stringify(todo.memoImages)) : [];
  todoEditDraftDrawing = todo.memoDrawing ? JSON.parse(JSON.stringify(todo.memoDrawing)) : [];
  todoEditDraftAudio = todo.memoAudio ? JSON.parse(JSON.stringify(todo.memoAudio)) : [];

  // Fill text input
  const textInput = document.getElementById('todo-edit-modal-text');
  if (textInput) {
    textInput.value = todo.text;
  }

  // Fill memo input
  const memoInput = document.getElementById('todo-edit-modal-memo');
  if (memoInput) {
    memoInput.value = todo.memo || '';
  }

  // Fill important checkbox
  const importantInput = document.getElementById('todo-edit-modal-important');
  if (importantInput) {
    importantInput.checked = Boolean(todo.isImportant);
  }

  // Fill custom time selectors
  const parsed = parse24h(todo.time);
  const selectModalHour = document.getElementById('todo-edit-modal-hour');
  const selectModalMin = document.getElementById('todo-edit-modal-min');
  if (selectModalHour) selectModalHour.value = parsed.hour;
  if (selectModalMin) selectModalMin.value = parsed.minute;

  const btnModalAm = document.getElementById('btn-modal-ampm-am');
  const btnModalPm = document.getElementById('btn-modal-ampm-pm');
  editModalSelectedAmpm = parsed.ampm;
  if (parsed.ampm === 'AM') {
    if (btnModalAm) btnModalAm.classList.add('active');
    if (btnModalPm) btnModalPm.classList.remove('active');
  } else {
    if (btnModalPm) btnModalPm.classList.add('active');
    if (btnModalAm) btnModalAm.classList.remove('active');
  }

  // Draw category buttons
  const catsContainer = document.getElementById('todo-edit-modal-cats');
  if (catsContainer) {
    catsContainer.innerHTML = '';

    // None Option button
    const noneBtn = document.createElement('button');
    noneBtn.type = 'button';
    noneBtn.className = 'todo-modal-cat-btn';
    noneBtn.innerHTML = `<div class="todo-modal-cat-dot" style="background-color: #888;"></div>없음`;
    if (modalSelectedCategory === 'none') {
      noneBtn.classList.add('active');
    }
    noneBtn.addEventListener('click', () => {
      modalSelectedCategory = 'none';
      document.querySelectorAll('.todo-modal-cat-btn').forEach(btn => btn.classList.remove('active'));
      noneBtn.classList.add('active');
    });
    catsContainer.appendChild(noneBtn);

    // Active Category buttons
    Object.keys(state.categories).forEach(catId => {
      const cat = state.categories[catId];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'todo-modal-cat-btn';
      btn.innerHTML = `<div class="todo-modal-cat-dot" style="background-color: ${cat.color || '#fff'};"></div>${cat.label}`;
      if (modalSelectedCategory === catId) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => {
        modalSelectedCategory = catId;
        document.querySelectorAll('.todo-modal-cat-btn').forEach(btn => btn.classList.remove('active'));
        btn.classList.add('active');
      });
      catsContainer.appendChild(btn);
    });
  }

  // Show Modal
  const modal = document.getElementById('todo-edit-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }

  // Focus Input
  if (textInput) {
    setTimeout(() => {
      textInput.focus();
      textInput.select();
    }, 100);
  }
  
  renderTodoEditPreviews();

  // Setup Drawing Button
  const btnToggleTodoDrawing = document.getElementById('btn-toggle-todo-modal-drawing');
  if (btnToggleTodoDrawing) {
    const newBtn = btnToggleTodoDrawing.cloneNode(true);
    btnToggleTodoDrawing.parentNode.replaceChild(newBtn, btnToggleTodoDrawing);
    
    // Update thumbnail
    const updateThumb = () => {
      const container = document.getElementById('todo-edit-modal-drawing-container');
      if (!container) return;
      container.innerHTML = '';
      if (hasDrawingData(todoEditDraftDrawing)) {
        container.style.display = 'block';
        container.classList.remove('hidden');
        new NeonDrawingBoard(container, { initialData: todoEditDraftDrawing, readOnly: true });
      } else {
        container.style.display = 'none';
      }
    };
    updateThumb();

    newBtn.addEventListener('click', () => {
      openFullscreenDrawing(todoEditDraftDrawing, (data) => {
        todoEditDraftDrawing = data;
        updateThumb();
      });
    });
  }
  // Setup Todo audio dictate button
  const todoDictateBtn = document.getElementById('btn-dictate-todo-modal');
  if (todoDictateBtn) {
    // Remove existing event listeners by replacing the node (to prevent duplicates)
    const newBtn = todoDictateBtn.cloneNode(true);
    todoDictateBtn.parentNode.replaceChild(newBtn, todoDictateBtn);
    handleVideoRecordClick(
      'btn-video-todo-modal',
      todoEditDraftImages,
      'todo-edit-modal-previews',
      () => renderTodoEditPreviews()
    );
    handleAudioDictateClick(
      'btn-dictate-todo-modal', 
      'todo-edit-modal-memo', 
      todoEditDraftAudio, 
      'todo-edit-modal-audio-previews',
      () => renderTodoEditPreviews()
    );
  }
}

function renderTodoEditPreviews() {
  const previewsContainer = document.getElementById('todo-edit-modal-previews');
  if (!previewsContainer) return;
  previewsContainer.innerHTML = '';
  
  todoEditDraftImages.forEach((imgSrc, idx) => {
    if (typeof imgSrc === 'string') {
      todoEditDraftImages[idx] = { src: imgSrc, rotate: 0, mode: 'cover', filter: 'normal' };
      imgSrc = todoEditDraftImages[idx];
    }
    const thumb = document.createElement('div');
    thumb.className = 'record-draft-thumb';
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'thumb-img-wrapper';
    renderMediaToContainer(imgSrc, imgWrapper, () => openLightbox(todoEditDraftImages, idx, true));
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'delete-thumb-btn';
    delBtn.innerHTML = '&times;';
    delBtn.addEventListener('click', () => {
      todoEditDraftImages.splice(idx, 1);
      renderTodoEditPreviews();
    });
    imgWrapper.appendChild(delBtn);
    thumb.appendChild(imgWrapper);
    previewsContainer.appendChild(thumb);
  });
  
  // Render Audio Previews
  renderAudioPreviews('todo-edit-modal-audio-previews', todoEditDraftAudio, () => renderTodoEditPreviews());
}

// Close Todo Edit Modal
function closeTodoEditModal() {
  const modal = document.getElementById('todo-edit-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  const memoInput = document.getElementById('todo-edit-modal-memo');
  if (memoInput) memoInput.value = '';
  const selectModalHour = document.getElementById('todo-edit-modal-hour');
  const selectModalMin = document.getElementById('todo-edit-modal-min');
  if (selectModalHour) selectModalHour.value = '';
  if (selectModalMin) selectModalMin.value = '';
  editModalSelectedAmpm = 'AM';
  editingTodoId = null;
  todoEditDraftImages = [];
  todoEditDraftDrawing = [];
  todoEditDraftAudio = [];
}

// Delete Todo Item
function deleteTodo(todoId, text, isRoutine, dateKeyParam = null) {
  const dateKey = dateKeyParam || state.selectedDate;
  if (!state.todos[dateKey]) return;

  pushToHistory();

  state.todos[dateKey] = state.todos[dateKey].filter(todo => todo.id !== todoId);
  
  if (state.todos[dateKey].length === 0) {
    delete state.todos[dateKey];
  }

  // If it was a routine and they delete it, we only delete it locally for this day
  saveTodos();
  updateUI();
}

// Save helpers to LocalStorage
function saveTodos() {
  localStorage.setItem('neon_planner_todos', JSON.stringify(state.todos));
  triggerGDriveAutoSync();
}

function saveRoutines() {
  localStorage.setItem('neon_planner_routines', JSON.stringify(state.routines));
  triggerGDriveAutoSync();
}

function saveRoutinesPopulatedDates() {
  localStorage.setItem('neon_planner_populated_dates', JSON.stringify(state.routinesPopulatedDates));
  triggerGDriveAutoSync();
}

function saveCategories() {
  localStorage.setItem('neon_planner_categories', JSON.stringify(state.categories));
  triggerGDriveAutoSync();
}

function handleDeleteCategory(catId) {
  if (!confirm(`'${state.categories[catId].label}' 카테고리를 삭제하시겠습니까?\n기존 할 일들의 글씨는 유지되며, 달력의 도트는 흰색으로 변경됩니다.`)) {
    return;
  }
  
  pushToHistory();

  // Delete from state
  delete state.categories[catId];
  
  // Save categories to localStorage
  saveCategories();

  // If the deleted category was selected, change selection to 'other'
  if (state.selectedCategory === catId) {
    state.selectedCategory = 'other';
  }

  // If the deleted category was active in the filter tabs, reset to 'all'
  if (state.todoFilterCategory === catId) {
    state.todoFilterCategory = 'all';
  }

  // Update UI
  updateUI();
}

// Render search results inside the persistent layout section
function renderSearchResultsSection() {
  const section = document.getElementById('search-results-section');
  const grid = document.getElementById('search-results-grid');
  if (!section || !grid) return;

  const query = state.searchQuery.trim().toLowerCase();
  if (query === '') {
    section.classList.add('hidden');
    grid.innerHTML = '';
    return;
  }

  section.classList.remove('hidden');
  grid.innerHTML = '';

  const results = [];

  // 1. Search Tabs
  const tabs = [
    { name: '달력', id: 'btn-toggle-calendar' },
    { name: '할일', id: 'btn-toggle-todos' },
    { name: '기록', id: 'btn-toggle-records' },
    { name: '타임라인', id: 'btn-toggle-timeline' },
    { name: '디데이', id: 'btn-toggle-ddays' },
    { name: '분석', id: 'btn-toggle-analytics' },
    { name: '설정', id: 'btn-toggle-control-panel' }
  ];

  tabs.forEach(tab => {
    if (tab.name.includes(query)) {
      results.push({
        type: '⚙️ 이동',
        dateText: '시스템 기능',
        text: `${tab.name} 탭 보기`,
        action: () => {
          let section = '';
          if (tab.id === 'btn-toggle-calendar') section = 'calendar';
          else if (tab.id === 'btn-toggle-todos') section = 'todos';
          else if (tab.id === 'btn-toggle-records') section = 'records';
          else if (tab.id === 'btn-toggle-timeline') section = 'timeline';
          else if (tab.id === 'btn-toggle-ddays') section = 'ddays';
          else if (tab.id === 'btn-toggle-analytics') section = 'analytics';
          else if (tab.id === 'btn-toggle-control-panel') section = 'settings';

          if (section) {
            let isClosed = false;
            if (section === 'calendar' && !state.showCalendar) isClosed = true;
            else if (section === 'todos' && !state.showTodos) isClosed = true;
            else if (section === 'records' && !state.showRecords) isClosed = true;
            else if (section === 'timeline' && !state.showTimeline) isClosed = true;
            else if (section === 'ddays' && !state.showDdays) isClosed = true;
            else if (section === 'analytics' && !state.showAnalytics) isClosed = true;
            else if (section === 'settings' && !state.showControlPanel) isClosed = true;

            if (isClosed) {
              if (!searchAutoOpenedSections.includes(section)) {
                searchAutoOpenedSections.push(section);
              }
            }
          }
          const btn = document.getElementById(tab.id);
          if (btn) btn.click();
          
          setTimeout(() => {
            const header = document.querySelector('.global-header');
            if (header) header.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      });
    }
  });

  // 2. Search Todos
  Object.keys(state.todos).forEach(dateKey => {
    state.todos[dateKey].forEach(todo => {
      const cat = getCategory(todo.category);
      const catLabel = cat && cat.label ? String(cat.label).toLowerCase() : '';
      if (todo.text.toLowerCase().includes(query) || catLabel.includes(query)) {
        results.push({
          type: '📅 할일',
          dateText: formatDateKeyToMonthDay(dateKey),
          text: todo.text,
          action: () => {
            state.selectedDate = dateKey;
            
            if (!state.showTodos) {
              state.showTodos = true;
              localStorage.setItem('neon_planner_show_todos', 'true');
              if (!searchAutoOpenedSections.includes('todos')) {
                searchAutoOpenedSections.push('todos');
              }
            }
            
            updateUI();
            
            setTimeout(() => {
              const todoEl = document.querySelector(`.todo-item[data-todo-id="${todo.id}"]`);
              if (todoEl) {
                todoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                todoEl.style.transition = 'background-color 0.5s ease';
                const origBg = todoEl.style.backgroundColor;
                todoEl.style.backgroundColor = 'rgba(99, 102, 241, 0.25)';
                setTimeout(() => {
                  todoEl.style.backgroundColor = origBg;
                }, 1500);
              }
            }, 200);
          }
        });
      }
    });
  });

  // 3. Search Diaries
  Object.keys(state.diaries).forEach(dateKey => {
    state.diaries[dateKey].forEach(record => {
      if (record.text && record.text.toLowerCase().includes(query)) {
        results.push({
          type: '📝 기록',
          dateText: formatDateKeyToMonthDay(dateKey),
          text: record.text,
          action: () => {
            state.selectedDate = dateKey;
            
            if (!state.showRecords) {
              state.showRecords = true;
              localStorage.setItem('neon_planner_show_records', 'true');
              if (!searchAutoOpenedSections.includes('records')) {
                searchAutoOpenedSections.push('records');
              }
            }
            
            updateUI();
            
            setTimeout(() => {
              const recordEl = document.querySelector(`.diary-record-card[data-record-id="${record.id}"]`);
              if (recordEl) {
                recordEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                recordEl.style.transition = 'background-color 0.5s ease';
                const origBg = recordEl.style.backgroundColor;
                recordEl.style.backgroundColor = 'rgba(99, 102, 241, 0.25)';
                setTimeout(() => {
                  recordEl.style.backgroundColor = origBg;
                }, 1500);
              }
            }, 200);
          }
        });
      }
    });
  });

  if (results.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'search-dropdown-empty';
    empty.style.gridColumn = '1 / -1';
    empty.textContent = '검색 결과가 없습니다.';
    grid.appendChild(empty);
    return;
  }

  // Render items as grid cards
  results.forEach(res => {
    const card = document.createElement('div');
    card.className = 'search-result-card';

    const header = document.createElement('div');
    header.className = 'search-result-card-header';

    const typeSpan = document.createElement('span');
    typeSpan.className = 'search-result-card-type';
    typeSpan.textContent = res.type;

    const dateSpan = document.createElement('span');
    dateSpan.className = 'search-result-card-date';
    dateSpan.textContent = res.dateText;

    header.appendChild(typeSpan);
    header.appendChild(dateSpan);

    const body = document.createElement('div');
    body.className = 'search-result-card-body';
    body.innerHTML = highlightMarkup(res.text, query);

    card.appendChild(header);
    card.appendChild(body);

    card.addEventListener('click', () => {
      res.action();
      applyPreferences();
      updateUI();
    });

    grid.appendChild(card);
  });
}

// Update UI view
function updateUI() {
  const btnToggleSearch = document.getElementById('btn-toggle-search');
  const btnToggleCalendar = document.getElementById('btn-toggle-calendar');
  const btnToggleTodos = document.getElementById('btn-toggle-todos');
  const btnToggleRecords = document.getElementById('btn-toggle-records');
  const btnToggleRoutines = document.getElementById('btn-toggle-routines');
  const btnToggleTimeline = document.getElementById('btn-toggle-timeline');
  const btnToggleAnalytics = document.getElementById('btn-toggle-analytics');
  const btnToggleControlPanel = document.getElementById('btn-toggle-control-panel');

  const logoText = document.querySelector('.logo-text');
  if (logoText) {
    let titleStr = state.appTitle || '플래너';
    titleStr = titleStr.replace(/📁/g, '').trim(); // Remove any folder emoji user might have added
    logoText.textContent = titleStr;
  }

  if (btnToggleSearch) {
    btnToggleSearch.innerHTML = `${state.tabIcons.search || '🔍'} <span class="btn-text">${highlightMarkup('검색', state.searchQuery)}</span>`;
  }
  if (btnToggleCalendar) {
    btnToggleCalendar.innerHTML = `${state.tabIcons.calendar || '📅'} <span class="btn-text">${highlightMarkup('달력', state.searchQuery)}</span>`;
  }
  if (btnToggleTodos) {
    btnToggleTodos.innerHTML = `${state.tabIcons.todos || '🎯'} <span class="btn-text">${highlightMarkup('할일', state.searchQuery)}</span>`;
  }
  if (btnToggleRecords) {
    btnToggleRecords.innerHTML = `${state.tabIcons.records || '📝'} <span class="btn-text">${highlightMarkup('기록', state.searchQuery)}</span>`;
  }
  if (btnToggleRoutines) {
    btnToggleRoutines.innerHTML = `${state.tabIcons.routines || '🔄'} <span class="btn-text">${highlightMarkup('루틴', state.searchQuery)}</span>`;
  }
  if (btnToggleTimeline) {
    btnToggleTimeline.innerHTML = `${state.tabIcons.timeline || '⏳'} <span class="btn-text">${highlightMarkup('타임라인', state.searchQuery)}</span>`;
  }
  const btnToggleDdays = document.getElementById('btn-toggle-ddays');
  if (btnToggleDdays) {
    btnToggleDdays.innerHTML = `${state.tabIcons.ddays || '🎉'} <span class="btn-text">${highlightMarkup('디데이', state.searchQuery)}</span>`;
  }
  if (btnToggleAnalytics) {
    btnToggleAnalytics.innerHTML = `${state.tabIcons.analytics || '📊'} <span class="btn-text">${highlightMarkup('분석', state.searchQuery)}</span>`;
  }
  if (btnToggleControlPanel) {
    btnToggleControlPanel.innerHTML = `${state.tabIcons.settings || '⚙️'} <span class="btn-text">${highlightMarkup('설정', state.searchQuery)}</span>`;
  }

  renderCalendar();
  renderCategorySelector();
  renderCategoryFilterTabs();
  renderTodos();
  applyCopyModeBanner();
  renderDiary();
  applyRoutinesVisibility();
  applyTimelineVisibility();
  applyDdaysVisibility();
  renderSearchResultsSection();
  applyLayoutSectionOrder();
}

// Handle selection/toggle of category filter tab
function handleSelectTodoFilterCategory(catId) {
  if (state.todoFilterCategory === catId) {
    // If the active category tab is clicked again, toggle back to 'all'
    state.todoFilterCategory = 'all';
  } else {
    state.todoFilterCategory = catId;
    // When switching to a specific category tab, sync selectedCategory for add form
    if (catId !== 'all' && catId !== 'routine' && state.categories[catId]) {
      state.selectedCategory = catId;
    }
  }
  updateUI();
}

// Render Todo Category Filter Tabs Bar
function renderCategoryFilterTabs() {
  const container = document.getElementById('todo-cat-filter-tabs');
  if (!container) return;
  container.innerHTML = '';

  const currentDayTodos = (state.todos && state.todos[state.selectedDate]) ? state.todos[state.selectedDate] : [];
  const totalCount = currentDayTodos.length;
  const routineCount = currentDayTodos.filter(t => Boolean(t.isRoutine)).length;
  const catCounts = {};
  currentDayTodos.forEach(t => {
    let cat = t.category || 'other';
    if (!state.categories[cat]) {
      const matchKey = Object.keys(state.categories).find(k => state.categories[k].label === cat);
      if (matchKey) cat = matchKey;
    }
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  const activeFilter = state.todoFilterCategory || 'all';

  // 1. "전체" (All) Tab
  const allTab = document.createElement('button');
  allTab.type = 'button';
  allTab.className = `todo-cat-filter-tab ${activeFilter === 'all' ? 'active' : ''}`;
  allTab.dataset.category = 'all';
  allTab.setAttribute('role', 'tab');
  allTab.setAttribute('aria-selected', activeFilter === 'all' ? 'true' : 'false');
  allTab.title = '전체 할 일 보기';
  allTab.innerHTML = `
    <span class="tab-label">전체</span>
    <span class="tab-badge">${totalCount}</span>
  `;
  allTab.addEventListener('click', () => {
    handleSelectTodoFilterCategory('all');
  });
  container.appendChild(allTab);

  // 2. "루틴" (Routine) Tab
  const routineTab = document.createElement('button');
  routineTab.type = 'button';
  routineTab.className = `todo-cat-filter-tab ${activeFilter === 'routine' ? 'active' : ''}`;
  routineTab.dataset.category = 'routine';
  routineTab.setAttribute('role', 'tab');
  routineTab.setAttribute('aria-selected', activeFilter === 'routine' ? 'true' : 'false');
  routineTab.title = '루틴(매일 반복) 할 일만 보기 (클릭 시 토글)';
  
  const routineDot = document.createElement('span');
  routineDot.className = 'cat-filter-dot';
  routineDot.style.backgroundColor = '#a855f7';
  if (activeFilter === 'routine') {
    routineDot.style.boxShadow = '0 0 6px #a855f7';
  }

  const routineLabelSpan = document.createElement('span');
  routineLabelSpan.className = 'tab-label';
  routineLabelSpan.innerHTML = '🔄 루틴';

  const routineBadgeSpan = document.createElement('span');
  routineBadgeSpan.className = 'tab-badge';
  routineBadgeSpan.textContent = routineCount;

  routineTab.appendChild(routineDot);
  routineTab.appendChild(routineLabelSpan);
  routineTab.appendChild(routineBadgeSpan);

  routineTab.addEventListener('click', () => {
    handleSelectTodoFilterCategory('routine');
  });
  container.appendChild(routineTab);

  // 3. Individual Category Tabs
  Object.keys(state.categories).forEach(catId => {
    const cat = state.categories[catId];
    const count = catCounts[catId] || 0;
    const isActive = activeFilter === catId;

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = `todo-cat-filter-tab ${isActive ? 'active' : ''}`;
    tab.dataset.category = catId;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    tab.title = `${cat.label} 탭의 할 일만 보기 (클릭 시 토글)`;

    if (cat.color) {
      tab.style.setProperty('--cat-color', cat.color);
      const rgb = hexToRgb(cat.color);
      if (rgb) {
        tab.style.setProperty('--cat-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
    }

    const dot = document.createElement('span');
    dot.className = 'cat-filter-dot';
    dot.style.backgroundColor = cat.color || 'var(--accent-color)';
    if (isActive) {
      dot.style.boxShadow = `0 0 6px ${cat.color || 'var(--accent-color)'}`;
    }

    const labelSpan = document.createElement('span');
    labelSpan.className = 'tab-label';
    labelSpan.textContent = cat.label;

    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'tab-badge';
    badgeSpan.textContent = count;

    tab.appendChild(dot);
    tab.appendChild(labelSpan);
    tab.appendChild(badgeSpan);

    tab.addEventListener('click', () => {
      handleSelectTodoFilterCategory(catId);
    });

    container.appendChild(tab);
  });
}

// Render Dynamic Category Selection Pills
function renderCategorySelector() {
  const routineCategorySelector = document.getElementById('routine-category-selector');
  if (categorySelector) categorySelector.innerHTML = '';
  if (routineCategorySelector) routineCategorySelector.innerHTML = '';

  // Render both default and custom categories from state
  Object.keys(state.categories).forEach(catId => {
    const cat = state.categories[catId];
    const option = document.createElement('span');
    const isSelected = (catId === state.selectedCategory) || (state.todoFilterCategory !== 'all' && state.todoFilterCategory !== 'routine' && catId === state.todoFilterCategory);
    option.className = `cat-option ${isSelected ? 'selected' : ''}`;
    
    if (cat.class) {
      option.classList.add(cat.class);
    } else {
      // Dynamic styles for custom category
      option.style.color = cat.color;
      option.style.backgroundColor = hexToRgba(cat.color, 0.1);
    }
    option.dataset.category = catId;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = cat.label;
    option.appendChild(labelSpan);

    // Allow edit and delete for any category except the 'other' fallback
    if (catId !== 'other') {
      // Edit button
      const editBtn = document.createElement('span');
      editBtn.className = 'edit-cat-btn';
      editBtn.innerHTML = '✏️';
      editBtn.title = '카테고리 수정';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Avoid triggering selection
        startEditCategory(catId);
      });
      option.appendChild(editBtn);

      // Delete button
      const deleteBtn = document.createElement('span');
      deleteBtn.className = 'delete-cat-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.title = '카테고리 삭제';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Avoid triggering selection
        handleDeleteCategory(catId);
      });
      option.appendChild(deleteBtn);

      // Double-click directly to edit
      option.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        startEditCategory(catId);
      });
      option.title = '더블클릭하여 카테고리 수정 (모바일: 길게 누르기)';

      // Long press support (Mouse + Touch) for editing category in phone mode
      let catPressTimer = null;
      const startCatPress = (e) => {
        if (state.device !== 'phone') return; // Only in mobile mode
        if (e.type === 'mousedown' && e.button !== 0) return; // Only left click for mouse simulation
        
        catPressTimer = setTimeout(() => {
          catPressTimer = null;
          startEditCategory(catId);
        }, 600); // 600ms hold
      };

      const cancelCatPress = () => {
        if (catPressTimer) {
          clearTimeout(catPressTimer);
          catPressTimer = null;
        }
      };

      option.addEventListener('touchstart', startCatPress, { passive: true });
      option.addEventListener('touchend', cancelCatPress);
      option.addEventListener('touchmove', cancelCatPress);
      option.addEventListener('touchcancel', cancelCatPress);

      option.addEventListener('mousedown', startCatPress);
      option.addEventListener('mouseup', cancelCatPress);
      option.addEventListener('mouseleave', cancelCatPress);
      option.addEventListener('mousemove', cancelCatPress);
    }

    option.addEventListener('click', () => {
      handleSelectTodoFilterCategory(catId);
    });

    if (categorySelector) categorySelector.appendChild(option);

    if (routineCategorySelector) {
      const routineOption = option.cloneNode(true);
      // Remove edit/delete buttons from the routine picker clone
      const editBtn = routineOption.querySelector('.edit-cat-btn');
      const delBtn = routineOption.querySelector('.delete-cat-btn');
      if (editBtn) editBtn.remove();
      if (delBtn) delBtn.remove();

      routineOption.addEventListener('click', () => {
        routineCategorySelector.querySelectorAll('.cat-option').forEach(el => el.classList.remove('selected'));
        routineOption.classList.add('selected');
        state.selectedCategory = catId;

        // Keep main selector in sync
        if (categorySelector) {
          categorySelector.querySelectorAll('.cat-option').forEach(el => el.classList.remove('selected'));
          const matchingMainOption = categorySelector.querySelector(`.cat-option[data-category="${catId}"]`);
          if (matchingMainOption) matchingMainOption.classList.add('selected');
        }
      });
      routineCategorySelector.appendChild(routineOption);
    }
  });

  // Render "+" trigger pill
  const addTrigger = document.createElement('span');
  addTrigger.className = 'cat-option add-cat-trigger';
  addTrigger.textContent = '+ 추가';
  addTrigger.title = '새 카테고리 추가';
  addTrigger.addEventListener('click', () => {
    toggleCategoryForm(true);
  });
  categorySelector.appendChild(addTrigger);
}

// Save diaries to LocalStorage
function saveDiaries() {
  localStorage.setItem('neon_planner_diaries', JSON.stringify(state.diaries));
  triggerGDriveAutoSync();
}

// Render the diary entry (records) for the selected date

function renderMediaToContainer(mediaObj, container, onClick) {
  if (mediaObj.fileId) {
    if (mediaObj.type === 'video') {
        const vid = document.createElement('video');
        vid.src = blobUrl;
        vid.style.width = '100%';
        vid.style.height = '100%';
        vid.style.objectFit = 'cover';
        vid.preload = 'metadata';

        if (isEditMode) {
           vid.controls = false;
           vid.muted = true;
           vid.playsInline = true;
           
           const playIcon = document.createElement('div');
           playIcon.innerHTML = '▶';
           playIcon.style.position = 'absolute';
           playIcon.style.top = '50%';
           playIcon.style.left = '50%';
           playIcon.style.transform = 'translate(-50%, -50%)';
           playIcon.style.color = 'white';
           playIcon.style.fontSize = '24px';
           playIcon.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
           playIcon.style.pointerEvents = 'none';
           container.appendChild(playIcon);
        } else {
           vid.controls = true;
        }

        vid.addEventListener('loadeddata', () => {
           vid.currentTime = 0.1; // Seek to first frame
        });

        container.appendChild(vid);
      } else if (mediaObj.type === 'pdf') {
        const pdfBtn = document.createElement('button');
        pdfBtn.type = 'button';
        pdfBtn.innerHTML = '📄 PDF';
        pdfBtn.style.padding = '8px';
        pdfBtn.style.background = '#3b82f6';
        pdfBtn.style.color = '#fff';
        pdfBtn.style.border = 'none';
        pdfBtn.style.borderRadius = '4px';
        pdfBtn.style.cursor = 'pointer';
        pdfBtn.style.width = '100%';
        pdfBtn.style.height = '100%';
        pdfBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.open(blobUrl, '_blank');
        });
        container.appendChild(pdfBtn);
      }
    }).catch(e => {
       console.error("Failed to load file:", e);
    });
  }
  return container;
}

// ====== FILE DB (IndexedDB) ======
const FileDB = {
  db: null,
  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("PlaneerFileDB", 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "id" });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };
      request.onerror = (e) => {
        console.error("FileDB init error:", e);
        reject(e);
      };
    });
  },
  async saveFile(blob, type, name) {
    if (!this.db) await this.init();
    const id = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("files", "readwrite");
      tx.objectStore("files").put({ id, blob, type, name, timestamp: Date.now() });
      tx.oncomplete = () => resolve(id);
      tx.onerror = (e) => reject(e);
    });
  },
  async getFile(id) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("files", "readonly");
      const request = tx.objectStore("files").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e);
    });
  },
  async deleteFile(id) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("files", "readwrite");
      tx.objectStore("files").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    });
  }
};
FileDB.init();

// ====== AUDIO RECORDING & STT ======
const AudioRecorder = {
  mediaRecorder: null,
  audioChunks: [],
  speechRecognition: null,
  isRecording: false,
  finalTranscript: '',
  lastInterim: '',
  onStop: null,
  onProgress: null,
  
  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.lang = 'ko-KR';
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      
      this.speechRecognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            this.finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        this.lastInterim = interim;
        if (this.onProgress) {
          this.onProgress(this.finalTranscript + interim);
        }
      };
      
      this.speechRecognition.onerror = (e) => console.error("AudioRecorder STT error:", e.error);
    }
  },

  async start(onStopCallback, onProgressCallback) {
    if (this.isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 96000 /* High quality */,
          channelCount: 2
        } 
      });
      
      const options = { audioBitsPerSecond: 320000 };
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a.40.2')) {
        options.mimeType = 'audio/mp4;codecs=mp4a.40.2';
      }
      
      this.mediaRecorder = new MediaRecorder(stream, options);
      this.audioChunks = [];
      this.finalTranscript = '';
      this.lastInterim = '';
      this.onStop = onStopCallback;
      this.onProgress = onProgressCallback;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result;
          if (this.onStop) {
            this.onStop(base64Audio, this.finalTranscript.trim());
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      
      if (this.speechRecognition) {
        try { this.speechRecognition.start(); } catch(e) {}
      }
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      alert("마이크 접근 권한이 필요합니다.");
    }
  },

  stop() {
    if (!this.isRecording) return;
    this.isRecording = false;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.speechRecognition) {
      try { this.speechRecognition.stop(); } catch(e) {}
    }
  }
};
AudioRecorder.init();

function renderAudioPreviews(containerId, draftArray, onChangeCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  draftArray.forEach((audioData, idx) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';
    wrapper.style.background = 'rgba(255,255,255,0.05)';
    wrapper.style.padding = '12px';
    wrapper.style.borderRadius = '8px';
    wrapper.style.border = '1px solid rgba(255,255,255,0.1)';
    wrapper.style.marginBottom = '8px';

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';

    const audioEl = document.createElement('audio');
    audioEl.controls = true;
    audioEl.src = audioData.src || audioData;
    audioEl.style.height = '36px';
    audioEl.style.flex = '1';
    
    row.appendChild(audioEl);

    if (onChangeCallback) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.innerHTML = '❌';
      delBtn.title = '녹음 파일 삭제';
      delBtn.style.background = 'none';
      delBtn.style.border = 'none';
      delBtn.style.cursor = 'pointer';
      delBtn.style.fontSize = '1.2rem';
      delBtn.addEventListener('click', () => {
        draftArray.splice(idx, 1);
        onChangeCallback();
      });
      row.appendChild(delBtn);
    }
    wrapper.appendChild(row);

    // Transcription Text Block
    if (audioData.transcription) {
      const textRow = document.createElement('div');
      textRow.style.display = 'flex';
      textRow.style.alignItems = 'flex-start';
      textRow.style.gap = '8px';
      textRow.style.marginTop = '4px';
      
      const sttIcon = document.createElement('span');
      sttIcon.innerHTML = '📝';
      sttIcon.style.fontSize = '1.1rem';
      sttIcon.style.marginTop = '4px';
      textRow.appendChild(sttIcon);

      const textEl = document.createElement('textarea');
      textEl.style.flex = '1';
      textEl.style.fontSize = '0.9rem';
      textEl.style.color = '#fff';
      textEl.style.padding = '8px';
      textEl.style.background = 'rgba(0,0,0,0.3)';
      textEl.style.border = '1px solid #444';
      textEl.style.borderRadius = '4px';
      textEl.style.resize = 'vertical';
      textEl.style.minHeight = '40px';
      textEl.value = audioData.transcription;
      
      if (!onChangeCallback) {
        textEl.readOnly = true;
      } else {
        textEl.addEventListener('change', (e) => {
          audioData.transcription = e.target.value;
          // We don't necessarily need to trigger onChangeCallback just for a text change to avoid re-rendering while typing
          // But when they blur/change, it's saved to the object.
        });
      }
      textRow.appendChild(textEl);

      if (onChangeCallback) {
        const delTextBtn = document.createElement('button');
        delTextBtn.type = 'button';
        delTextBtn.innerHTML = '🗑️';
        delTextBtn.title = '변환된 글자만 삭제';
        delTextBtn.style.background = 'none';
        delTextBtn.style.border = 'none';
        delTextBtn.style.cursor = 'pointer';
        delTextBtn.style.fontSize = '1.1rem';
        delTextBtn.style.padding = '4px';
        delTextBtn.addEventListener('click', () => {
          audioData.transcription = '';
          onChangeCallback(); // Re-render to remove the text block
        });
        textRow.appendChild(delTextBtn);
      }
      
      wrapper.appendChild(textRow);
    }

    container.appendChild(wrapper);
  });
}

function handleAudioDictateClick(btnId, inputId, draftsArray, containerId, onChange) {
  const btn = document.getElementById(btnId);
  const textField = document.getElementById(inputId);
  if (!btn) return;
  
  btn.addEventListener('click', () => {
    if (AudioRecorder.isRecording) {
      AudioRecorder.stop();
      btn.classList.remove('listening');
      btn.style.animation = 'none';
      btn.innerHTML = '🎙️';
    } else {
      btn.classList.add('listening');
      btn.style.animation = 'pulse 1.5s infinite';
      btn.innerHTML = '⏹️';
      AudioRecorder.start(
        (base64Audio, transcript) => {
          if (base64Audio) {
            draftsArray.push({ src: base64Audio, transcription: transcript });
            if (onChange) onChange();
          }
        },
        (interimTranscript) => {
          // Do not append to main text field anymore, we show it in the audio preview block
          // But to show it's listening, we could update the button text temporarily
          if (interimTranscript.trim() !== '') {
            btn.innerHTML = '듣는 중...';
          }
        }
      );
      if (textField) AudioRecorder.initialText = textField.value;
    }
  });
}

// Setup dictate buttons for New Record and Todo Modal after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  handleVideoRecordClick('btn-video-record', state.diaryDraftImages, 'new-record-previews', () => {
    renderDiary();
  });
  handleAudioDictateClick(
    'btn-dictate-record', 
    'new-record-text', 
    state.diaryDraftAudio, 
    'new-record-audio-previews', 
    () => renderAudioPreviews('new-record-audio-previews', state.diaryDraftAudio, () => renderAudioPreviews('new-record-audio-previews', state.diaryDraftAudio, null)) // Will hook to renderDiary later
  );
  
  // Fullscreen Drawing Modal Global Functions
  window.currentDrawingBoard = null;
  window.openFullscreenDrawing = function(initialData, onSaveCallback) {
    const modal = document.getElementById('drawing-fullscreen-modal');
    const container = document.getElementById('drawing-fullscreen-container');
    if (!modal || !container) return;
    
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // prevent bg scroll
    
    container.innerHTML = '';
    window.currentDrawingBoard = new NeonDrawingBoard(container, {
      initialData: initialData || [],
      onClose: (data) => {
        if (onSaveCallback) onSaveCallback(data);
        window.closeFullscreenDrawing();
      }
    });
  };

  window.closeFullscreenDrawing = function() {
    const modal = document.getElementById('drawing-fullscreen-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
    document.body.style.overflow = '';
    window.currentDrawingBoard = null;
  };
});
