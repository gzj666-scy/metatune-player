; ============================================================================
; Metatune Player 自定义 NSIS 卸载钩子
; ----------------------------------------------------------------------------
; 作用：卸载时新增一个自定义页，让用户选择是否「同时删除缓存与用户数据」。
;   默认勾选（删除）；用户取消勾选则保留 AppData 下的数据。
;
; 为什么用独立自定义页（Page custom）而不是 MUI_UNPAGE_CONFIRM 的 SHOW 回调：
;   electron-builder 26.8.1 的 NSIS 模板把本文件插在生成脚本最顶部（早于 MUI 页面宏），
;   MUI_UNPAGE_CUSTOMFUNCTION_SHOW 这类 define 不会被确认页消费（实测报
;   "function not referenced"）。改用 Page custom 显式引用函数，版本无关、最稳妥。
;
; 注意：
;   - 生成脚本会被同时编进「安装器」和「卸载器」。卸载页必须用 NSIS 的
;     UninstPage custom 指令（不是 Page custom，Page custom 是安装器页），否则会引用到
;     不存在的安装器函数、触发 "function not referenced" 警告。UninstPage 天然只作用于卸载器。
;   - electron-builder 把本文件插在生成脚本最顶部，早于它自己的 !include "nsDialogs.nsh"，
;     故这里主动 !include "nsDialogs.nsh"（带 !ifndef 守卫，重复包含安全），确保 ${NSD_*} 可用。
;   - 安装目录 ${INSTDIR} 由 electron-builder 卸载器默认 RMDir /r 清理，无需在此处理。
;   - 路径含空格，务必用引号包裹。
;   - RMDir /r 会删除目录及其全部内容；仅在应用已退出时执行（卸载时应用已关闭）。
;   - 保守兜底：若复选框因任何原因未生效，$RemoveAppData 为空 → 走「保留」分支，绝不误删。
; ============================================================================

!include "nsDialogs.nsh"

; 在卸载流程中插入「删除数据选择页」。
; 生成脚本会被编进「安装器」和「卸载器」两遍；卸载页指令、卸载器函数、相关变量
; 必须用 !ifdef BUILD_UNINSTALLER 包裹，否则安装器那一遍也会看到 UninstPage / un.* 函数 / Var
; （却没有 WriteUninstaller）→ 报 6020 / 6001 警告（electron-builder 把警告当致命错误）。
; （BUILD_UNINSTALLER 是 electron-builder 在卸载器编译那一遍定义的）
!ifdef BUILD_UNINSTALLER
  Var RemoveAppData        ; 复选框状态：1=删除，其它=保留
  Var removeDataCheckbox   ; 复选框控件句柄

  UninstPage custom un.ShowRemoveDataChoice

  Function un.ShowRemoveDataChoice
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}
    ${NSD_CreateCheckbox} 10u 40u 90% 14u "同时删除缓存与用户数据 (AppData\Roaming\Metatune Player)"
    Pop $removeDataCheckbox
    ${NSD_SetState} $removeDataCheckbox ${BST_CHECKED}
    StrCpy $RemoveAppData "1"
    ${NSD_OnClick} $removeDataCheckbox un.OnRemoveDataClick
    nsDialogs::Show
  FunctionEnd

  Function un.OnRemoveDataClick
    ${NSD_GetState} $removeDataCheckbox $RemoveAppData
  FunctionEnd
!endif

!macro customUnInstall
  ${If} $RemoveAppData == "1"
    ; 应用缓存 + 更新下载缓存（手动拼接目录）
    RMDir /r "$APPDATA\Metatune Player"
    ; 兜底：旧版更新缓存放过 Local（现已重定向到 Roaming，这里清一次残留）
    RMDir /r "$LOCALAPPDATA\Metatune Player"
    ; 标准 userData（设置 / 播放缓存 / .updaterId 等）
    RMDir /r "$APPDATA\com.gzj666-scy.metatune"
    RMDir /r "$LOCALAPPDATA\com.gzj666-scy.metatune"
    ; NSIS 安装器在 LocalAppData 自拷贝的更新库存档（installer.exe），
    ; 目录名来自 package.json 的 name「@metatune/desktop」→ @metatunedesktop-updater
    RMDir /r "$LOCALAPPDATA\@metatunedesktop-updater"
  ${EndIf}
!macroend
