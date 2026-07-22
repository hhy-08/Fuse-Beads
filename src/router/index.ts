/**
 * Vue Router 入口
 * 参考 ilot：history 模式、标题设置、滚动复位
 */
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { GetAppTitle, GetBaseRoute } from '@/utils/Env'

const router = createRouter({
  history: createWebHistory(GetBaseRoute()),
  routes,
})

router.beforeEach((to, from, next) => {
  void from

  if (to.meta.title) {
    document.title = `${GetAppTitle()}-${to.meta.title as string}`
  }

  window.scrollTo(0, 0)
  next()
})

export default router
