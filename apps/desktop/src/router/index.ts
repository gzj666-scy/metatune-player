import AlbumListView from '@/views/AlbumListView.vue'
import ArtistListView from '@/views/ArtistListView.vue'
import FolderListView from '@/views/FolderListView.vue'
import SettingsView from '@/views/SettingsView.vue'
import SongListView from '@/views/SongListView.vue'
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: '本地列表',
      // component: () => import('@/views/SongListView.vue'),
      component: SongListView,
    },
    {
      path: '/artist',
      name: '歌手列表',
      component: ArtistListView,
    },
    {
      path: '/artist/:name',
      name: '歌手歌曲列表',
      component: SongListView,
    },
    {
      path: '/album',
      name: '专辑列表',
      component: AlbumListView,
    },
    {
      path: '/album/:name',
      name: '专辑歌曲列表',
      component: SongListView,
    },
    {
      path: '/folder',
      name: '文件夹列表',
      component: FolderListView,
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
