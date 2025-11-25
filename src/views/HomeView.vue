<template>
  <Swiper class="w-screen h-screen" @swiper="onSwiper" @slideChange="onSlideChange">
    <SwiperSlide v-for="nmu in 6" :key="nmu">
      <div
        style="
          height: 100%;
          background-image: url(https://wowtabextension.z7.web.core.windows.net/wowtabwallpapers/2025-03-01.jpg);
          background-size: cover;
        "
        class="flex justify-center items-center"
      >
        <div class="flex flex-wrap w-[80vw] gap-8">
          <div
            v-for="star in 30"
            :key="star"
            class="star w-32 h-32 flex flex-col items-center cursor-pointer"
          >
            <div
              class="icon w-26 h-26 rounded-2xl backdrop-filter backdrop-blur-xl hover:scale-110 transition-all ease-in duration-200"
            ></div>
            <div class="title text-neutral-100 text-center">star</div>
          </div>
          <div class="star w-32 h-32 flex flex-col items-center">
            <div
              class="icon w-26 h-26 rounded-2xl backdrop-filter backdrop-blur-xl flex items-center justify-center text-3xl cursor-pointer"
            >
              +
            </div>
          </div>
        </div>
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
import { Swiper, SwiperSlide } from 'swiper/vue'
import type { Swiper as SwiperType } from 'swiper'
import { Dock } from 'primevue'

import 'swiper/css'
import { ref } from 'vue'

const swiperRef = ref<SwiperType | null>(null)
const items = ref([
  {
    label: 'Finder',
    icon: 'https://primefaces.org/cdn/primevue/images/dock/finder.svg',
  },
  {
    label: 'App Store',
    icon: 'https://primefaces.org/cdn/primevue/images/dock/appstore.svg',
  },
  {
    label: 'Photos',
    icon: 'https://primefaces.org/cdn/primevue/images/dock/photos.svg',
  },
  {
    label: 'Trash',
    icon: 'https://primefaces.org/cdn/primevue/images/dock/trash.png',
  },
])

const onSwiper = (swiper: SwiperType) => {
  swiperRef.value = swiper
  console.log(swiper)
}
const onSlideChange = () => {
  console.log('slide change')
}
</script>

<style lang="scss" scoped></style>
