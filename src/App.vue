<template>
  <router-view />
</template>

<script lang="ts">
/**
 * 根组件
 * 仅承载路由出口，业务页面由 views 承载
 */
import { defineComponent } from 'vue'
import { GetAppTitle } from '@/utils/Env'

export default defineComponent({
  name: 'App',
  /**
   * 应用创建时按当前环境初始化标题
   */
  created() {
    this.$store.dispatch('UpdateAppTitle', GetAppTitle())
  },
})
</script>
