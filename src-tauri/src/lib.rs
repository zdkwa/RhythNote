use std::io::Write;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

fn install_diagnostics() {
    let startup_log = std::env::temp_dir().join("RhythNote-startup.log");
    if let Ok(mut file) = std::fs::File::create(&startup_log) {
        let _ = writeln!(file, "RhythNote 0.1.0 startup");
        let _ = writeln!(file, "exe={:?}", std::env::current_exe());
        let _ = writeln!(file, "appdata={:?}", std::env::var("APPDATA"));
        let _ = writeln!(file, "localappdata={:?}", std::env::var("LOCALAPPDATA"));
        let _ = writeln!(file, "temp={:?}", std::env::temp_dir());
    }
    std::panic::set_hook(Box::new(|info| {
        let crash_log = std::env::temp_dir().join("RhythNote-crash.log");
        let backtrace = std::backtrace::Backtrace::force_capture();
        let _ = std::fs::write(
            crash_log,
            format!(
                "RhythNote crash at {:?}\n{}\n\n{}",
                std::time::SystemTime::now(),
                info,
                backtrace
            ),
        );
    }));
}

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_schema_and_seed",
            sql: include_str!("../migrations/0001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_checkin_days_summary",
            sql: include_str!("../migrations/0002_checkin_days.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_review_tasks_and_time_overrides",
            sql: include_str!("../migrations/0003_review_tasks.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    install_diagnostics();
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:rhythnote.db", migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running RhythNote");
}
