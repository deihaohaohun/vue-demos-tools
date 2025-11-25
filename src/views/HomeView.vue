<template>
  <Swiper class="w-screen h-screen" @swiper="onSwiper" @slideChange="onSlideChange">
    <SwiperSlide v-for="nmu in 6" :key="nmu">
      <div
        style="height: 100%; background-image: url(https://primefaces.org/cdn/primevue/images/dock/window.jpg); background-size: cover;">
      </div>
    </SwiperSlide>
  </Swiper>

  <Dock class="mb-4" :model="items" position="bottom">
    <template #itemicon="{ item }">
      <img v-tooltip.top="item.label" :src="item.icon" style="width: 100%" />
    </template>
  </Dock>

</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from "swiper/vue";
import type { Swiper as SwiperType } from "swiper";
import { Dock } from "primevue";

import "swiper/css";
import { ref } from "vue";

const swiperRef = ref<SwiperType | null>(null);
const items = ref([
  {
    label: 'Finder',
    icon: 'https://primefaces.org/cdn/primevue/images/dock/finder.svg'
  },
  {
    label: 'App Store',
    icon: 'https://primefaces.org/cdn/primevue/images/dock/appstore.svg'
  },
  {
    label: 'Photos',
    icon: 'https://primefaces.org/cdn/primevue/images/dock/photos.svg'
  },
  {
    label: 'Trash',
    icon: 'https://primefaces.org/cdn/primevue/images/dock/trash.png'
  }
]);

const onSwiper = (swiper: SwiperType) => {
  swiperRef.value = swiper;
  console.log(swiper);
};
const onSlideChange = () => {
  console.log('slide change');
};

</script>

<style lang="scss" scoped></style>
