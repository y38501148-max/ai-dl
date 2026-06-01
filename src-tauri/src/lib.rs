use serde_json::{json, Value};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};
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
        "settings" => Some(json!({ "questionBankVersion": 2, "activeSubjectId": "ai" })),
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
    fs::write(&questions_path, QUESTIONS_JSON).map_err(|error| format!("无法释放内置题库：{error}"))?;

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

#[tauri::command]
fn run_c_code(source: String, stdin: Option<String>) -> Result<Value, String> {
    let work_dir = std::env::temp_dir().join(format!(
        "muz-ds-c-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|error| format!("无法创建临时目录：{error}"))?
            .as_millis()
    ));
    fs::create_dir_all(&work_dir).map_err(|error| format!("无法创建临时目录：{error}"))?;

    let source_path = work_dir.join("main.c");
    let binary_path = work_dir.join(if cfg!(windows) { "main.exe" } else { "main" });
    let stdout_path = work_dir.join("stdout.txt");
    let stderr_path = work_dir.join("stderr.txt");
    fs::write(&source_path, source).map_err(|error| format!("无法写入 C 源码：{error}"))?;

    let compile = Command::new("gcc")
        .arg(&source_path)
        .arg("-std=c11")
        .arg("-Wall")
        .arg("-Wextra")
        .arg("-O2")
        .arg("-o")
        .arg(&binary_path)
        .output()
        .map_err(|error| format!("无法调用 gcc，请确认本机已安装 gcc：{error}"))?;

    if !compile.status.success() {
        let _ = fs::remove_dir_all(&work_dir);
        return Ok(json!({
            "success": false,
            "stage": "compile",
            "stdout": String::from_utf8_lossy(&compile.stdout),
            "stderr": String::from_utf8_lossy(&compile.stderr)
        }));
    }

    let stdout_file = fs::File::create(&stdout_path).map_err(|error| format!("无法创建输出文件：{error}"))?;
    let stderr_file = fs::File::create(&stderr_path).map_err(|error| format!("无法创建错误输出文件：{error}"))?;
    let mut child = Command::new(&binary_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::from(stdout_file))
        .stderr(Stdio::from(stderr_file))
        .spawn()
        .map_err(|error| format!("无法运行编译产物：{error}"))?;

    if let Some(input) = stdin {
        if let Some(mut child_stdin) = child.stdin.take() {
            child_stdin
                .write_all(input.as_bytes())
                .map_err(|error| format!("无法写入标准输入：{error}"))?;
        }
    }

    let started = Instant::now();
    let timeout = Duration::from_secs(3);
    let status = loop {
        if let Some(status) = child
            .try_wait()
            .map_err(|error| format!("无法等待程序结束：{error}"))?
        {
            break Some(status);
        }
        if started.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            break None;
        }
        thread::sleep(Duration::from_millis(40));
    };

    let stdout = fs::read_to_string(&stdout_path).unwrap_or_default();
    let stderr = fs::read_to_string(&stderr_path).unwrap_or_default();
    let _ = fs::remove_dir_all(&work_dir);

    Ok(json!({
        "success": status.map(|item| item.success()).unwrap_or(false),
        "stage": if status.is_some() { "run" } else { "timeout" },
        "stdout": stdout,
        "stderr": stderr,
        "exitCode": status.and_then(|item| item.code())
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            bootstrap,
            save_data,
            get_data_directory,
            run_c_code
        ])
        .run(tauri::generate_context!())
        .expect("failed to run tauri application");
}
