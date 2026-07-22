/**
 * 应用入口
 * 挂载根组件，并注册 router / store
 */
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import './styles/main.css'

createApp(App).use(router).use(store).mount('#app')
