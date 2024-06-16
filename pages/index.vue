<script setup lang="ts">
const route = useRoute();
console.log("path: ", route.fullPath);

const { data, error } = await useFetch("/api/create-schej-event", {
  method: "POST",
});
console.log(data.value, error.value);

const count = ref(0);
const id = computed(() => {
  return Object.keys(route.query)[0];
});
</script>

<template>
  <h1>Query: {{ route.query }}</h1>
  <h2>ID: {{ id }}</h2>
  <button @click="count++">Increment: {{ count }}</button>
</template>
