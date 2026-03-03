<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Category } from '../types';
import * as LucideIcons from 'lucide-vue-next';
import { v4 as uuidv4 } from 'uuid';
import { normalizeImageValue } from '../utils/validation';

const props = defineProps<{
  isOpen: boolean;
  initialData?: Category | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', category: Category): void;
}>();

const ICON_GROUPS: Record<string, string[]> = {
  常规: ['Home', 'Folder', 'Bookmark', 'Star', 'Heart', 'Flag', 'Globe', 'MapPin', 'Calendar', 'Clock', 'Coffee', 'Sun'],
  科技: ['Laptop', 'Smartphone', 'Monitor', 'HardDrive', 'Code', 'Terminal', 'Cpu', 'Cloud', 'Database', 'Wifi', 'Shield', 'Zap'],
  生活: ['ShoppingBag', 'ShoppingCart', 'Wallet', 'Package', 'Car', 'Plane', 'Train', 'Bike', 'Book', 'School', 'Briefcase', 'Building2'],
  娱乐: ['Gamepad2', 'Music', 'Headphones', 'Camera', 'Film', 'PlayCircle', 'Tv', 'Mic2', 'Palette', 'Lightbulb', 'PenTool', 'Image']
};

const form = ref({
  name: '',
  icon: '',
});

const activeGroup = ref<keyof typeof ICON_GROUPS>('常规');
const fileInput = ref<HTMLInputElement | null>(null);

const iconList = computed(() => ICON_GROUPS[activeGroup.value]);

const getIcon = (iconName: string) => {
  return (LucideIcons as any)[iconName] || LucideIcons.Folder;
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    if (props.initialData) {
      form.value = {
        name: props.initialData.name,
        icon: props.initialData.icon,
      };
    } else {
      resetForm();
      form.value.icon = 'Folder';
    }
    activeGroup.value = '常规';
  }
});

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      form.value.icon = e.target?.result as string;
    };
    reader.readAsDataURL(target.files[0]);
  }
};

const selectIcon = (iconName: string) => {
  form.value.icon = iconName;
  if (fileInput.value) fileInput.value.value = '';
};

const save = () => {
  const name = form.value.name.trim();
  if (!name) {
    alert('分类名称不能为空');
    return;
  }

  const rawIcon = form.value.icon.trim();
  const normalizedImageIcon = normalizeImageValue(rawIcon);
  const icon = normalizedImageIcon || rawIcon || 'Folder';

  if (rawIcon && !normalizedImageIcon && (rawIcon.startsWith('http://') || rawIcon.startsWith('https://') || rawIcon.startsWith('data:'))) {
    alert('图标仅支持安全的 http/https 或 data:image');
    return;
  }

  const newCategory: Category = {
    id: props.initialData?.id || uuidv4(),
    name,
    icon,
    order: props.initialData?.order || Date.now()
  };

  emit('save', newCategory);
  resetForm();
};

const resetForm = () => {
  form.value = {
    name: '',
    icon: '',
  };
  if (fileInput.value) fileInput.value.value = '';
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="emit('close')">
    <div class="bg-zinc-900 p-6 rounded-2xl w-[520px] text-white border border-white/10 shadow-2xl max-h-[86vh] overflow-y-auto custom-scrollbar">
      <h2 class="text-xl font-semibold mb-6">{{ initialData ? '编辑分类' : '添加分类' }}</h2>

      <div class="space-y-5">
        <div>
          <label class="block text-sm text-white/60 mb-1">分类名称</label>
          <input v-model="form.name" type="text" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-white/30" placeholder="例如: 日常" />
        </div>

        <div>
          <label class="block text-sm text-white/60 mb-2">内置图标库</label>
          <div class="flex gap-2 mb-3 flex-wrap">
            <button
              v-for="groupName in Object.keys(ICON_GROUPS)"
              :key="groupName"
              class="px-3 py-1 text-xs rounded-full border transition-colors"
              :class="activeGroup === groupName ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'"
              @click="activeGroup = groupName"
            >
              {{ groupName }}
            </button>
          </div>

          <div class="grid grid-cols-8 gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
            <button
              v-for="iconName in iconList"
              :key="iconName"
              class="h-10 rounded-lg flex items-center justify-center transition-colors border"
              :class="form.icon === iconName ? 'bg-blue-600/30 border-blue-500 text-white' : 'bg-black/20 border-transparent text-white/70 hover:text-white hover:bg-white/10'"
              @click="selectIcon(iconName)"
              :title="iconName"
            >
              <component :is="getIcon(iconName)" class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm text-white/60 mb-1">或上传本地图标</label>
          <input
            type="file"
            accept="image/*"
            ref="fileInput"
            class="w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-white/10 file:text-white hover:file:bg-white/20"
            @change="handleFileUpload"
          />
        </div>

        <div v-if="form.icon" class="mt-2 flex flex-col items-center p-4 bg-white/5 rounded-xl border border-white/10">
          <span class="text-xs text-white/40 mb-2">预览效果</span>
          <div class="flex flex-col items-center gap-1 group">
            <div class="p-2 rounded-xl bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              <img v-if="form.icon.startsWith('data:') || form.icon.startsWith('http')" :src="form.icon" class="w-5 h-5 object-contain" />
              <component v-else :is="getIcon(form.icon)" class="w-5 h-5" />
            </div>
            <span class="text-[10px] font-medium text-white">{{ form.name || '分类名' }}</span>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-8">
        <button @click="emit('close')" class="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm">取消</button>
        <button @click="save" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors text-sm shadow-lg shadow-blue-500/20">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
}
</style>
