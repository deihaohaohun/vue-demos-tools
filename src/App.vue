<script setup lang="ts">
import { useDark } from '@vueuse/core'
import { watch } from 'vue'

const isDark = useDark()

watch(
  isDark,
  (val) => {
    if (val) {
      document.documentElement.setAttribute('theme-mode', 'dark')
      document.body.setAttribute('arco-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('theme-mode')
      document.body.removeAttribute('arco-theme')
    }
  },
  { immediate: true },
)
</script>

<template>
  <router-view></router-view>
</template>

<style scoped></style>
