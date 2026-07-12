// 阻止 Windows release 构建弹出多余的控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// 应用逻辑集中在 lib.rs（crate `devtoolbox_lib`），此处仅作入口调用。
fn main() {
    devtoolbox_lib::run()
}
