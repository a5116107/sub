<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 scale-90"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-90"
  >
    <div
      v-if="visible"
      :class="[
        'action-confirm inline-flex items-center justify-center rounded-full p-1',
        type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
      ]"
    >
      <Icon
        :name="type === 'success' ? 'check' : 'x'"
        size="sm"
        :class="animate ? 'animate-bounce-subtle' : ''"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Icon from '@/components/icons/Icon.vue'

interface Props {
  type?: 'success' | 'error'
  duration?: number
  animate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'success',
  duration: 1500,
  animate: true
})

const emit = defineEmits<{
  complete: []
}>()

const visible = ref(true)

onMounted(() => {
  if (props.duration > 0) {
    setTimeout(() => {
      visible.value = false
      emit('complete')
    }, props.duration)
  }
})

defineExpose({
  show: () => { visible.value = true },
  hide: () => { visible.value = false }
})
</script>

<style scoped>
.animate-bounce-subtle {
  animation: bounceSubtle 0.4s ease-out;
}

@keyframes bounceSubtle {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>
