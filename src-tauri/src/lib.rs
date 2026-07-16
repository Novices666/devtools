#[cfg(desktop)]
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

/// 显示并聚焦主窗口（供托盘、单实例唤醒复用）
#[cfg(desktop)]
fn show_main_window(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        eprintln!("main window is unavailable");
        return;
    };

    for (action, result) in [
        ("show", window.show()),
        ("unminimize", window.unminimize()),
        ("focus", window.set_focus()),
    ] {
        if let Err(error) = result {
            eprintln!("failed to {action} main window: {error}");
        }
    }
}

#[cfg(desktop)]
fn configure_desktop(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder
        // 确保仅运行一个实例；重复启动时显示已有主窗口。
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_main_window(app);
        }))
        .setup(|app| {
            // 系统托盘 + 右键菜单
            let show_item = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;
            let icon = app.default_window_icon().cloned().ok_or_else(|| {
                std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    "default window icon is not configured",
                )
            })?;

            TrayIconBuilder::with_id("main")
                .icon(icon)
                .tooltip("开发者工具箱")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        // 关闭主窗口时隐藏到托盘而非退出
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    match window.hide() {
                        Ok(()) => api.prevent_close(),
                        Err(error) => {
                            eprintln!("failed to hide main window: {error}");
                            window.app_handle().exit(1);
                        }
                    }
                }
            }
        })
}

/// 应用入口。由桌面端 `main.rs` 或移动端运行时调用。
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(desktop)]
    let builder = configure_desktop(builder);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
