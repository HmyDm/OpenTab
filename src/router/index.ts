import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'

// 定义路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/index.html',
    redirect: '/',
  },
  {
    path: '/about',
    name: 'about',
    component: {
      template: '<div class="text-center text-xl p-8">About Page - Coming Soon</div>',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
