<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search } from 'lucide-vue-next';
import { normalizeHttpUrl } from '../utils/validation';

const props = defineProps<{
  engine?: string;
  customEngines?: { name: string; url: string; placeholder?: string }[];
}>();

const query = ref('');

type CustomEngine = { name: string; url: string; placeholder?: string };

const normalizeCustomEngines = (list: unknown): CustomEngine[] => {
  if (!list) return [];
  if (Array.isArray(list)) {
    return list.filter((item): item is CustomEngine => {
      if (!item || typeof item.name !== 'string' || typeof item.url !== 'string') return false;
      return !!normalizeHttpUrl(item.url);
    });
  }
  if (typeof list === 'object') {
    return Object.values(list as Record<string, unknown>).filter(
      (item): item is CustomEngine =>
        !!item &&
        typeof (item as any).name === 'string' &&
        typeof (item as any).url === 'string' &&
        !!normalizeHttpUrl((item as any).url)
    );
  }
  return [];
};

const searchEngines = computed(() => {
  const defaults: Record<string, { url: string; placeholder: string; name: string }> = {
    bing: {
      url: 'https://www.bing.com/search?q=',
      placeholder: '微软必应搜索',
      name: 'Bing'
    },
    google: {
      url: 'https://www.google.com/search?q=',
      placeholder: 'Google 搜索',
      name: 'Google'
    },
    baidu: {
      url: 'https://www.baidu.com/s?wd=',
      placeholder: '百度一下',
      name: 'Baidu'
    }
  };

  const customList = normalizeCustomEngines(props.customEngines);

  const custom = customList.reduce((acc, engine) => {
    const normalized = normalizeHttpUrl(engine.url);
    if (!normalized) return acc;
    acc[engine.name] = {
      url: normalized,
      placeholder: engine.placeholder || `${engine.name} 搜索`,
      name: engine.name
    };
    return acc;
  }, {} as Record<string, { url: string; placeholder: string; name: string }>);

  return { ...defaults, ...custom };
});

const currentEngine = computed(() => {
  return searchEngines.value[props.engine || 'bing'] || searchEngines.value.bing;
});

const buildSearchUrl = (rawUrl: string, keyword: string) => {
  const encoded = encodeURIComponent(keyword);
  const normalized = normalizeHttpUrl(rawUrl) || 'https://www.bing.com/search?q=';
  return normalized.includes('%s') ? normalized.replace('%s', encoded) : `${normalized}${encoded}`;
};

const handleSearch = () => {
  const keyword = query.value.trim();
  if (!keyword) return;
  const targetUrl = buildSearchUrl(currentEngine.value.url, keyword);
  window.location.assign(targetUrl);
};
</script>

<template>
  <form class="relative w-full max-w-3xl group" @submit.prevent="handleSearch">
    <input
      v-model="query"
      type="text"
      class="w-full h-16 pl-12 pr-16 bg-white/20 backdrop-blur-md rounded-full text-white text-lg placeholder-white/60 focus:outline-none focus:bg-white/30 transition-all border border-transparent focus:border-white/20 shadow-lg"
      :placeholder="currentEngine.placeholder"
    />
    <button type="submit" class="absolute inset-y-0 right-0 pr-6 flex items-center cursor-pointer text-white/60 hover:text-white">
      <Search class="w-6 h-6" />
    </button>
  </form>
</template>
