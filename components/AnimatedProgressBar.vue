<script setup lang="ts">
// Progress bar that loads for `duration` seconds until `maxProgress`, and then loads to 100% when loaded is true
const props = defineProps({
  loaded: { type: Boolean, default: false },
});

const duration = 10;
const maxProgress = 90;
const progress = ref(0);
const incrementProgressInterval = ref();
onMounted(() => {
  incrementProgressInterval.value = setInterval(() => {
    if (progress.value >= maxProgress) {
      clearInterval(incrementProgressInterval.value);
    } else {
      progress.value++;
    }
  }, (duration * 1000) / maxProgress);
});

watch(
  () => props.loaded,
  () => {
    if (props.loaded) {
      clearInterval(incrementProgressInterval.value);
      progress.value = 100;
    }
  }
);
</script>

<template>
  <ProgressBar :progress="progress" />
</template>
