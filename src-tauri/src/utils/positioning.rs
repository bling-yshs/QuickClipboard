use tauri::{Manager, Monitor, PhysicalPosition, WebviewWindow};

// 将窗口定位到鼠标位置
pub fn position_at_cursor(window: &WebviewWindow) -> Result<(), String> {
    let monitor = crate::screen::ScreenUtils::get_monitor_at_cursor(window.app_handle())?;
    let (cursor_x, cursor_y) = crate::mouse::get_cursor_position();
    let window_size = window.outer_size().map_err(|e| e.to_string())?;

    let best_pos = calculate_best_position(
        PhysicalPosition::new(cursor_x, cursor_y),
        window_size,
        &monitor,
    );

    window.set_position(best_pos).map_err(|e| e.to_string())
}

// 将记住的位置映射到鼠标所在屏幕，无法判断来源屏幕时回退到智能鼠标定位
pub fn position_at_saved_or_cursor(window: &WebviewWindow, x: i32, y: i32) -> Result<(), String> {
    let app = window.app_handle();
    let target_monitor = crate::screen::ScreenUtils::get_monitor_at_cursor(app)?;
    let monitors = app
        .available_monitors()
        .map_err(|e| format!("获取显示器列表失败: {}", e))?;

    let source_monitor = match monitors.into_iter().find(|monitor| {
        let position = monitor.position();
        let size = monitor.size();
        x >= position.x
            && x < position.x + size.width as i32
            && y >= position.y
            && y < position.y + size.height as i32
    }) {
        Some(monitor) => monitor,
        None => return position_at_cursor(window),
    };

    let window_size = match window.outer_size() {
        Ok(size) => size,
        Err(_) => return position_at_cursor(window),
    };
    let window_scale = window.scale_factor().unwrap_or(1.0).max(f64::EPSILON);
    let source_scale = source_monitor.scale_factor().max(f64::EPSILON);
    let target_scale = target_monitor.scale_factor().max(f64::EPSILON);
    let source_area = source_monitor.work_area();
    let target_area = target_monitor.work_area();

    let offset_x = (x - source_area.position.x) as f64 / source_scale;
    let offset_y = (y - source_area.position.y) as f64 / source_scale;
    let target_width = ((window_size.width as f64 / window_scale) * target_scale).round() as i32;
    let target_height = ((window_size.height as f64 / window_scale) * target_scale).round() as i32;

    let mapped_x = target_area.position.x + (offset_x * target_scale).round() as i32;
    let mapped_y = target_area.position.y + (offset_y * target_scale).round() as i32;
    let target_x = clamp_axis_to_area(
        mapped_x,
        target_width,
        target_area.position.x,
        target_area.size.width as i32,
    );
    let target_y = clamp_axis_to_area(
        mapped_y,
        target_height,
        target_area.position.y,
        target_area.size.height as i32,
    );

    window
        .set_position(PhysicalPosition::new(target_x, target_y))
        .map_err(|e| e.to_string())
}

fn clamp_axis_to_area(position: i32, size: i32, area_position: i32, area_size: i32) -> i32 {
    if area_size <= 0 || size >= area_size {
        area_position
    } else {
        position
            .max(area_position)
            .min(area_position + area_size - size)
    }
}

pub fn calculate_popup_position(
    cursor_x: i32,
    cursor_y: i32,
    width: i32,
    height: i32,
    monitor: &Monitor,
) -> PhysicalPosition<i32> {
    calculate_best_position(
        PhysicalPosition::new(cursor_x, cursor_y),
        tauri::PhysicalSize::new(width.max(0) as u32, height.max(0) as u32),
        monitor,
    )
}

fn calculate_best_position(
    cursor: PhysicalPosition<i32>,
    window_size: tauri::PhysicalSize<u32>,
    monitor: &Monitor,
) -> PhysicalPosition<i32> {
    let monitor_pos = monitor.position();
    let monitor_size = monitor.size();

    let margin = 12;
    let w = window_size.width as i32;
    let h = window_size.height as i32;

    let work_x = monitor_pos.x;
    let work_y = monitor_pos.y;
    let work_w = monitor_size.width as i32;
    let work_h = monitor_size.height as i32;

    // 默认位置：鼠标右下方
    let mut x = cursor.x + margin;
    let mut y = cursor.y + margin;

    // 如果右边超出，移到左边
    if x + w > work_x + work_w {
        x = cursor.x - w - margin;
    }

    // 如果下边超出，移到上边
    if y + h > work_y + work_h {
        y = cursor.y - h - margin;
    }

    x = x.max(work_x).min(work_x + work_w - w);
    y = y.max(work_y).min(work_y + work_h - h);

    PhysicalPosition::new(x, y)
}

// 将窗口居中显示
pub fn center_window(window: &WebviewWindow) -> Result<(), String> {
    window.center().map_err(|e| e.to_string())
}

// 将窗口中心对齐到鼠标位置
pub fn center_at_cursor(window: &WebviewWindow) -> Result<(), String> {
    let monitor = crate::screen::ScreenUtils::get_monitor_at_cursor(window.app_handle())?;
    let (cursor_x, cursor_y) = crate::mouse::get_cursor_position();
    let window_size = window.outer_size().map_err(|e| e.to_string())?;

    let monitor_pos = monitor.position();
    let monitor_size = monitor.size();

    let w = window_size.width as i32;
    let h = window_size.height as i32;

    let work_x = monitor_pos.x;
    let work_y = monitor_pos.y;
    let work_w = monitor_size.width as i32;
    let work_h = monitor_size.height as i32;

    // 窗口中心对齐鼠标
    let mut x = cursor_x - w / 2;
    let mut y = cursor_y - h / 2;

    // 确保不超出屏幕边界
    x = x.max(work_x).min(work_x + work_w - w);
    y = y.max(work_y).min(work_y + work_h - h);

    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())
}

// 获取窗口边界
pub fn get_window_bounds(window: &WebviewWindow) -> Result<(i32, i32, u32, u32), String> {
    let pos = window.outer_position().map_err(|e| e.to_string())?;
    let size = window.outer_size().map_err(|e| e.to_string())?;
    Ok((pos.x, pos.y, size.width, size.height))
}
