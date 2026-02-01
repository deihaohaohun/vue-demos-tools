import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import './app.css'

import TDesign from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css'
import 'aieditor/dist/style.css'
import 'viewerjs/dist/viewer.css'
import VueViewer from 'v-viewer'
import './lib/spaghetti.ts'
import 'dayjs/locale/zh-cn'
import dayjs from 'dayjs'

dayjs.locale('zh-cn')

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(TDesign)
app.use(VueViewer)
app.mount('#app')
