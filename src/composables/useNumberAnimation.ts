import { ref, watch, onUnmounted, type Ref } from 'vue'
import gsap from 'gsap'

export function useNumberAnimation(targetValue: Ref<number>, duration: number = 1000) {
  const displayedValue = ref(0)
  const tweened = { value: 0 }
  let tween: gsap.core.Tween | null = null

  watch(
    targetValue,
    (newVal) => {
      tween = gsap.to(tweened, {
        duration: duration / 1000,
        value: newVal,
        ease: 'power2.out',
        onUpdate: () => {
          displayedValue.value = Math.round(tweened.value)
        },
      })
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (tween) {
      tween.kill()
    }
  })

  return displayedValue
}
