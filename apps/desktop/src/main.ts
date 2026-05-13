import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

import './styles/main.css'
import { vClickOutside } from '@metatune/common'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.directive('click-outside', vClickOutside)

app.mount('#app')
