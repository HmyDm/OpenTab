<script setup lang="ts">
import { ref, watch } from "vue";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_SETTINGS, DEFAULT_RADIAL_MENU_SETTINGS } from "../types";
import type { Settings, RadialMenuSettings, ShortcutItem, RadialMenuModifierKey } from "../types";
import { storage } from "../utils/storage";
import { MAX_IMPORT_FILE_SIZE, normalizeHttpUrl, normalizeImportPayload } from "../utils/validation";

const props = defineProps<{
  settings: Settings;
  isOpen: boolean;
}>();

const normalizeCustomEngines = (input: unknown): { name: string; url: string; placeholder?: string }[] => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.filter(
      (item): item is { name: string; url: string; placeholder?: string } =>
        !!item && typeof item.name === "string" && typeof item.url === "string",
    );
  }
  if (typeof input === "object") {
    return Object.values(input as Record<string, unknown>).filter(
      (item): item is { name: string; url: string; placeholder?: string } =>
        !!item && typeof (item as any).name === "string" && typeof (item as any).url === "string",
    );
  }
  return [];
};

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", settings: Settings): void;
}>();

const activeTab = ref<"general" | "radial" | "export" | "about">("general");
const form = ref<Settings>({ ...DEFAULT_SETTINGS });
const radialMenuForm = ref<RadialMenuSettings>({
  ...DEFAULT_RADIAL_MENU_SETTINGS,
  shortcuts: [...DEFAULT_RADIAL_MENU_SETTINGS.shortcuts],
});

const showAddEngine = ref(false);
const newEngine = ref({ name: "", url: "" });
const importFileInput = ref<HTMLInputElement | null>(null);

watch(
  () => props.isOpen,
  async (newVal) => {
    if (newVal) {
      const cloned = JSON.parse(JSON.stringify(props.settings));
      cloned.customEngines = normalizeCustomEngines((cloned as any).customEngines);
      form.value = cloned;

      const menu = await storage.getRadialMenu();
      radialMenuForm.value = {
        enabled: menu.enabled,
        modifierKey: menu.modifierKey,
        scale: menu.scale,
        shortcuts: (menu.shortcuts || []).map((item) => ({ ...item })),
      };

      activeTab.value = "general";
      showAddEngine.value = false;
    }
  },
);

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      form.value.backgroundImage = e.target?.result as string;
    };
    reader.readAsDataURL(target.files[0]);
  }
};

const save = async () => {
  radialMenuForm.value.shortcuts = radialMenuForm.value.shortcuts
    .slice(0, 8)
    .map((item, index) => ({ ...item, order: index + 1 }));

  await storage.saveRadialMenu(radialMenuForm.value);
  emit("save", { ...form.value });
};

const addCustomEngine = () => {
  const name = newEngine.value.name.trim();
  const normalizedUrl = normalizeHttpUrl(newEngine.value.url);

  if (!name || !normalizedUrl) {
    alert("请输入有效的搜索引擎名称和 URL（仅支持 http/https）");
    return;
  }

  if (!form.value.customEngines) form.value.customEngines = [];
  form.value.customEngines.push({ name, url: normalizedUrl });
  newEngine.value = { name: "", url: "" };
  showAddEngine.value = false;
};

const removeCustomEngine = (index: number) => {
  if (form.value.searchEngine === form.value.customEngines?.[index].name) {
    form.value.searchEngine = "bing";
  }
  form.value.customEngines?.splice(index, 1);
};

const addShortcut = () => {
  if (radialMenuForm.value.shortcuts.length >= 8) {
    alert("快捷圆环最多支持 8 个快捷页面");
    return;
  }

  const nextOrder = radialMenuForm.value.shortcuts.length + 1;
  radialMenuForm.value.shortcuts.push({
    id: uuidv4(),
    name: `快捷 ${nextOrder}`,
    url: "",
    icon: "",
    order: nextOrder,
  });
};

const removeShortcut = (id: string) => {
  radialMenuForm.value.shortcuts = radialMenuForm.value.shortcuts
    .filter((item) => item.id !== id)
    .map((item, index) => ({ ...item, order: index + 1 }));
};

const moveShortcut = (index: number, direction: -1 | 1) => {
  const target = index + direction;
  if (target < 0 || target >= radialMenuForm.value.shortcuts.length) return;

  const list = [...radialMenuForm.value.shortcuts];
  const [moved] = list.splice(index, 1);
  list.splice(target, 0, moved);
  radialMenuForm.value.shortcuts = list.map((item, i) => ({ ...item, order: i + 1 }));
};

const setModifierKey = (key: RadialMenuModifierKey) => {
  radialMenuForm.value.modifierKey = key;
};

const ensureHttps = (shortcut: ShortcutItem) => {
  const url = shortcut.url.trim();
  if (!url) return;
  const normalized = normalizeHttpUrl(url);
  if (normalized) {
    shortcut.url = normalized;
  }
};

const handleExport = async () => {
  try {
    const [settings, websites, categories, radialMenu] = await Promise.all([
      storage.getSettingsForExport(),
      storage.getWebsitesForExport(),
      storage.getCategoriesForExport(),
      storage.getRadialMenuForExport(),
    ]);

    const data = {
      app: "openTab",
      author: "Zero",
      version: "1.0.0",
      timestamp: Date.now(),
      settings,
      websites,
      categories,
      radialMenu,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "opentab_info.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Export failed:", error);
    alert("导出失败");
  }
};

const triggerImport = () => {
  importFileInput.value?.click();
};

const handleImportFile = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      alert("导入失败：文件过大（最大 2MB）");
      target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        const normalized = normalizeImportPayload(data);

        if (!normalized) {
          alert("无效的配置文件");
          return;
        }

        await Promise.all([
          storage.saveSettings(normalized.settings),
          storage.saveWebsites(normalized.websites),
          storage.saveCategories(normalized.categories),
          storage.saveRadialMenu(normalized.radialMenu),
        ]);
        alert("导入成功，页面将刷新以应用更改");
        window.location.reload();
      } catch (error) {
        console.error("Import failed:", error);
        alert("导入失败，文件格式错误");
      } finally {
        target.value = "";
      }
    };
    reader.readAsText(file);
  }
};

const sizeLabels: Record<string, string> = {
  small: "最小",
  medium: "中等",
  large: "最大",
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div class="bg-zinc-900 rounded-2xl w-[640px] h-[680px] text-white border border-white/10 shadow-2xl flex flex-col">
      <div class="px-6 pt-6 pb-2 border-b border-white/5 shrink-0">
        <div class="flex gap-6 text-lg font-medium flex-wrap">
          <button
            class="pb-2 transition-colors relative"
            :class="activeTab === 'general' ? 'text-white' : 'text-white/50 hover:text-white'"
            @click="activeTab = 'general'"
          >
            常规设置
            <div v-if="activeTab === 'general'" class="absolute bottom-0 left-0 w-full h-0.5 bg-white"></div>
          </button>
          <button
            class="pb-2 transition-colors relative"
            :class="activeTab === 'radial' ? 'text-white' : 'text-white/50 hover:text-white'"
            @click="activeTab = 'radial'"
          >
            快捷圆环
            <div v-if="activeTab === 'radial'" class="absolute bottom-0 left-0 w-full h-0.5 bg-white"></div>
          </button>
          <button
            class="pb-2 transition-colors relative"
            :class="activeTab === 'export' ? 'text-white' : 'text-white/50 hover:text-white'"
            @click="activeTab = 'export'"
          >
            导出导入
            <div v-if="activeTab === 'export'" class="absolute bottom-0 left-0 w-full h-0.5 bg-white"></div>
          </button>
          <button
            class="pb-2 transition-colors relative"
            :class="activeTab === 'about' ? 'text-white' : 'text-white/50 hover:text-white'"
            @click="activeTab = 'about'"
          >
            关于
            <div v-if="activeTab === 'about'" class="absolute bottom-0 left-0 w-full h-0.5 bg-white"></div>
          </button>
        </div>
      </div>

      <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
        <div v-if="activeTab === 'general'" class="space-y-8">
          <div class="text-center">
            <h3 class="text-white mb-4">壁纸</h3>
            <div class="flex items-start gap-4 justify-center">
              <div class="w-40 h-24 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0">
                <img v-if="form.backgroundImage" :src="form.backgroundImage" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center text-xs text-white/30">默认壁纸</div>
              </div>
              <div class="text-left flex-1">
                <label
                  class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md text-sm text-white cursor-pointer transition-colors inline-block mb-3"
                >
                  更改壁纸
                  <input type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
                </label>
                <p class="text-xs text-white/50 leading-relaxed">
                  温馨提示：上传的壁纸请不要随意删除，每次运行插件都会读取本地的配置信息，找不到壁纸文件，会变成默认壁纸哦
                </p>
              </div>
            </div>
          </div>

          <div class="text-center">
            <h3 class="text-white mb-4">美观优化</h3>
            <div class="flex items-center justify-center gap-4">
              <span class="text-white/70 text-sm">是否开启侧边栏隐藏</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" v-model="form.sidebarHidden" />
                <div
                  class="w-12 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 transition-colors"
                ></div>
                <div
                  class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"
                ></div>
              </label>
            </div>
          </div>

          <div class="text-center">
            <h3 class="text-white mb-4">搜索引擎</h3>
            <div class="flex flex-wrap justify-center gap-3">
              <button
                class="px-4 py-1.5 rounded-full text-sm transition-all border border-transparent"
                :class="
                  form.searchEngine === 'bing'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                "
                @click="form.searchEngine = 'bing'"
              >
                Bing 必应
              </button>
              <button
                class="px-4 py-1.5 rounded-full text-sm transition-all border border-transparent"
                :class="
                  form.searchEngine === 'google'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                "
                @click="form.searchEngine = 'google'"
              >
                Google 谷歌
              </button>
              <button
                class="px-4 py-1.5 rounded-full text-sm transition-all border border-transparent"
                :class="
                  form.searchEngine === 'baidu'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                "
                @click="form.searchEngine = 'baidu'"
              >
                Baidu 百度
              </button>

              <div v-for="(engine, index) in form.customEngines" :key="index" class="relative group">
                <button
                  class="px-4 py-1.5 rounded-full text-sm transition-all border border-transparent"
                  :class="
                    form.searchEngine === engine.name
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  "
                  @click="form.searchEngine = engine.name"
                >
                  {{ engine.name }}
                </button>
                <button
                  class="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.stop="removeCustomEngine(index)"
                >
                  ×
                </button>
              </div>

              <button
                class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-white/70"
                @click="showAddEngine = !showAddEngine"
              >
                {{ showAddEngine ? "-" : "+" }}
              </button>
            </div>

            <div v-if="showAddEngine" class="mt-4 p-4 bg-white/5 rounded-lg border border-white/10 text-left">
              <div class="space-y-3">
                <div>
                  <label class="text-xs text-white/60 block mb-1">名称</label>
                  <input
                    v-model="newEngine.name"
                    type="text"
                    placeholder="例如: DuckDuckGo"
                    class="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label class="text-xs text-white/60 block mb-1">搜索URL (包含%s作为查询参数)</label>
                  <input
                    v-model="newEngine.url"
                    type="text"
                    placeholder="https://duckduckgo.com/?q="
                    class="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <button
                  @click="addCustomEngine"
                  class="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm py-1.5 rounded transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
          </div>

          <div class="text-center">
            <h3 class="text-white mb-4">图标圆角 ({{ form.iconRadius }}%)</h3>
            <input
              type="range"
              v-model.number="form.iconRadius"
              min="0"
              max="50"
              class="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div class="text-center">
            <h3 class="text-white mb-4">图标大小</h3>
            <div class="flex justify-center gap-8">
              <button
                v-for="size in ['small', 'medium', 'large']"
                :key="size"
                class="px-8 py-1.5 rounded-md text-sm transition-all w-24"
                :class="
                  form.iconSize === size ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                "
                @click="form.iconSize = size as any"
              >
                {{ sizeLabels[size] }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'radial'" class="space-y-6 pt-1">
          <div class="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-white font-medium">启用快捷圆环</h3>
                <p class="text-xs text-white/50 mt-1">任意网页按住「修饰键 + 鼠标左键」触发</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" v-model="radialMenuForm.enabled" />
                <div class="w-12 h-6 bg-white/10 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                <div
                  class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"
                ></div>
              </label>
            </div>

            <div>
              <p class="text-sm text-white/70 mb-2">触发快捷键</p>
              <div class="flex gap-2">
                <button
                  class="px-3 py-1.5 text-sm rounded-md border"
                  :class="
                    radialMenuForm.modifierKey === 'ctrl'
                      ? 'bg-blue-600 border-blue-500'
                      : 'bg-white/5 border-white/10 text-white/70'
                  "
                  @click="setModifierKey('ctrl')"
                >
                  Ctrl + 左键
                </button>
                <button
                  class="px-3 py-1.5 text-sm rounded-md border"
                  :class="
                    radialMenuForm.modifierKey === 'alt'
                      ? 'bg-blue-600 border-blue-500'
                      : 'bg-white/5 border-white/10 text-white/70'
                  "
                  @click="setModifierKey('alt')"
                >
                  Alt + 左键
                </button>
                <button
                  class="px-3 py-1.5 text-sm rounded-md border"
                  :class="
                    radialMenuForm.modifierKey === 'shift'
                      ? 'bg-blue-600 border-blue-500'
                      : 'bg-white/5 border-white/10 text-white/70'
                  "
                  @click="setModifierKey('shift')"
                >
                  Shift + 左键
                </button>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm text-white/70">轮盘大小</p>
                <span class="text-xs text-white/50">{{ radialMenuForm.scale }}%</span>
              </div>
              <input
                v-model.number="radialMenuForm.scale"
                type="range"
                min="70"
                max="140"
                step="5"
                class="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p class="text-xs text-white/45 mt-2">默认 70%，仅支持放大到 140%</p>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <h3 class="text-white font-medium">快捷页面 ({{ radialMenuForm.shortcuts.length }}/8)</h3>
              <button class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md text-sm" @click="addShortcut">
                新增快捷
              </button>
            </div>

            <div
              v-if="radialMenuForm.shortcuts.length === 0"
              class="text-sm text-white/50 bg-white/5 border border-white/10 rounded-lg p-4 text-center"
            >
              暂无快捷页面，点击「新增快捷」开始配置
            </div>

            <div
              v-for="(shortcut, index) in radialMenuForm.shortcuts"
              :key="shortcut.id"
              class="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2"
            >
              <div class="flex items-center gap-2">
                <span class="text-xs text-white/50 w-12">#{{ index + 1 }}</span>
                <input
                  v-model="shortcut.name"
                  type="text"
                  placeholder="名称"
                  class="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm"
                />
                <button
                  class="px-2 py-1 bg-white/10 rounded text-xs hover:bg-white/20"
                  @click="moveShortcut(index, -1)"
                >
                  上移
                </button>
                <button class="px-2 py-1 bg-white/10 rounded text-xs hover:bg-white/20" @click="moveShortcut(index, 1)">
                  下移
                </button>
                <button
                  class="px-2 py-1 bg-red-600/80 rounded text-xs hover:bg-red-500"
                  @click="removeShortcut(shortcut.id)"
                >
                  删除
                </button>
              </div>
              <input
                v-model="shortcut.url"
                type="text"
                placeholder="https://example.com"
                class="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm"
                @blur="ensureHttps(shortcut)"
              />
              <input
                v-model="shortcut.icon"
                type="text"
                placeholder="图标 URL（可选，留空自动抓取网站 favicon）"
                class="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'export'" class="space-y-6 pt-2">
          <p class="text-white/70 text-sm">配置信息保存在浏览器下载中</p>
          <div class="bg-white/10 rounded-md px-3 py-2 text-sm text-white/80 border border-white/10">
            opentab_info.json（默认保存名）
          </div>
          <button
            class="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-md text-white text-sm font-medium transition-colors"
            @click="handleExport"
          >
            导出
          </button>
          <div class="border-t border-dashed border-white/10"></div>
          <h3 class="text-white text-sm font-medium">配置信息</h3>
          <button
            class="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-md text-white text-sm font-medium transition-colors"
            @click="triggerImport"
          >
            导入配置并使用
          </button>
          <input type="file" ref="importFileInput" accept=".json" class="hidden" @change="handleImportFile" />
          <p class="text-xs text-white/50 leading-relaxed">
            温馨提示：导出的文件可以在任何安装了该插件的电脑上导入使用。
          </p>
        </div>

        <div v-if="activeTab === 'about'" class="space-y-4 pt-2">
          <p class="text-sm text-white/80">亲爱的用户，</p>
          <p class="text-sm text-white/70 leading-relaxed indent-8">
            你好！很高兴能使用这个插件，我个人是新标签页的爱好者之一，用图标化的风格加载收藏夹的方式是非常友好的，相对于默认的只能通过浏览器顶部的收藏夹，纯文字的点击方式真的让人崩溃。
          </p>
          <p class="text-sm text-white/70 leading-relaxed indent-8">
            这个项目是基于最先进的AI实现的，项目代码完全开源，本地运行，不会上传任何数据，你可以放心使用。（目前的AI已经能替代初、中级工程师的一些工作了）
          </p>
          <p class="text-sm text-white/70 leading-relaxed indent-8">
            感谢你使用这个插件，如果你有任何建议或意见，欢迎在下面的开源地址提issues或者Pull Request。
          </p>
          <div class="text-right mt-8">
            <p class="text-sm text-white/90 font-medium">作者</p>
            <p class="text-sm text-white/70">Zero</p>
          </div>
        </div>
      </div>

      <div class="p-6 border-t border-white/5 flex justify-between items-end shrink-0">
        <div class="text-xs text-white/40 space-y-1">
          <p>v1.0.0</p>
          <div class="flex gap-4">
            <a
              href="https://my.feishu.cn/wiki/R2FuwmbsRinF1hkEzcMcbzIpn0c"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-white/60"
              >使用须知</a
            >
            <a
              href="https://gitee.com/onedream10/opentab"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-white/60"
              >开源地址</a
            >
          </div>
          <p>本地运行，安全，放心</p>
        </div>
        <div class="flex gap-3">
          <button @click="emit('close')" class="px-4 py-2 text-white/50 hover:text-white text-sm transition-colors">
            取消
          </button>
          <button
            @click="save"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
