<script setup lang="ts">
const route = useRoute();

const id = computed(() => {
  return Object.keys(route.query)[0];
});

const loading = ref(true);
const timeTook = ref(0);

onMounted(async () => {
  loading.value = true;
  const start = new Date().getTime();
  const data = await $fetch("/api/create-schej-event", {
    method: "POST",
    body: { href: route.fullPath },
  });
  const end = new Date().getTime();
  loading.value = false;
  console.log(data);

  timeTook.value = (end - start) / 1000;

  window.location.href = data.url;
});
</script>

<template>
  <h1>Query: {{ route.query }}</h1>
  <h2>ID: {{ id }}</h2>
  <div v-if="loading">Loading............</div>
  <div v-else>Done in {{ timeTook }}s!</div>
</template>
