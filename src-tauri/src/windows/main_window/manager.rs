use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

pub fn create_main_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    if let Some(window) = app.get_webview_window("main") {
        return Ok(window);
    }

    let settings = crate::get_settings();
    let window = WebviewWindowBuilder::new(
        app,
        "main",
        WebviewUrl::App("windows/main/index.html".into()),
    )
    .title("快速剪贴板")
    .inner_size(360.0, 520.0)
    .min_inner_size(150.0, 150.0)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .always_on_top(settings.window_pinned)
    .skip_taskbar(true)
    .visible(false)
    .resizable(true)
    .maximizable(false)
    .minimizable(false)
    .center()
    .focused(false)
    .visible_on_all_workspaces(true)
    .disable_drag_drop_handler()
    .build()
    .map_err(|e| format!("创建主窗口失败: {}", e))?;

    if let Some((width, height)) = settings
        .saved_window_size
        .filter(|_| settings.remember_window_size)
    {
        super::apply_saved_window_size(&window, width, height);
    }

    super::set_pinned(settings.window_pinned);
    Ok(window)
}

pub fn get_main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("main")
}

pub fn is_main_window_visible(app: &AppHandle) -> bool {
    if let Some(window) = get_main_window(app) {
        window.is_visible().unwrap_or(false)
    } else {
        false
    }
}

