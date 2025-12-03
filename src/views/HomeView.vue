<template>
  <Swiper class="w-screen h-screen" @swiper="onSwiper" @slideChange="onSlideChange">
    <SwiperSlide>
      <div style="
          height: 100%;
        " class="flex justify-center items-center">
        <div class="flex flex-wrap w-[80vw] gap-8">
          <div class="star w-32 h-32 flex flex-col items-center cursor-pointer">
            <div
              class="icon w-26 h-26 rounded-2xl backdrop-filter backdrop-blur-xl hover:scale-110 transition-all ease-in duration-200 border border-neutral-100 flex items-center justify-center"
              @click="navigateTo('/d3task')">
              <span class="text-white text-xl">d3 task</span>
            </div>
          </div>
          <div class="star w-32 h-32 flex flex-col items-center">
            <div
              class="icon w-26 h-26 rounded-2xl backdrop-filter backdrop-blur-xl flex items-center justify-center text-3xl cursor-pointer text-white">
              +
            </div>
          </div>
        </div>
      </div>
    </SwiperSlide>
  </Swiper>

  <Dock class="mb-4" :model="items" position="bottom">
    <template #itemicon="{ item }">
      <img class="cursor-pointer" v-tooltip.top="item.label" :src="item.icon" style="width: 100%"
        @click="openCorrespondingPage(item.label as string)" />
    </template>
  </Dock>
</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import type { Swiper as SwiperType } from 'swiper'
import { Dock } from 'primevue'

import 'swiper/css'
import { ref } from 'vue'
import animeIcon from '@/assets/bilibili.svg'
import { useRouter } from 'vue-router'

const router = useRouter()
const navigateTo = (path: string) => {
  router.push(path)
}
const swiperRef = ref<SwiperType | null>(null)
const items = ref([
  {
    label: '我的工具',
    icon: 'https://primefaces.org/cdn/primevue/images/dock/photos.svg',
  },
  {
    label: '老司机',
    icon: 'https://primefaces.org/cdn/primevue/images/dock/trash.png',
  },
  {
    label: '动漫',
    icon: animeIcon,
  },
])

const onSwiper = (swiper: SwiperType) => {
  swiperRef.value = swiper
  console.log(swiper)
}
const onSlideChange = () => {
  console.log('slide change')
}

const openCorrespondingPage = (label: string) => {
  const idx = items.value.findIndex(item => item.label === label)
  swiperRef.value?.slideTo(idx ?? 0)
}
</script>

<style lang="scss"></style>
