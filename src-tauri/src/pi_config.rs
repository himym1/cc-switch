use std::fs;
use std::path::PathBuf;

use serde_json::{json, Value};

use crate::config::{delete_file, get_home_dir, read_json_file, write_json_file};
use crate::error::AppError;

/// Pi Coding Agent global configuration directory (`~/.pi/agent`).
pub fn get_pi_agent_dir() -> PathBuf {
    if let Some(custom) = crate::settings::get_pi_agent_override_dir() {
        return custom;
    }

    get_home_dir().join(".pi").join("agent")
}

/// Pi custom providers and models (`models.json`).
pub fn get_pi_agent_models_path() -> PathBuf {
    get_pi_agent_dir().join("models.json")
}

/// Pi global settings (`settings.json`).
pub fn get_pi_agent_settings_path() -> PathBuf {
    get_pi_agent_dir().join("settings.json")
}

pub fn live_config_exists() -> bool {
    get_pi_agent_models_path().exists() || get_pi_agent_settings_path().exists()
}

fn read_json_or_empty(path: &PathBuf) -> Result<Value, AppError> {
    if path.exists() {
        read_json_file(path)
    } else {
        Ok(json!({}))
    }
}

pub fn read_pi_agent_live_settings() -> Result<Value, AppError> {
    Ok(json!({
        "models": read_json_or_empty(&get_pi_agent_models_path())?,
        "settings": read_json_or_empty(&get_pi_agent_settings_path())?,
    }))
}

pub fn validate_pi_agent_settings(settings: &Value) -> Result<(), AppError> {
    let Some(obj) = settings.as_object() else {
        return Err(AppError::localized(
            "provider.pi_agent.settings.not_object",
            "Pi Coding Agent 配置必须是 JSON 对象",
            "Pi Coding Agent configuration must be a JSON object",
        ));
    };

    match obj.get("models") {
        Some(value) if value.is_object() => {}
        Some(_) => {
            return Err(AppError::localized(
                "provider.pi_agent.models.not_object",
                "Pi Coding Agent models 字段必须是 JSON 对象",
                "Pi Coding Agent models field must be a JSON object",
            ));
        }
        None => {
            return Err(AppError::localized(
                "provider.pi_agent.models.missing",
                "Pi Coding Agent 配置缺少 models 字段",
                "Pi Coding Agent configuration is missing the models field",
            ));
        }
    }

    if let Some(value) = obj.get("settings") {
        if !value.is_object() {
            return Err(AppError::localized(
                "provider.pi_agent.settings_field.not_object",
                "Pi Coding Agent settings 字段必须是 JSON 对象",
                "Pi Coding Agent settings field must be a JSON object",
            ));
        }
    }

    Ok(())
}

pub fn write_pi_agent_live(settings: &Value) -> Result<(), AppError> {
    validate_pi_agent_settings(settings)?;

    let models = settings.get("models").cloned().unwrap_or_else(|| json!({}));
    let settings_value = settings
        .get("settings")
        .cloned()
        .unwrap_or_else(|| json!({}));

    write_pi_agent_live_atomic(&models, &settings_value)
}

fn merge_managed_pi_agent_settings(
    settings_path: &PathBuf,
    managed: &Value,
) -> Result<Value, AppError> {
    let mut merged = if settings_path.exists() {
        let existing: Value = read_json_file(settings_path)?;
        if !existing.is_object() {
            return Err(AppError::localized(
                "provider.pi_agent.settings_field.not_object",
                "Pi Coding Agent settings 字段必须是 JSON 对象",
                "Pi Coding Agent settings field must be a JSON object",
            ));
        }
        existing
    } else {
        json!({})
    };

    let managed_obj = managed.as_object().ok_or_else(|| {
        AppError::localized(
            "provider.pi_agent.settings_field.not_object",
            "Pi Coding Agent settings 字段必须是 JSON 对象",
            "Pi Coding Agent settings field must be a JSON object",
        )
    })?;
    let merged_obj = merged.as_object_mut().ok_or_else(|| {
        AppError::localized(
            "provider.pi_agent.settings_field.not_object",
            "Pi Coding Agent settings 字段必须是 JSON 对象",
            "Pi Coding Agent settings field must be a JSON object",
        )
    })?;

    for key in ["defaultProvider", "defaultModel"] {
        if let Some(value) = managed_obj.get(key) {
            merged_obj.insert(key.to_string(), value.clone());
        }
    }

    Ok(merged)
}

pub fn write_pi_agent_live_atomic(models: &Value, settings: &Value) -> Result<(), AppError> {
    if !models.is_object() {
        return Err(AppError::localized(
            "provider.pi_agent.models.not_object",
            "Pi Coding Agent models 字段必须是 JSON 对象",
            "Pi Coding Agent models field must be a JSON object",
        ));
    }
    if !settings.is_object() {
        return Err(AppError::localized(
            "provider.pi_agent.settings_field.not_object",
            "Pi Coding Agent settings 字段必须是 JSON 对象",
            "Pi Coding Agent settings field must be a JSON object",
        ));
    }

    let models_path = get_pi_agent_models_path();
    let settings_path = get_pi_agent_settings_path();
    let settings_to_write = merge_managed_pi_agent_settings(&settings_path, settings)?;

    let old_models = if models_path.exists() {
        Some(fs::read(&models_path).map_err(|e| AppError::io(&models_path, e))?)
    } else {
        None
    };

    write_json_file(&models_path, models)?;

    if let Err(err) = write_json_file(&settings_path, &settings_to_write) {
        if let Some(bytes) = old_models {
            let _ = crate::config::atomic_write(&models_path, &bytes);
        } else {
            let _ = delete_file(&models_path);
        }
        return Err(err);
    }

    Ok(())
}

pub fn extract_pi_agent_primary_credentials(settings: &Value) -> (String, String) {
    let provider_obj = settings
        .get("models")
        .and_then(|models| models.get("providers"))
        .and_then(Value::as_object)
        .and_then(|providers| {
            settings
                .get("settings")
                .and_then(|s| s.get("defaultProvider"))
                .and_then(Value::as_str)
                .and_then(|id| providers.get(id))
                .or_else(|| providers.values().next())
        });

    let Some(provider) = provider_obj else {
        return (String::new(), String::new());
    };

    let base_url = provider
        .get("baseUrl")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    let api_key = provider
        .get("apiKey")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();

    (base_url, api_key)
}
