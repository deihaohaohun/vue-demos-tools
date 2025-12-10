<template>
  <Swiper class="w-screen h-screen dark:bg-neutral-900" @swiper="onSwiper" @slideChange="onSlideChange">
    <SwiperSlide>
      <div style="height: 100%" class="flex justify-center items-center">
        <div class="flex flex-wrap w-[80vw] gap-8">
          <div
            class="star icon w-26 h-26 rounded-2xl backdrop-filter backdrop-blur-xl transition-all ease-in duration-100 border dark:border-neutral-300 border-neutral-500 flex items-center justify-center"
            @click="navigateTo('/d3task')">
            <span class="dark:text-white text-xl select-none">d3 task</span>
          </div>
          <div
            class="star icon w-26 h-26 rounded-2xl backdrop-filter backdrop-blur-xl transition-all ease-in duration-100 border border-neutral-500 flex items-center justify-center"
            @click="navigateTo('/todo')">
            <span class="dark:text-white text-xl select-none">todo list</span>
          </div>
          <div
            class="star icon w-26 h-26 rounded-2xl backdrop-filter backdrop-blur-xl transition-all ease-in duration-100 flex items-center justify-center text-3xl cursor-pointer dark:text-white border border-neutral-500">
            +
          </div>
        </div>
      </div>
    </SwiperSlide>
  </Swiper>
</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import type { Swiper as SwiperType } from 'swiper'

import 'swiper/css'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const navigateTo = (path: string) => {
  router.push(path)
}
const swiperRef = ref<SwiperType | null>(null)

const onSwiper = (swiper: SwiperType) => {
  swiperRef.value = swiper
  console.log(swiper)
}
const onSlideChange = () => {
  console.log('slide change')
}
</script>

<style lang="scss">
.star {
  border: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;

  @media (prefers-color-scheme: dark) {
    border: 1px solid #303030;
  }

  &:hover {
    box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px;
  }
}
</style>
