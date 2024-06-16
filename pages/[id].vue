<script setup lang="ts">
const route = useRoute();

console.log(route.params.id);
</script>

<template>
  <h1>hellooo {{ route.params.id }}</h1>
</template>
