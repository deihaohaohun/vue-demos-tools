import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import './app.css'

import TDesign from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css'
import 'aieditor/dist/style.css'
import './lib/spaghetti.ts'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(TDesign)
app.mount('#app')
