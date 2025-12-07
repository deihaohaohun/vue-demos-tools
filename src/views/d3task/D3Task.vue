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
        class="col-span-2 flex flex-col bg-purple-400 rounded-md justify-center items-center text-white text-4xl font-bold cursor-pointer"
        @click="visible = true">
        +
      </div>
    </div>
  </div>

  <t-dialog v-model:visible="visible" header="添加新任务" width="800px">
    <t-form ref="formRef" :data="form">
      <t-form-item label="任务名称" name="name">
        <t-input placeholder="请输入任务名称" />
      </t-form-item>
      <t-form-item label="任务分类" name="type">
        <t-radio-group>
          <t-radio value="1">学习</t-radio>
          <t-radio value="2">工作</t-radio>
          <t-radio value="3">生活</t-radio>
        </t-radio-group>
      </t-form-item>
      <t-form-item label="是否立即开始" name="status">
        <t-switch />
      </t-form-item>
      <t-form-item label="任务类型">
        <t-radio-group>
          <!-- 例如每天听日语/英语播客这种任务 -->
          <t-radio value="1">周期任务</t-radio>
          <!-- 例如12月30号之前把爸妈社保交上这种任务 -->
          <t-radio value="2">计时任务</t-radio>
          <!-- 例如把电影幸福终点站看完这种任务 -->
          <t-radio value="3">达成任务</t-radio>
        </t-radio-group>
      </t-form-item>
      <t-form-item label="任务周期" name="period">
        <t-radio-group v-model="form.period">
          <t-radio value="1">每天</t-radio>
          <t-radio value="2">每周</t-radio>
          <t-radio value="3">每月</t-radio>
          <t-radio value="4">每季度</t-radio>
          <t-radio value="5">每年</t-radio>
          <t-radio value="6">自定义周期</t-radio>
        </t-radio-group>
      </t-form-item>
      <t-form-item label="开始时间">
        <t-date-picker />
      </t-form-item>
      <t-form-item label="结束时间">
        <t-date-picker />
      </t-form-item>
      <t-form-item label="自定义周期" name="customPeriod" v-if="form.period === '6'">
        <t-input-number placeholder="请输入自定义周期" suffix="天" v-model="form.customPeriod" />
      </t-form-item>
      <t-form-item label="任务描述" name="description">
        <t-textarea placeholder="请输入任务描述" />
      </t-form-item>
    </t-form>
  </t-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'

const visible = ref(false)
const form = reactive({
  name: '',
  type: '',
  status: false,
  period: '',
  customPeriod: 0,
  description: '',
})
</script>

<style lang="scss" scoped></style>
