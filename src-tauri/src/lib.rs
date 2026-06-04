use serde_json::{json, Value};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};
use tauri::Manager;

const AI_QUESTIONS_JSON: &str = include_str!("../../resources/question-bank/ai/questions.json");
const DATA_STRUCTURE_QUESTIONS_JSON: &str =
    include_str!("../../resources/question-bank/data-structure/questions.json");
const QUESTION_BANK_MANIFEST: &str = include_str!("../../resources/question-bank/manifest.json");

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
        "settings" => Some(
            json!({ "questionBankVersion": 5, "questionBankTag": "multi-0.1.5.4-fix1-20260604", "activeSubjectId": "ai" }),
        ),
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
    let text =
        serde_json::to_string_pretty(value).map_err(|error| format!("无法序列化数据：{error}"))?;
    fs::write(&temporary, text).map_err(|error| format!("无法写入临时文件：{error}"))?;
    fs::rename(&temporary, path).map_err(|error| format!("无法保存数据文件：{error}"))?;
    Ok(())
}

fn bank_tag_value(manifest: &Value) -> Option<&str> {
    manifest.get("bankTag").and_then(Value::as_str)
}

fn tag_version(tag: &str) -> Vec<u32> {
    tag.split(|character: char| !(character.is_ascii_digit() || character == '.'))
        .find(|part| part.contains('.'))
        .unwrap_or(tag)
        .split('.')
        .map(|part| part.parse::<u32>().unwrap_or(0))
        .collect()
}

fn newer_tag_is_greater(first: &str, second: &str) -> bool {
    let first_version = tag_version(first);
    let second_version = tag_version(second);
    let length = first_version.len().max(second_version.len());
    for index in 0..length {
        let left = *first_version.get(index).unwrap_or(&0);
        let right = *second_version.get(index).unwrap_or(&0);
        if left != right {
            return left > right;
        }
    }
    first > second
}

fn should_replace_bank(existing_manifest: Option<Value>) -> bool {
    let Ok(embedded_manifest) = serde_json::from_str::<Value>(QUESTION_BANK_MANIFEST) else {
        return false;
    };
    let Some(embedded_tag) = bank_tag_value(&embedded_manifest) else {
        return false;
    };
    let Some(existing_tag) = existing_manifest.as_ref().and_then(bank_tag_value) else {
        return true;
    };
    newer_tag_is_greater(embedded_tag, existing_tag)
}

fn read_or_create_json(app: &tauri::AppHandle, key: &str) -> Result<Value, String> {
    let file = file_name(key).ok_or_else(|| format!("不支持的数据键：{key}"))?;
    let path = data_directory(app)?.join(file);
    match fs::read_to_string(&path) {
        Ok(content) => {
            serde_json::from_str(&content).map_err(|error| format!("数据文件格式错误：{error}"))
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            let value = default_value(key).ok_or_else(|| format!("不支持的数据键：{key}"))?;
            write_json(&path, &value)?;
            Ok(value)
        }
        Err(error) => Err(format!("无法读取数据文件：{error}")),
    }
}

fn embedded_subject_file_exists(bank_dir: &Path) -> bool {
    bank_dir.join("ai").join("questions.json").exists()
        && bank_dir
            .join("data-structure")
            .join("questions.json")
            .exists()
}

fn write_embedded_question_bank(bank_dir: &Path) -> Result<(), String> {
    let ai_dir = bank_dir.join("ai");
    let data_structure_dir = bank_dir.join("data-structure");
    fs::create_dir_all(&ai_dir)
        .map_err(|error| format!("无法创建人工智能导论题库目录：{error}"))?;
    fs::create_dir_all(&data_structure_dir)
        .map_err(|error| format!("无法创建数据结构题库目录：{error}"))?;
    fs::write(ai_dir.join("questions.json"), AI_QUESTIONS_JSON)
        .map_err(|error| format!("无法释放人工智能导论题库：{error}"))?;
    fs::write(
        data_structure_dir.join("questions.json"),
        DATA_STRUCTURE_QUESTIONS_JSON,
    )
    .map_err(|error| format!("无法释放数据结构题库：{error}"))?;
    fs::write(bank_dir.join("manifest.json"), QUESTION_BANK_MANIFEST)
        .map_err(|error| format!("无法释放题库清单：{error}"))?;
    Ok(())
}

fn read_questions_from_manifest(
    bank_dir: &Path,
    manifest: Option<&Value>,
) -> Result<Value, String> {
    if let Some(subjects) = manifest
        .and_then(|value| value.get("subjects"))
        .and_then(Value::as_array)
    {
        let mut questions = Vec::new();
        for subject in subjects {
            let relative_path = subject
                .get("relativePath")
                .and_then(Value::as_str)
                .ok_or_else(|| "题库清单缺少科目文件路径".to_string())?;
            let path = bank_dir.join(relative_path);
            let content = fs::read_to_string(&path)
                .map_err(|error| format!("无法读取科目题库 {}：{error}", path.display()))?;
            let subject_questions = serde_json::from_str::<Value>(&content)
                .map_err(|error| format!("科目题库格式错误：{error}"))?;
            let items = subject_questions
                .as_array()
                .ok_or_else(|| "科目题库格式错误：顶层必须是数组".to_string())?;
            questions.extend(items.iter().cloned());
        }
        return Ok(Value::Array(questions));
    }

    let questions_path = bank_dir.join("questions.json");
    fs::read_to_string(questions_path)
        .map_err(|error| format!("无法读取题库：{error}"))
        .and_then(|content| {
            serde_json::from_str::<Value>(&content)
                .map_err(|error| format!("题库格式错误：{error}"))
        })
}

fn ensure_data_files(app: &tauri::AppHandle) -> Result<(), String> {
    let data_dir = data_directory(app)?;
    let bank_dir = bank_directory(app)?;
    fs::create_dir_all(&data_dir).map_err(|error| format!("无法创建数据目录：{error}"))?;
    fs::create_dir_all(&bank_dir).map_err(|error| format!("无法创建题库目录：{error}"))?;

    let manifest_path = bank_dir.join("manifest.json");
    let existing_manifest = fs::read_to_string(&manifest_path)
        .ok()
        .and_then(|content| serde_json::from_str::<Value>(&content).ok());
    if !embedded_subject_file_exists(&bank_dir) || should_replace_bank(existing_manifest) {
        write_embedded_question_bank(&bank_dir)?;
    }

    Ok(())
}

#[tauri::command]
fn bootstrap(app: tauri::AppHandle) -> Result<Value, String> {
    ensure_data_files(&app)?;
    let bank_dir = bank_directory(&app)?;
    let manifest_path = bank_directory(&app)?.join("manifest.json");
    let question_bank_manifest = fs::read_to_string(manifest_path)
        .ok()
        .and_then(|content| serde_json::from_str::<Value>(&content).ok());
    let questions = read_questions_from_manifest(&bank_dir, question_bank_manifest.as_ref())?;

    Ok(json!({
        "questions": questions,
        "questionBankManifest": question_bank_manifest,
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
fn install_question_bank(
    app: tauri::AppHandle,
    questions: Value,
    manifest: Value,
) -> Result<Value, String> {
    let items = questions
        .as_array()
        .ok_or_else(|| "题库格式错误：顶层必须是数组".to_string())?;
    if items.is_empty() {
        return Err("题库格式错误：题目不能为空".to_string());
    }
    for item in items {
        let subject_id = item.get("subjectId").and_then(Value::as_str);
        if item.get("id").and_then(Value::as_str).is_none()
            || item.get("type").and_then(Value::as_str).is_none()
            || item.get("stem").and_then(Value::as_str).is_none()
            || item.get("options").and_then(Value::as_array).is_none()
            || item
                .get("correctAnswers")
                .and_then(Value::as_array)
                .is_none()
            || (subject_id == Some("data-structure")
                && item.get("explanation").and_then(Value::as_str).is_none())
        {
            return Err("题库格式错误：存在缺少必填字段的数据结构题目".to_string());
        }
    }
    let bank_dir = bank_directory(&app)?;
    fs::create_dir_all(&bank_dir).map_err(|error| format!("无法创建题库目录：{error}"))?;
    if let Some(subjects) = manifest.get("subjects").and_then(Value::as_array) {
        for subject in subjects {
            let subject_id = subject
                .get("id")
                .and_then(Value::as_str)
                .ok_or_else(|| "题库清单缺少科目 ID".to_string())?;
            let relative_path = subject
                .get("relativePath")
                .and_then(Value::as_str)
                .ok_or_else(|| "题库清单缺少科目文件路径".to_string())?;
            let subject_questions = Value::Array(
                items
                    .iter()
                    .filter(|item| {
                        item.get("subjectId").and_then(Value::as_str) == Some(subject_id)
                    })
                    .cloned()
                    .collect(),
            );
            let target_path = bank_dir.join(relative_path);
            if let Some(parent) = target_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|error| format!("无法创建科目题库目录：{error}"))?;
            }
            write_json(&target_path, &subject_questions)?;
        }
    } else {
        write_json(&bank_dir.join("questions.json"), &questions)?;
    }
    write_json(&bank_dir.join("manifest.json"), &manifest)?;
    Ok(json!({
        "questionCount": items.len(),
        "bankTag": manifest.get("bankTag").and_then(Value::as_str)
    }))
}

#[tauri::command]
fn open_external_url(url: String) -> Result<bool, String> {
    if !url.starts_with("https://github.com/y38501148-max/AI-DL/releases") {
        return Err("不支持打开该外部链接".to_string());
    }

    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(&url);
        command
    };

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("rundll32");
        command.arg("url.dll,FileProtocolHandler").arg(&url);
        command
    };

    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg(&url);
        command
    };

    command
        .spawn()
        .map_err(|error| format!("无法打开更新页面：{error}"))?;
    Ok(true)
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

    let stdout_file =
        fs::File::create(&stdout_path).map_err(|error| format!("无法创建输出文件：{error}"))?;
    let stderr_file =
        fs::File::create(&stderr_path).map_err(|error| format!("无法创建错误输出文件：{error}"))?;
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
            install_question_bank,
            open_external_url,
            run_c_code
        ])
        .run(tauri::generate_context!())
        .expect("failed to run tauri application");
}
