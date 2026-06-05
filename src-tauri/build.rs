fn main() {
    println!("cargo:rerun-if-changed=../resources/question-bank/manifest.json");
    println!("cargo:rerun-if-changed=../resources/question-bank/ai/questions.json");
    println!("cargo:rerun-if-changed=../resources/question-bank/data-structure/questions.json");
    println!("cargo:rerun-if-changed=../resources/question-bank/intelligent-sensing-control/questions.json");
    tauri_build::build()
}
