use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::sync::RwLock;
use std::fs;

#[derive(Clone)]
pub struct AnalyticsService {
    enabled: Arc<RwLock<bool>>,
    app_handle: AppHandle,
}

impl AnalyticsService {
    pub fn new(app: &AppHandle) -> Self {
        let mut enabled = false;
        if let Ok(path) = app.path().app_data_dir() {
            let config_path = path.join("analytics.json");
            if let Ok(content) = fs::read_to_string(&config_path) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(e) = val.get("enabled").and_then(|v| v.as_bool()) {
                        enabled = e;
                    }
                }
            }
        }
        
        Self {
            enabled: Arc::new(RwLock::new(enabled)),
            app_handle: app.clone(),
        }
    }

    pub async fn is_enabled(&self) -> bool {
        *self.enabled.read().await
    }

    pub async fn set_enabled(&self, enabled: bool) {
        let mut e = self.enabled.write().await;
        *e = enabled;
        
        if let Ok(path) = self.app_handle.path().app_data_dir() {
            let _ = fs::create_dir_all(&path);
            let config_path = path.join("analytics.json");
            let content = serde_json::json!({ "enabled": enabled }).to_string();
            let _ = fs::write(&config_path, content);
        }

        if enabled {
            println!("Analytics have been enabled by the user.");
        } else {
            println!("Analytics have been disabled by the user.");
        }
    }
}
