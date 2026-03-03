<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { Settings as SettingsIcon } from "lucide-vue-next";
import Background from "./components/Background.vue";
import SearchBar from "./components/SearchBar.vue";
import Sidebar from "./components/Sidebar.vue";
import WebsiteGrid from "./components/WebsiteGrid.vue";
import SettingsModal from "./components/SettingsModal.vue";
import AddWebsiteModal from "./components/AddWebsiteModal.vue";
import CategoryModal from "./components/CategoryModal.vue";
import { DEFAULT_SETTINGS, DEFAULT_CATEGORIES } from "./types";
import type { Settings, Website, Category } from "./types";
import { storage } from "./utils/storage";

const settings = ref<Settings>(DEFAULT_SETTINGS);
const websites = ref<Website[]>([]);
const categories = ref<Category[]>(DEFAULT_CATEGORIES);

const showSettings = ref(false);
const showAddWebsite = ref(false);
const showCategoryModal = ref(false);
const editingWebsite = ref<Website | null>(null);
const editingCategory = ref<Category | null>(null);

const activeCategoryId = ref<string>("");

const sortCategoriesByOrder = (list: Category[]) => {
  return [...list].sort((a, b) => a.order - b.order);
};

const normalizeCategoryOrder = (list: Category[]) => {
  return list.map((item, index) => ({ ...item, order: index + 1 }));
};

onMounted(async () => {
  const [loadedSettings, loadedWebsites, loadedCategories] = await Promise.all([
    storage.getSettings(),
    storage.getWebsites(),
    storage.getCategories(),
  ]);

  settings.value = loadedSettings;
  websites.value = loadedWebsites;
  categories.value = sortCategoriesByOrder(loadedCategories);

  // 自动修复：检测并替换会导致 ORB 错误的旧 Bilibili 图标链接
  const badBilibiliUrl = "https://upload.wikimedia.org/wikipedia/commons/7/75/Bilibili_logo.svg";
  const newBilibiliIcon =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23FB7299' rx='15'/><text x='50' y='50' font-family='Arial, sans-serif' font-weight='bold' font-size='24' fill='white' text-anchor='middle' dy='.35em'>bilibili</text></svg>";

  let dataNeedsUpdate = false;
  websites.value = websites.value.map((w) => {
    if (w.icon === badBilibiliUrl) {
      dataNeedsUpdate = true;
      return { ...w, icon: newBilibiliIcon };
    }
    return w;
  });

  if (dataNeedsUpdate) {
    await storage.saveWebsites(websites.value);
    console.log("已自动修复旧的 Bilibili 图标链接");
  }

  // Set initial active category
  if (categories.value.length > 0) {
    activeCategoryId.value = categories.value[0].id;
  }

  // Initial Demo Data if empty
  if (websites.value.length === 0) {
    const demoWebsites: Website[] = [];
    websites.value = demoWebsites;
    await storage.saveWebsites(demoWebsites);
  }

  // Storage synchronization for safety across tabs
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    storageChangeListener = async (changes, namespace) => {
      if (namespace === "local") {
        if (changes["newtab-settings"]) {
          const newSettings = await storage.getSettings();
          settings.value = newSettings;
        }
        if (changes["newtab-websites"]) {
          const newWebsites = await storage.getWebsites();
          websites.value = newWebsites;
        }
        if (changes["newtab-categories"]) {
          const newCategories = await storage.getCategories();
          categories.value = sortCategoriesByOrder(newCategories);
          if (!categories.value.find((c) => c.id === activeCategoryId.value) && categories.value.length > 0) {
            activeCategoryId.value = categories.value[0].id;
          }
        }
      }
    };
    chrome.storage.onChanged.addListener(storageChangeListener);
  }
});

onUnmounted(() => {
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
    scrollTimeout = null;
  }

  if (typeof chrome !== "undefined" && chrome.storage?.onChanged && storageChangeListener) {
    chrome.storage.onChanged.removeListener(storageChangeListener);
    storageChangeListener = null;
  }

  storage.releaseTransientResources();
});

const filteredWebsites = computed(() => {
  if (!activeCategoryId.value) return [];
  return websites.value.filter((w) => w.category === activeCategoryId.value).sort((a, b) => a.order - b.order);
});

const handleCategorySelect = (id: string) => {
  activeCategoryId.value = id;
};

// Scroll debounce timer
let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

let storageChangeListener: ((changes: Record<string, chrome.storage.StorageChange>, namespace: string) => void) | null =
  null;

const handleWheelScroll = (e: WheelEvent) => {
  if (scrollTimeout) return;

  const delta = e.deltaY;
  const currentIndex = categories.value.findIndex((c) => c.id === activeCategoryId.value);

  if (currentIndex === -1) return;

  let nextIndex = currentIndex;

  // Threshold for scroll sensitivity
  if (delta > 30) {
    // Scroll down -> Next category
    if (currentIndex < categories.value.length - 1) {
      nextIndex = currentIndex + 1;
    }
  } else if (delta < -30) {
    // Scroll up -> Previous category
    if (currentIndex > 0) {
      nextIndex = currentIndex - 1;
    }
  }

  if (nextIndex !== currentIndex) {
    activeCategoryId.value = categories.value[nextIndex].id;

    // Debounce to prevent rapid switching
    scrollTimeout = setTimeout(() => {
      scrollTimeout = null;
    }, 300);
  }
};

const handleOpenAddCategory = () => {
  editingCategory.value = null;
  showCategoryModal.value = true;
};

const handleEditCategory = (id: string) => {
  const category = categories.value.find((c) => c.id === id);
  if (category) {
    editingCategory.value = category;
    showCategoryModal.value = true;
  }
};

const handleSaveCategory = async (newCategory: Category) => {
  const index = categories.value.findIndex((c) => c.id === newCategory.id);
  if (index !== -1) {
    categories.value[index] = newCategory;
    categories.value = [...categories.value];
  } else {
    categories.value = [...categories.value, { ...newCategory, order: categories.value.length + 1 }];
  }

  categories.value = normalizeCategoryOrder(sortCategoriesByOrder(categories.value));
  await storage.saveCategories(categories.value);
  showCategoryModal.value = false;
  editingCategory.value = null;
};

const handleDeleteCategory = async (id: string) => {
  if (categories.value.length <= 1) {
    alert("至少保留一个分类");
    return;
  }

  if (confirm("确定要删除这个分类吗？该分类下的所有网站也会被删除。")) {
    categories.value = normalizeCategoryOrder(sortCategoriesByOrder(categories.value.filter((c) => c.id !== id)));

    websites.value = websites.value.filter((w) => w.category !== id);

    if (activeCategoryId.value === id) {
      activeCategoryId.value = categories.value[0].id;
    }

    await Promise.all([storage.saveCategories(categories.value), storage.saveWebsites(websites.value)]);
  }
};

const handleReorderCategories = async (ids: string[]) => {
  const map = new Map(categories.value.map((item) => [item.id, item]));
  const reordered = ids.map((id) => map.get(id)).filter((item): item is Category => !!item);

  if (reordered.length !== categories.value.length) {
    return;
  }

  categories.value = normalizeCategoryOrder(reordered);
  await storage.saveCategories(categories.value);
};

const handleSaveSettings = async (newSettings: Settings) => {
  settings.value = newSettings;
  await storage.saveSettings(newSettings);
  showSettings.value = false;
};

const handleSaveWebsite = async (newWebsite: Website) => {
  const index = websites.value.findIndex((w) => w.id === newWebsite.id);
  if (index !== -1) {
    // Update existing
    websites.value[index] = newWebsite;
    // Trigger reactivity for array mutation if needed, though replacing element usually works in Vue 3 ref
    websites.value = [...websites.value];
  } else {
    // Add new
    websites.value = [...websites.value, newWebsite];
  }

  await storage.saveWebsites(websites.value);
  handleCloseAddWebsite();
};

const handleDeleteWebsite = async (id: string) => {
  websites.value = websites.value.filter((w) => w.id !== id);
  await storage.saveWebsites(websites.value);
};

const handleEditWebsite = (website: Website) => {
  editingWebsite.value = website;
  showAddWebsite.value = true;
};

const handleOpenSettings = () => {
  showSettings.value = true;
};

const handleOpenAddWebsite = () => {
  editingWebsite.value = null; // Clear editing state for new add
  showAddWebsite.value = true;
};

const handleCloseAddWebsite = () => {
  showAddWebsite.value = false;
  editingWebsite.value = null;
};
</script>

<template>
  <div class="relative min-h-screen w-full text-white overflow-hidden font-sans" @contextmenu.prevent>
    <Background :image="settings?.backgroundImage" />

    <div class="flex h-screen overflow-hidden">
      <!-- Sidebar -->
      <Sidebar
        v-if="!settings?.sidebarHidden"
        :categories="categories"
        :active-category-id="activeCategoryId"
        @select="handleCategorySelect"
        @open-settings="handleOpenSettings"
        @add-category="handleOpenAddCategory"
        @edit-category="handleEditCategory"
        @delete-category="handleDeleteCategory"
        @reorder="handleReorderCategories"
      />

      <!-- Main Content -->
      <div class="flex-1 flex flex-col items-center relative h-full">
        <!-- Floating settings when sidebar hidden -->
        <button
          v-if="settings?.sidebarHidden"
          class="absolute left-4 bottom-4 p-2 rounded-full bg-black/20 text-white/70 hover:text-white hover:bg-black/30 border border-white/10"
          @click="handleOpenSettings"
        >
          <SettingsIcon class="w-6 h-6" />
        </button>
        <!-- Search Bar (Pushed down slightly) -->
        <div class="mt-32 mb-10 w-full flex justify-center z-20">
          <SearchBar :engine="settings?.searchEngine" :custom-engines="settings?.customEngines" />
        </div>

        <!-- Website Grid (Centered in remaining space) -->
        <div
          class="flex-1 w-full flex justify-center items-start overflow-y-auto no-scrollbar"
          @wheel.prevent="handleWheelScroll"
        >
          <WebsiteGrid
            :websites="filteredWebsites"
            :settings="settings"
            @add-website="handleOpenAddWebsite"
            @delete-website="handleDeleteWebsite"
            @edit-website="handleEditWebsite"
          />
        </div>
      </div>
    </div>
  </div>

  <SettingsModal
    :is-open="showSettings"
    :settings="settings"
    @close="showSettings = false"
    @save="handleSaveSettings"
  />

  <AddWebsiteModal
    :is-open="showAddWebsite"
    :categories="categories"
    :active-category-id="activeCategoryId"
    :initial-data="editingWebsite"
    @close="handleCloseAddWebsite"
    @save="handleSaveWebsite"
  />

  <CategoryModal
    :is-open="showCategoryModal"
    :initial-data="editingCategory"
    @close="showCategoryModal = false"
    @save="handleSaveCategory"
  />
</template>
