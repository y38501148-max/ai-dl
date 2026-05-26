use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

const QUESTIONS_JSON: &str = include_str!("../../resources/question-bank/questions.json");

const FILES: &[(&str, &str)] = &[
    ("records", "exam-records.json"),
    ("wrongBook", "wrong-book.json"),
    ("progress", "progress.json"),
    ("activeExam", "active-exam.json"),
    ("settings", "settings.json"),
];

fn default_value(key: &str) -> Option<Value> {
    match key {
        "records" => Some(json!([])),
        "wrongBook" => Some(json!([])),
        "progress" => Some(json!({ "attemptedQuestionIds": [] })),
        "activeExam" => Some(Value::Null),
        "settings" => Some(json!({ "questionBankVersion": 1 })),
        _ => None,
    }
}

fn file_name(key: &str) -> Option<&'static str> {
    FILES
        .iter()
        .find_map(|(candidate, file)| (*candidate == key).then_some(*file))
}

fn data_directory(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("data"))
        .map_err(|error| format!("无法解析应用数据目录：{error}"))
}

fn bank_directory(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(data_directory(app)?.join("question-bank"))
}

fn write_json(path: &Path, value: &Value) -> Result<(), String> {
    let temporary = path.with_extension("json.tmp");
    let text = serde_json::to_string_pretty(value).map_err(|error| format!("无法序列化数据：{error}"))?;
    fs::write(&temporary, text).map_err(|error| format!("无法写入临时文件：{error}"))?;
    fs::rename(&temporary, path).map_err(|error| format!("无法保存数据文件：{error}"))?;
    Ok(())
}

fn read_or_create_json(app: &tauri::AppHandle, key: &str) -> Result<Value, String> {
    let file = file_name(key).ok_or_else(|| format!("不支持的数据键：{key}"))?;
    let path = data_directory(app)?.join(file);
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).map_err(|error| format!("数据文件格式错误：{error}")),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            let value = default_value(key).ok_or_else(|| format!("不支持的数据键：{key}"))?;
            write_json(&path, &value)?;
            Ok(value)
        }
        Err(error) => Err(format!("无法读取数据文件：{error}")),
    }
}

fn ensure_data_files(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = data_directory(app)?;
    let bank_dir = bank_directory(app)?;
    fs::create_dir_all(&data_dir).map_err(|error| format!("无法创建数据目录：{error}"))?;
    fs::create_dir_all(&bank_dir).map_err(|error| format!("无法创建题库目录：{error}"))?;

    let questions_path = bank_dir.join("questions.json");
    if !questions_path.exists() {
        fs::write(&questions_path, QUESTIONS_JSON).map_err(|error| format!("无法释放内置题库：{error}"))?;
    }

    Ok(questions_path)
}

#[tauri::command]
fn bootstrap(app: tauri::AppHandle) -> Result<Value, String> {
    let questions_path = ensure_data_files(&app)?;
    let questions = fs::read_to_string(questions_path)
        .map_err(|error| format!("无法读取题库：{error}"))
        .and_then(|content| serde_json::from_str::<Value>(&content).map_err(|error| format!("题库格式错误：{error}")))?;

    Ok(json!({
        "questions": questions,
        "records": read_or_create_json(&app, "records")?,
        "wrongBook": read_or_create_json(&app, "wrongBook")?,
        "progress": read_or_create_json(&app, "progress")?,
        "activeExam": read_or_create_json(&app, "activeExam")?,
        "settings": read_or_create_json(&app, "settings")?
    }))
}

#[tauri::command]
fn save_data(app: tauri::AppHandle, key: String, value: Value) -> Result<bool, String> {
    let file = file_name(&key).ok_or_else(|| format!("不支持的数据键：{key}"))?;
    ensure_data_files(&app)?;
    write_json(&data_directory(&app)?.join(file), &value)?;
    Ok(true)
}

#[tauri::command]
fn get_data_directory(app: tauri::AppHandle) -> Result<String, String> {
    data_directory(&app).map(|path| path.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            bootstrap,
            save_data,
            get_data_directory
        ])
        .run(tauri::generate_context!())
        .expect("failed to run tauri application");
}
