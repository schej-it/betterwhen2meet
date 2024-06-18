<script setup lang="ts">
const props = defineProps({
  progress: { type: Number, default: 0 },
});
</script>

<style scoped>
.progress-shadow {
  box-shadow: 0px 1.5px 6px 0px #00994c33;
}
</style>

<template>
  <div class="w-full h-3 rounded-full bg-light-gray relative">
    <div
      :style="{ width: `${progress}%` }"
      class="progress-shadow transition-all ease-linear absolute bg-green border border-light-green h-full rounded-full"
    ></div>
  </div>
</template>
