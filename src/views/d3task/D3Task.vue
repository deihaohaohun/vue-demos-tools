<template>
  <div class="w-screen h-screen dark:bg-neutral-900">
    <div class="grid grid-cols-8 grid-rows-3 gap-4 w-3/4 mx-auto pt-12 h-full">
      <div class="col-span-2 flex flex-col bg-neutral-400 rounded-md">
        <div class="title text-white text-2xl font-bold text-center py-2 border-b border-white">日语</div>
        <div class="tasks h-full overflow-y-auto p-2">
          <div class="task py-2 px-4 bg-white rounded-md cursor-pointer mb-2 last-of-type:mb-0">
            听播客 >= 15min
          </div>
          <div class="task py-2 px-4 bg-white rounded-md cursor-pointer mb-2 last-of-type:mb-0">
            复习语法 >= 3 个
          </div>
          <div class="task py-2 px-4 bg-white rounded-md cursor-pointer mb-2 last-of-type:mb-0">
            复习单词 >= 10 个
          </div>
          <div class="task py-2 px-4 bg-white rounded-md cursor-pointer mb-2 last-of-type:mb-0">
            jlpt n2 >= 10 分钟
          </div>
        </div>
      </div>
      <div class="col-span-2 flex flex-col bg-pink-400 rounded-md">
        <div class="title text-white text-2xl font-bold text-center py-2 border-b border-white">英语</div>
        <div class="tasks h-full overflow-y-auto p-2">
          <div class="task py-2 px-4 bg-white rounded-md cursor-pointer mb-2 last-of-type:mb-0">
            听播客 >= 15min
          </div>
          <div class="task py-2 px-4 bg-white rounded-md cursor-pointer mb-2 last-of-type:mb-0">
            复习语法 >= 3 个
          </div>
          <div class="task py-2 px-4 bg-white rounded-md cursor-pointer mb-2 last-of-type:mb-0">
            复习单词 >= 10 个
          </div>
        </div>
      </div>
      <div
        class="col-span-2 flex flex-col bg-purple-400 rounded-md justify-center items-center text-white text-4xl font-bold cursor-pointer">
        +
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

</script>

<style lang="scss" scoped></style>
