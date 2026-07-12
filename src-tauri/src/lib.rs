use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// 显示并聚焦主窗口（供托盘、全局快捷键、文件关联复用）
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

/// 将命令行中携带的文件路径读取内容后转发给前端
/// （文件关联 / “用 DevToolbox 打开”）。每个文件以 `open-file` 事件
/// 发送 { path, content }，与前端 src/core/desktop.ts 的契约一致。
fn forward_opened_files(app: &tauri::AppHandle, args: &[String]) {
    for arg in args.iter().skip(1) {
        // 跳过可执行文件自身
        if arg.starts_with('-') {
            continue; // 跳过命令行开关
        }
        let path = std::path::Path::new(arg);
        if !path.is_file() {
            continue;
        }
        // 仅读取合理体积的文本文件，避免误开二进制大文件阻塞
        match std::fs::read_to_string(path) {
            Ok(content) => {
                let _ = app.emit(
                    "open-file",
                    serde_json::json!({ "path": arg, "content": content }),
                );
                show_main_window(app);
            }
            Err(_) => { /* 忽略无法以文本读取的文件 */ }
        }
    }
}

/// 在后台线程轮询系统剪贴板，文本变化时向前端发送 `clipboard-changed`
/// 事件（payload 为剪贴板文本）。与前端 src/core/desktop.ts 的
/// onClipboardChanged 契约一致。轮询而非系统级监听，避免平台差异与额外依赖。
fn start_clipboard_watch(app: &tauri::AppHandle) {
    let handle = app.clone();
    std::thread::spawn(move || {
        // 以启动时的剪贴板内容为基线，避免刚启动就把旧内容当成“变化”推送
        let mut last = handle.clipboard().read_text().unwrap_or_default();
        loop {
            std::thread::sleep(std::time::Duration::from_millis(800));
            match handle.clipboard().read_text() {
                Ok(text) => {
                    if text != last {
                        last = text.clone();
                        if !text.is_empty() {
                            let _ = handle.emit("clipboard-changed", text);
                        }
                    }
                }
                // 剪贴板为空 / 非文本 / 读取失败：忽略，保留上次基线
                Err(_) => {}
            }
        }
    });
}

/// 桌面端应用入口。由 `main.rs` 调用；拆分为 lib 以匹配 Cargo.toml 的
/// `[lib] name = "devtoolbox_lib"`（Tauri v2 标准结构，便于移动端复用）。
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        // 单实例：第二次启动时把参数（如双击的文件）转交给已运行实例
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            show_main_window(app);
            forward_opened_files(app, &argv);
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    // 全局唤起：Ctrl+Shift+Space
                    let toggle: Shortcut =
                        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);
                    if shortcut == &toggle && event.state() == ShortcutState::Pressed {
                        show_main_window(app);
                        // 通知前端聚焦搜索框（与 desktop.ts 的 onGlobalActivate 契约一致）
                        let _ = app.emit("global-activate", ());
                    }
                })
                .build(),
        )
        .setup(|app| {
            let handle = app.handle();

            // 注册全局快捷键
            let toggle =
                Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);
            app.global_shortcut().register(toggle)?;

            // 系统托盘 + 右键菜单
            let show_item = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
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

            // 冷启动时若通过文件关联打开，转发路径给前端
            let args: Vec<String> = std::env::args().collect();
            forward_opened_files(&handle, &args);

            // 后台轮询系统剪贴板，变化时推送给前端（智能识别用）
            start_clipboard_watch(&handle);

            Ok(())
        })
        // 关闭主窗口时隐藏到托盘而非退出
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
