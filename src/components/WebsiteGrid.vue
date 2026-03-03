<script setup lang="ts">
import type { Website } from '../types';
import WebsiteTile from './WebsiteTile.vue';
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
  websites: Website[]; // Now receives only the filtered list
  settings: any;
}>();

const emit = defineEmits<{
  (e: 'add-website'): void;
  (e: 'delete-website', id: string): void;
  (e: 'edit-website', website: Website): void;
}>();

const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuTarget = ref<Website | null>(null);

const handleContextMenu = (event: MouseEvent, website: Website) => {
  event.preventDefault();
  event.stopPropagation();
  contextMenuTarget.value = website;
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
  showContextMenu.value = true;
};

const closeContextMenu = () => {
  showContextMenu.value = false;
  contextMenuTarget.value = null;
};

const handleDelete = () => {
  if (contextMenuTarget.value) {
    emit('delete-website', contextMenuTarget.value.id);
  }
  closeContextMenu();
};

const handleEdit = () => {
  if (contextMenuTarget.value) {
    emit('edit-website', contextMenuTarget.value);
  }
  closeContextMenu();
};

const handleClickOutside = (event: MouseEvent) => {
  if (showContextMenu.value) {
     closeContextMenu();
  }
};

onMounted(() => {
  window.addEventListener('click', handleClickOutside);
  // We need to listen to context menu on window to close ours if right clicked elsewhere
  window.addEventListener('contextmenu', handleClickOutside); 
});

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside);
  window.removeEventListener('contextmenu', handleClickOutside);
});
</script>

<template>
  <div class="w-full max-w-4xl h-full flex flex-col justify-start">
      <div class="grid grid-cols-5 gap-x-8 gap-y-10 content-start">
        <div 
          v-for="website in websites" 
          :key="website.id"
          @contextmenu="(e) => handleContextMenu(e, website)"
        >
          <WebsiteTile 
            :website="website"
            :icon-radius="settings?.iconRadius"
            :icon-size="settings?.iconSize"
            :text-size="settings?.textSize"
          />
        </div>
        
        <!-- Add Button as the last tile -->
        <div 
          class="flex flex-col items-center gap-2 group cursor-pointer transition-transform hover:-translate-y-1"
          @click="emit('add-website')"
          @contextmenu.prevent
        >
           <div 
            class="bg-white/5 backdrop-blur-sm flex items-center justify-center overflow-hidden transition-all group-hover:bg-white/20 shadow-lg border-2 border-dashed border-white/20 group-hover:border-white/50"
            :class="{
              'w-12 h-12': settings?.iconSize === 'small',
              'w-20 h-20': settings?.iconSize === 'large',
              'w-16 h-16': !settings?.iconSize || settings?.iconSize === 'medium'
            }"
            :style="{ borderRadius: `${settings?.iconRadius ?? 20}%` }"
          >
             <span class="text-white/50 text-3xl font-light group-hover:text-white">+</span>
           </div>
           <span class="text-white/30 text-sm font-medium mt-1 group-hover:text-white/70">添加</span>
        </div>
      </div>

      <!-- Custom Context Menu -->
      <div 
        v-if="showContextMenu" 
        class="fixed z-50 bg-zinc-800 border border-white/10 rounded-lg shadow-xl py-1 w-32 backdrop-blur-md"
        :style="{ top: `${contextMenuPosition.y}px`, left: `${contextMenuPosition.x}px` }"
        @click.stop
        @contextmenu.prevent
      >
        <button 
          class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
          @click="handleEdit"
        >
          设置
        </button>
        <button 
          class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors"
          @click="handleDelete"
        >
          删除
        </button>
      </div>
  </div>
</template>
