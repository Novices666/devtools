use serde::Serialize;
use std::{path::Path, sync::Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_clipboard_manager::ClipboardExt;

const MAX_OPEN_TEXT_FILE_SIZE: u64 = 16 * 1024 * 1024;

#[derive(Clone, Serialize)]
struct OpenFilePayload {
    path: String,
    content: String,
}

#[derive(Default)]
struct PendingOpenFiles(Mutex<Vec<OpenFilePayload>>);

/// 显示并聚焦主窗口（供托盘、文件关联复用）
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

fn read_opened_file(path: &Path) -> Option<OpenFilePayload> {
    let metadata = std::fs::metadata(path).ok()?;
    if !metadata.is_file() || metadata.len() > MAX_OPEN_TEXT_FILE_SIZE {
        return None;
    }
    let content = std::fs::read_to_string(path).ok()?;
    Some(OpenFilePayload {
        path: path.to_string_lossy().into_owned(),
        content,
    })
}

fn opened_files_from_args(args: &[String]) -> Vec<OpenFilePayload> {
    args.iter()
        .skip(1)
        .filter(|arg| !arg.starts_with('-'))
        .filter_map(|arg| read_opened_file(Path::new(arg)))
        .collect()
}

/// 将第二实例命令行中的关联文件实时转发给已运行的前端。
fn forward_opened_files(app: &tauri::AppHandle, args: &[String]) {
    for payload in opened_files_from_args(args) {
        let _ = app.emit("open-file", payload);
        show_main_window(app);
    }
}

/// 前端完成事件订阅后领取冷启动期间暂存的文件。
#[tauri::command]
fn take_pending_open_files(state: tauri::State<'_, PendingOpenFiles>) -> Vec<OpenFilePayload> {
    state
        .0
        .lock()
        .map(|mut files| std::mem::take(&mut *files))
        .unwrap_or_default()
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
        .invoke_handler(tauri::generate_handler![take_pending_open_files])
        .setup(|app| {
            let handle = app.handle();

            // 冷启动参数先暂存，待前端建立事件订阅后主动领取。
            let args: Vec<String> = std::env::args().collect();
            app.manage(PendingOpenFiles(Mutex::new(opened_files_from_args(&args))));

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
