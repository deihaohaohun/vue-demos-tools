<script setup lang="ts">
import { useDark } from '@vueuse/core'
import { watch } from 'vue'

const isDark = useDark()

watch(
  isDark,
  (val) => {
    if (val) {
      document.documentElement.setAttribute('theme-mode', 'dark')
    } else {
      document.documentElement.removeAttribute('theme-mode')
    }
  },
  { immediate: true },
)
</script>

<template>
  <router-view></router-view>
</template>

<style scoped></style>
