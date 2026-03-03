<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Category, Website } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { normalizeHttpUrl, normalizeImageValue } from '../utils/validation';

const props = defineProps<{
  categories: Category[];
  isOpen: boolean;
  activeCategoryId: string;
  initialData?: Website | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', website: Website): void;
}>();

const getDefaultCategoryId = () => props.activeCategoryId || props.categories[0]?.id || '';

const form = ref({
  name: '',
  url: '',
  icon: '',
  category: getDefaultCategoryId()
});

const iconInputType = ref<'url' | 'upload'>('url');
const fileInput = ref<HTMLInputElement | null>(null);

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    if (props.initialData) {
      form.value = {
        name: props.initialData.name,
        url: props.initialData.url,
        icon: props.initialData.icon,
        category: props.initialData.category
      };
      iconInputType.value = props.initialData.icon.startsWith('data:') ? 'upload' : 'url';
    } else {
      resetForm();
    }
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

const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (items) {
    for (const item of items) {
      if (!item.type.includes('image')) continue;
      const blob = item.getAsFile();
      if (!blob) continue;
      const reader = new FileReader();
      reader.onload = (e) => {
        form.value.icon = e.target?.result as string;
      };
      reader.readAsDataURL(blob);
    }
  }
};

const save = () => {
  const name = form.value.name.trim();
  const normalizedUrl = normalizeHttpUrl(form.value.url);

  if (!name) {
    alert('名称不能为空');
    return;
  }

  if (!normalizedUrl) {
    alert('请输入有效网址（仅支持 http/https）');
    return;
  }

  const normalizedIcon = normalizeImageValue(form.value.icon);
  if (form.value.icon.trim() && !normalizedIcon) {
    alert('图标仅支持 http/https 链接或 data:image 格式');
    return;
  }

  const fallbackCategory = getDefaultCategoryId();

  const newWebsite: Website = {
    id: props.initialData?.id || uuidv4(),
    name,
    url: normalizedUrl,
    icon: normalizedIcon,
    category: form.value.category || fallbackCategory,
    order: props.initialData?.order || Date.now()
  };

  emit('save', newWebsite);
  resetForm();
};

const resetForm = () => {
  form.value = {
    name: '',
    url: '',
    icon: '',
    category: getDefaultCategoryId()
  };
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="emit('close')">
    <div class="bg-zinc-900 p-6 rounded-2xl w-[450px] text-white border border-white/10 shadow-2xl" @paste="handlePaste">
      <h2 class="text-xl font-semibold mb-6">{{ initialData ? '编辑图标' : '添加网站' }}</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-sm text-white/60 mb-1">名称</label>
          <input v-model="form.name" type="text" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-white/30" placeholder="例如: Bilibili" />
        </div>

        <div>
          <label class="block text-sm text-white/60 mb-1">网址</label>
          <input v-model="form.url" type="text" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-white/30" placeholder="example.com" />
        </div>


        <div>
          <label class="block text-sm text-white/60 mb-1">图标 (支持粘贴图片)</label>
          <div class="flex gap-2 mb-2">
            <button
              class="px-3 py-1 rounded-md text-xs transition-colors"
              :class="iconInputType === 'url' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'"
              @click="iconInputType = 'url'"
            >
              图片链接
            </button>
            <button
              class="px-3 py-1 rounded-md text-xs transition-colors"
              :class="iconInputType === 'upload' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'"
              @click="iconInputType = 'upload'"
            >
              上传图片
            </button>
          </div>

          <input
            v-if="iconInputType === 'url'"
            v-model="form.icon"
            type="text"
            class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
            placeholder="https://example.com/icon.png"
          />
          <input
            v-else
            type="file"
            accept="image/*"
            ref="fileInput"
            class="w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-white/10 file:text-white hover:file:bg-white/20"
            @change="handleFileUpload"
          />

          <div v-if="form.icon" class="mt-2 flex justify-center">
             <img :src="form.icon" class="w-12 h-12 rounded-lg object-cover bg-white/10" />
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
