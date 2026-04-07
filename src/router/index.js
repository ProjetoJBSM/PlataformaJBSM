import { createRouter as createVueRouter, createWebHistory } from 'vue-router'
import { getIdTokenResult, onAuthStateChanged } from 'firebase/auth'

import { auth, hasFirebaseConfig } from '../services/firebase'

const HomeView = () => import('../views/HomeView.vue')
const CollectionView = () => import('../views/CollectionView.vue')
const PlantDetailsView = () => import('../views/PlantDetailsView.vue')
const AdminLoginView = () => import('../views/AdminLoginView.vue')
const AdminView = () => import('../views/AdminView.vue')
const NotFoundView = () => import('../views/NotFoundView.vue')

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/acervo',
    name: 'collection',
    component: CollectionView,
  },
  {
    path: '/especie/:id',
    name: 'species-details',
    component: PlantDetailsView,
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: AdminLoginView,
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminView,
    meta: { requiresAdmin: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
  },
]

let authInitPromise

function waitForAuthReady() {
  if (!hasFirebaseConfig || !auth) {
    return Promise.resolve(null)
  }

  if (!authInitPromise) {
    authInitPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe()
        resolve()
      })
    })
  }

  return authInitPromise
}

async function getAuthAccessState() {
  if (!hasFirebaseConfig || !auth) {
    return {
      configured: false,
      user: null,
      isAdmin: false,
    }
  }

  await waitForAuthReady()
  const user = auth.currentUser
  if (!user) {
    return {
      configured: true,
      user: null,
      isAdmin: false,
    }
  }

  try {
    const tokenResult = await getIdTokenResult(user, true)
    return {
      configured: true,
      user,
      isAdmin: tokenResult?.claims?.admin === true,
    }
  } catch {
    return {
      configured: true,
      user,
      isAdmin: false,
    }
  }
}

export function createRouter() {
  const router = createVueRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior(to, _from, savedPosition) {
      if (savedPosition) {
        return savedPosition
      }

      if (to.hash) {
        return {
          el: to.hash,
          behavior: 'smooth',
        }
      }

      return { top: 0 }
    },
  })

  router.beforeEach(async (to) => {
    const authState = await getAuthAccessState()

    if (to.meta.requiresAdmin) {
      if (!authState.configured) {
        return { name: 'admin-login', query: { reason: 'firebase-config' } }
      }

      if (!authState.user) {
        return { name: 'admin-login', query: { redirect: to.fullPath } }
      }

      if (!authState.isAdmin) {
        return {
          name: 'admin-login',
          query: { redirect: to.fullPath, reason: 'not-admin' },
        }
      }
    }

    if (to.name === 'admin-login' && authState.user && authState.isAdmin) {
      const redirectTarget =
        typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/admin')
          ? to.query.redirect
          : '/admin'
      return redirectTarget
    }

    return true
  })

  return router
}
