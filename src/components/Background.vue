<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  image?: string;
}>();

const bgImage = computed(() => {
  return props.image || '/backgroud.jpg';
});
</script>

<template>
  <div class="fixed inset-0 z-[-1] overflow-hidden bg-black">
    <div 
      class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500 ease-in-out"
      :style="{ backgroundImage: `url(${bgImage})` }"
    ></div>
    <!-- Vignette effect -->
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
  </div>
</template>
