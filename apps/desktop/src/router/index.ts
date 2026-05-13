import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: '本地列表',
      component: () => import('@/views/SongListView.vue'),
      meta: { key: 'local' },
    },
    {
      path: '/artist',
      name: '歌手列表',
      component: () => import('@/views/ArtistListView.vue'),
    },
    {
      path: '/artist/:name',
      name: '歌手歌曲列表',
      component: () => import('@/views/SongListView.vue'),
    },
    {
      path: '/album',
      name: '专辑列表',
      component: () => import('@/views/AlbumListView.vue'),
    },
    {
      path: '/album/:name',
      name: '专辑歌曲列表',
      component: () => import('@/views/SongListView.vue'),
    },
    {
      path: '/folder',
      name: '文件夹列表',
      component: () => import('@/views/FolderListView.vue'),
    },
    {
      path: '/folder/:name',
      name: '文件夹歌曲列表',
      component: () => import('@/views/SongListView.vue'),
    },
    {
      path: '/favorite',
      name: '我的收藏',
      component: () => import('@/views/SongListView.vue'),
      meta: { key: 'favorite' },
    },
    {
      path: '/playlist/:id',
      name: '歌单',
      component: () => import('@/views/SongListView.vue'),
    },
  ],
})

export default router
