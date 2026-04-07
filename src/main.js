import { createApp } from 'vue'
import { createRouter } from './router'
import './style.css'
import App from './App.vue'

const app = createApp(App)
app.use(createRouter())
app.mount('#app')
