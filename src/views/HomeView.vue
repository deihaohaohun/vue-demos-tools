<template>
  <Swiper class="w-screen h-screen" @swiper="onSwiper" @slideChange="onSlideChange">
    <SwiperSlide>Slide 1</SwiperSlide>
    <SwiperSlide>Slide 2</SwiperSlide>
    <SwiperSlide>Slide 3</SwiperSlide>
    <SwiperSlide>Slide 4</SwiperSlide>
    <SwiperSlide>Slide 5</SwiperSlide>
    <SwiperSlide>Slide 6</SwiperSlide>
  </Swiper>
</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from "swiper/vue";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import { ref } from "vue";

const swiperRef = ref<SwiperType | null>(null);

const onSwiper = (swiper: SwiperType) => {
  swiperRef.value = swiper;
  console.log(swiper);
};
const onSlideChange = () => {
  console.log('slide change');
};

</script>
