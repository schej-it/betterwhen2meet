<script setup lang="ts">
import { Rive } from "@rive-app/canvas";

const loaded = ref(false);

onMounted(() => {
  setTimeout(() => (loaded.value = true), 1000);
});
</script>

<template>
  <div class="flex justify-center items-center h-full">
    <div class="space-y-4 text-center">
      <div class="text-3xl font-medium">Creating a better when2meet...</div>
      <AnimatedProgressBar :loaded="loaded" />
    </div>
  </div>
</template>
