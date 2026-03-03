<script setup lang="ts">
import type { Category } from '../types';
import * as LucideIcons from 'lucide-vue-next';
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  categories: Category[];
  activeCategoryId?: string;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'open-settings'): void;
  (e: 'add-category'): void;
  (e: 'edit-category', id: string): void;
  (e: 'delete-category', id: string): void;
  (e: 'reorder', ids: string[]): void;
}>();

const getIcon = (iconName: string) => {
  return (LucideIcons as any)[iconName] || LucideIcons.Folder;
};

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  categoryId: ''
});

const draggingCategoryId = ref<string>('');
const dragOverCategoryId = ref<string>('');

const handleContextMenu = (e: MouseEvent, categoryId: string) => {
  e.preventDefault();
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    categoryId
  };
};

const closeContextMenu = () => {
  contextMenu.value.visible = false;
};

const handleDragStart = (categoryId: string) => {
  draggingCategoryId.value = categoryId;
};

const handleDragOver = (e: DragEvent, categoryId: string) => {
  e.preventDefault();
  if (draggingCategoryId.value && draggingCategoryId.value !== categoryId) {
    dragOverCategoryId.value = categoryId;
  }
};

const handleDrop = (targetCategoryId: string) => {
  const sourceCategoryId = draggingCategoryId.value;
  if (!sourceCategoryId || sourceCategoryId === targetCategoryId) {
    dragOverCategoryId.value = '';
    return;
  }

  const currentIds = props.categories.map((c) => c.id);
  const sourceIndex = currentIds.indexOf(sourceCategoryId);
  const targetIndex = currentIds.indexOf(targetCategoryId);
  if (sourceIndex < 0 || targetIndex < 0) {
    dragOverCategoryId.value = '';
    return;
  }

  const nextIds = [...currentIds];
  const [moved] = nextIds.splice(sourceIndex, 1);
  nextIds.splice(targetIndex, 0, moved);
  emit('reorder', nextIds);
  dragOverCategoryId.value = '';
};

const handleDragEnd = () => {
  draggingCategoryId.value = '';
  dragOverCategoryId.value = '';
};

onMounted(() => {
  window.addEventListener('click', closeContextMenu);
});

onUnmounted(() => {
  window.removeEventListener('click', closeContextMenu);
});
</script>

<template>
  <div class="w-24 h-full flex flex-col items-center py-6 gap-6 z-10 backdrop-blur-sm bg-black/10 border-r border-white/5 relative">
    <div class="flex-1 min-h-0 w-full flex flex-col justify-center">
      <div class="max-h-full w-full overflow-y-auto no-scrollbar flex flex-col items-center gap-6">
        <button
          v-for="category in categories"
          :key="category.id"
          class="flex flex-col items-center gap-1 group w-full flex-shrink-0"
          :class="[
            draggingCategoryId === category.id ? 'opacity-60' : '',
            dragOverCategoryId === category.id ? 'scale-[1.03]' : ''
          ]"
          draggable="true"
          @click="emit('select', category.id)"
          @contextmenu="handleContextMenu($event, category.id)"
          @dragstart="handleDragStart(category.id)"
          @dragover="handleDragOver($event, category.id)"
          @drop="handleDrop(category.id)"
          @dragend="handleDragEnd"
        >
          <div
            class="p-2 rounded-xl transition-all duration-300"
            :class="activeCategoryId === category.id ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/50 hover:text-white hover:bg-white/10'"
          >
            <img
              v-if="category.icon.startsWith('data:') || category.icon.startsWith('http') || category.icon.startsWith('/')"
              :src="category.icon"
              class="w-6 h-6 object-contain"
            />
            <component v-else :is="getIcon(category.icon)" class="w-6 h-6" />
          </div>
          <span
            class="text-xs font-medium transition-colors"
            :class="activeCategoryId === category.id ? 'text-white' : 'text-white/50 group-hover:text-white'"
          >
            {{ category.name }}
          </span>
        </button>

        <button
          class="flex flex-col items-center gap-1 group w-full opacity-60 hover:opacity-100 transition-opacity mt-2 flex-shrink-0"
          @click="emit('add-category')"
        >
          <div class="p-2 rounded-xl text-white/50 group-hover:text-white group-hover:bg-white/10 transition-all duration-300 border border-dashed border-white/20">
            <LucideIcons.Plus class="w-6 h-6" />
          </div>
          <span class="text-xs font-medium text-white/50 group-hover:text-white">添加</span>
        </button>
      </div>
    </div>

    <button
      class="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
      @click="emit('open-settings')"
    >
      <LucideIcons.Settings class="w-7 h-7" />
    </button>

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="fixed z-[100] bg-zinc-900 border border-white/10 rounded-lg shadow-xl py-1 w-32 backdrop-blur-md"
        :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
        @click.stop
        @contextmenu.prevent
      >
        <button
          class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
          @click="emit('edit-category', contextMenu.categoryId); closeContextMenu()"
        >
          <LucideIcons.Edit2 class="w-4 h-4" /> 编辑
        </button>
        <button
          class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 flex items-center gap-2 transition-colors"
          @click="emit('delete-category', contextMenu.categoryId); closeContextMenu()"
        >
          <LucideIcons.Trash2 class="w-4 h-4" /> 删除
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
