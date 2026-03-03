<script setup lang="ts">
import { ref } from 'vue';
import Background from '../components/Background.vue';
import SearchBar from '../components/SearchBar.vue';
import Sidebar from '../components/Sidebar.vue';
import WebsiteGrid from '../components/WebsiteGrid.vue';
import type { Settings, Website, Category } from '../types';

const props = defineProps<{
  settings: Settings;
  websites: Website[];
  categories: Category[];
}>();

const emit = defineEmits<{
  (e: 'open-settings'): void;
  (e: 'open-add-website'): void;
}>();

const activeCategoryId = ref<string>('');

// Set initial active category
if (props.categories.length > 0) {
    activeCategoryId.value = props.categories[0].id;
}

const handleCategorySelect = (id: string) => {
  activeCategoryId.value = id;
  const element = document.getElementById(id);
  if (element) {
    const container = document.getElementById('main-scroll-container');
    if (container) {
        // Calculate position relative to container
        const elementTop = element.offsetTop;
        container.scrollTo({ top: elementTop - 100, behavior: 'smooth' }); // -100 for padding/header
    } else {
        element.scrollIntoView({ behavior: 'smooth' });
    }
  }
};

const handleCategoryInView = (id: string) => {
  activeCategoryId.value = id;
};
</script>

<template>
  <div class="relative min-h-screen w-full text-white overflow-hidden">
    <Background :image="settings?.backgroundImage" />
    
    <div class="flex h-screen overflow-hidden">
      <!-- Sidebar -->
      <Sidebar 
        :categories="categories" 
        :active-category-id="activeCategoryId"
        @select="handleCategorySelect"
        @open-settings="emit('open-settings')"
      />

      <!-- Main Content -->
      <div class="flex-1 flex flex-col items-center pt-20 px-8 relative h-full">
        <!-- Search Bar -->
        <div class="mb-16 w-full flex justify-center z-20">
          <SearchBar :engine="settings?.searchEngine" :custom-engines="settings?.customEngines" />
        </div>

        <!-- Website Grid -->
        <WebsiteGrid 
          :categories="categories"
          :websites="websites"
          :settings="settings"
          @add-website="emit('open-add-website')"
          @category-in-view="handleCategoryInView"
        />
      </div>
    </div>
  </div>
</template>
