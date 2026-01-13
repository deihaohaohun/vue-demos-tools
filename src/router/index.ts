import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      meta: { title: '得好好混的小破站' },
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/nihongo',
      name: 'nihongo',
      meta: { title: '日语学习' },
      component: () => import('@/views/nihongo/NihongoView.vue'),
    },
    {
      path: '/todo',
      name: 'todo',
      meta: { title: '待办事项' },
      component: () => import('@/views/todo/D3TodoList.vue'),
    },
    {
      path: '/setting',
      name: 'setting',
      meta: { requiresAuth: true, title: '设置' },
      component: () => import('@/views/SettingView.vue'),
    },
    {
      path: '/knowledge',
      name: 'knowledge',
      meta: { title: '温故知新' },
      component: () => import('@/views/knowledge/KnowledgeView.vue'),
    },
    {
      path: '/knowledge/:id',
      name: 'knowledge-detail',
      meta: { title: '资源详情' },
      component: () => import('@/views/knowledge/ResourceDetail.vue'),
    },
    {
      path: '/websocket',
      name: 'websocket',
      meta: { title: '聊天室' },
      component: () => import('@/views/websocket/WebsocketView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      meta: { title: '登录' },
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      meta: { title: '404' },
      component: () => import('@/views/NotFound.vue'),
    },
  ],
})

const whiteList = ['/']

// 模拟检查登录状态（替换成真实逻辑）
function isAuthed(): boolean {
  return !!localStorage.getItem('token')
}

router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title}`
  }

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
