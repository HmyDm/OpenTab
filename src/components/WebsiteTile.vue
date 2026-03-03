<script setup lang="ts">
import type { Website } from '../types';
import { computed } from 'vue';
import { normalizeHttpUrl } from '../utils/validation';

const props = defineProps<{
  website: Website;
  iconRadius?: number;
  iconSize?: 'small' | 'medium' | 'large';
  textSize?: 'small' | 'medium' | 'large';
}>();

const sizeClass = computed(() => {
  switch (props.iconSize) {
    case 'small': return 'w-12 h-12';
    case 'large': return 'w-20 h-20';
    default: return 'w-16 h-16';
  }
});

const textClass = computed(() => {
  switch (props.textSize) {
    case 'small': return 'text-sm';
    case 'large': return 'text-lg';
    default: return 'text-base';
  }
});

const borderRadius = computed(() => {
  return `${props.iconRadius ?? 20}%`;
});

const safeHref = computed(() => normalizeHttpUrl(props.website.url) || 'about:blank');
</script>

<template>
  <a :href="safeHref" target="_blank" rel="noopener noreferrer" class="flex flex-col items-center gap-2 group transition-transform hover:-translate-y-1">
    <div
      class="bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden transition-all group-hover:bg-white/20 shadow-lg"
      :class="sizeClass"
      :style="{ borderRadius: borderRadius }"
    >
      <img v-if="website.icon" :src="website.icon" :alt="website.name" class="w-full h-full object-cover" />
      <div v-else class="text-white font-bold text-xl">{{ website.name.charAt(0).toUpperCase() }}</div>
    </div>
    <span :class="[textClass, 'text-white/90 font-medium drop-shadow-md text-center line-clamp-1 w-28']">{{ website.name }}</span>
  </a>
</template>
