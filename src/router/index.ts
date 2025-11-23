import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/setting',
      name: 'setting',
      meta: { requiresAuth: true },
      component: () => import('@/views/SettingView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/NotFound.vue') },
  ],
})

const whiteList = ['/']

// 模拟检查登录状态（替换成真实逻辑）
function isAuthed(): boolean {
  return !!localStorage.getItem('token')
}

router.beforeEach((to, from, next) => {
  const authed = isAuthed()

  // --- 1. 白名单直接放行 ---
  if (whiteList.includes(to.path)) {
    return next()
  }

  // --- 2. 404 页面（匹配不到路由） ---
  if (!to.matched.length) {
    return next() // 404 不需要登录
  }

  // --- 3. 需要登录但未登录 ---
  if (to.meta.requiresAuth && !authed) {
    return next({
      path: '/login',
      query: { redirect: to.fullPath }, // 登录后跳回原页面
    })
  }

  // --- 4. 已登录但访问登录页 → 自动跳到首页 ---
  if (authed && to.path === '/login') {
    return next('/') // 或你的默认首页
  }

  // --- 5. 默认放行 ---
  next()
})

export default router
