<script setup lang="ts">
import { Rive } from "@rive-app/canvas";

const loaded = ref(false);
const rive = ref();
const riveLoaded = ref(false);

onMounted(() => {
  setTimeout(() => (loaded.value = true), 10000);
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
      <div class="text-3xl font-medium">Creating a better when2meet...</div>
      <AnimatedProgressBar :loaded="loaded" />
      <div class="text-lg mt-20 flex items-center gap-2">
        <div>Powered by</div>
        <a href="https://schej.it">
          <img class="h-6" src="/public/img/schej_logo_with_text.png" />
        </a>
      </div>
    </div>
  </div>
</template>
