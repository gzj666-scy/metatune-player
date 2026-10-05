import CollectionView from '@/views/CollectionView.vue'
import SettingsView from '@/views/SettingsView.vue'
import SongListView from '@/views/SongListView.vue'
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: '本地列表',
      component: SongListView,
    },
    // v3：歌手/专辑/文件夹的聚合页合并为 CollectionView，由路由区分 kind
    {
      path: '/artist',
      name: '歌手列表',
      component: CollectionView,
      props: { kind: 'artist' },
    },
    {
      path: '/artist/:name',
      name: '歌手歌曲列表',
      component: SongListView,
    },
    {
      path: '/album',
      name: '专辑列表',
      component: CollectionView,
      props: { kind: 'album' },
    },
    {
      path: '/album/:name',
      name: '专辑歌曲列表',
      component: SongListView,
    },
    {
      path: '/folder',
      name: '文件夹列表',
      component: CollectionView,
      props: { kind: 'folder' },
    },
    {
      path: '/folder/:name',
      name: '文件夹歌曲列表',
      component: SongListView,
    },
    {
      path: '/favorite',
      name: '我的收藏',
      component: SongListView,
    },
    {
      path: '/playlist/:id',
      name: '歌单',
      component: SongListView,
    },
    {
      path: '/settings',
      name: '设置',
      component: SettingsView,
    },
  ],
})

export default router
