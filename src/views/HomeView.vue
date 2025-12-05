<template>
  <Swiper class="w-screen h-screen dark:bg-neutral-900" @swiper="onSwiper" @slideChange="onSlideChange">
    <SwiperSlide>
      <div style="
          height: 100%;
        " class="flex justify-center items-center">
        <div class="flex flex-wrap w-[80vw] gap-8">
          <div class="star w-32 h-32 flex flex-col items-center cursor-pointer">
            <div
              class="icon w-26 h-26 rounded-2xl backdrop-filter backdrop-blur-xl hover:scale-110 transition-all ease-in duration-200 border border-neutral-600 flex items-center justify-center"
              @click="navigateTo('/d3task')">
              <span class="text-white text-xl">d3 task</span>
            </div>
          </div>
          <div class="star w-32 h-32 flex flex-col items-center">
            <div
              class="icon w-26 h-26 rounded-2xl backdrop-filter backdrop-blur-xl flex items-center justify-center text-3xl cursor-pointer text-white border border-neutral-600">
              +
            </div>
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

<style lang="scss"></style>
