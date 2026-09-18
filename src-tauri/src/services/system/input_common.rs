use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use tauri::{AppHandle, Manager, WebviewWindow};

static MAIN_WINDOW: Mutex<Option<WebviewWindow>> = Mutex::new(None);
static APP_HANDLE: OnceCell<AppHandle> = OnceCell::new();

static MOUSE_MONITORING_ENABLED: AtomicBool = AtomicBool::new(false);
static MOUSE_MONITORING_GENERATION: AtomicU64 = AtomicU64::new(0);

pub(crate) fn set_main_window(window: WebviewWindow) {
    let _ = APP_HANDLE.set(window.app_handle().clone());
    *MAIN_WINDOW.lock() = Some(window);
}

pub(crate) fn try_get_main_window() -> Option<WebviewWindow> {
    MAIN_WINDOW.try_lock().and_then(|w| w.as_ref().cloned())
}

pub(crate) fn try_get_app_handle() -> Option<AppHandle> {
    APP_HANDLE.get().cloned()
}

pub(crate) fn run_on_main_thread<F>(f: F)
where
    F: FnOnce() + Send + 'static,
{
    if let Some(app) = try_get_app_handle() {
        let _ = app.run_on_main_thread(f);
    }
}

pub(crate) fn set_mouse_monitoring_enabled(enabled: bool) {
    MOUSE_MONITORING_ENABLED.store(enabled, Ordering::SeqCst);
    MOUSE_MONITORING_GENERATION.fetch_add(1, Ordering::SeqCst);
}

pub(crate) fn is_mouse_monitoring_enabled() -> bool {
    MOUSE_MONITORING_ENABLED.load(Ordering::SeqCst)
}

pub(crate) fn mouse_monitoring_generation() -> u64 {
    MOUSE_MONITORING_GENERATION.load(Ordering::SeqCst)
}

pub(crate) fn is_current_mouse_monitoring_generation(generation: u64) -> bool {
    is_mouse_monitoring_enabled()
        && MOUSE_MONITORING_GENERATION.load(Ordering::SeqCst) == generation
}
