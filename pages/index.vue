<script setup lang="ts">
import { Rive } from "@rive-app/canvas";
const route = useRoute();

if (route.fullPath === "/") {
  navigateTo("https://schej.it", { external: true });
}

const loaded = ref(false);
const timeTook = ref(0);
const error = ref("");

onMounted(async () => {
  const start = new Date().getTime();
  let data;
  try {
    data = await $fetch("/api/create-schej-event", {
      method: "POST",
      body: {
        href: route.fullPath,
        timezoneOffset: new Date().getTimezoneOffset(),
      },
    });
  } catch (e) {
    error.value =
      "Failed to generate a better when2meet! Make sure the ID is formatted correctly";
    return;
  }
  const end = new Date().getTime();
  loaded.value = true;

  timeTook.value = (end - start) / 1000;
  console.log(`Took ${timeTook.value}s to parse when2meet!`);

  if (data) {
    window.location.href = data.url;
  }
});

// Rive stuff
const rive = ref();
const riveLoaded = ref(false);
onMounted(() => {
  rive.value = new Rive({
    src: "/rive/schej.riv",
    canvas: document.querySelector("canvas")!,
    autoplay: true,
    stateMachines: "wave",
    onLoad: () => {
      riveLoaded.value = true;
    },
  });
});

onBeforeUnmount(() => {
  rive.value?.cleanup();
});
</script>

<template>
  <div class="flex justify-center items-center h-full">
    <div class="flex flex-col items-center gap-6 text-center -mt-[15vh]">
      <canvas
        id="canvas"
        width="300"
        height="300"
        class="transition-opacity duration-300 -mb-6"
        :class="riveLoaded ? 'opacity-100' : 'opacity-0'"
      ></canvas>
      <template v-if="!error">
        <div class="text-3xl font-medium">Creating a better when2meet...</div>
        <AnimatedProgressBar :loaded="loaded" />
      </template>
      <template v-else>
        <div class="text-red">{{ error }}</div>
      </template>
      <div class="text-lg mt-20 flex items-center gap-2">
        <div>Powered by</div>
        <a href="https://schej.it">
          <img class="h-6" src="/public/img/schej_logo_with_text.png" />
        </a>
      </div>
    </div>
  </div>
</template>
