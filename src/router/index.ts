import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    redirect: '/cuncia',
    meta: { requiresAuth: true },
  },
  {
    path: '/cuncia',
    redirect: '/cuncia',
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'cuncia', component: () => import('../views/cuncia/CambiaView.vue'), meta: { requiresAuth: true } },
      { path: 'programacion', name: 'cuncia-programacion', component: () => import('../views/cuncia/CambiaView.vue'), meta: { requiresAuth: true } },
      { path: 'mantenimiento', name: 'cuncia-mantenimiento', component: () => import('../views/cuncia/CambiaView.vue'), meta: { requiresAuth: true } },
    ],
  },
  {
    path: '/acacias',
    redirect: '/acacias',
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'acacias', component: () => import('../views/acacias/AcaciasView.vue'), meta: { requiresAuth: true } },
      { path: 'programacion', name: 'acacias-programacion', component: () => import('../views/acacias/AcaciasView.vue'), meta: { requiresAuth: true } },
      { path: 'mantenimiento', name: 'acacias-mantenimiento', component: () => import('../views/acacias/AcaciasView.vue'), meta: { requiresAuth: true } },
    ],
  },
  { path: '/clientes', name: 'clientes', component: () => import('../views/ClientesView.vue'), meta: { requiresAuth: true } },
  { path: '/admin', name: 'admin', component: () => import('../views/AdminView.vue'), meta: { requiresAuth: true } },
  {
    path: '/concretos',
    redirect: '/concretos',
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'concretos', component: () => import('../views/concretos/ConcretosView.vue'), meta: { requiresAuth: true } },
      { path: 'mantenimiento', name: 'concretos-mantenimiento', component: () => import('../views/concretos/ConcretosView.vue'), meta: { requiresAuth: true } },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/cuncia',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const isAuthenticated = useAuthStore().isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.meta.guest && isAuthenticated) {
    const redirect = to.query.redirect as string | undefined
    next({ path: redirect && redirect.startsWith('/') ? redirect : '/' })
  } else {
    next()
  }
})

export default router