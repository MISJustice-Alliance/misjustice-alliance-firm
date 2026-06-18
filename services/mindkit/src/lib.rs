use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThinkingRequest {
    pub prompt: String,
    pub mode: String,
    pub custom_lens: String,
    pub matter_id: Option<String>,
    pub data_tier: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThinkingResponse {
    pub trace_id: String,
    pub confidence: f32,
    pub formatted_output: String,
    pub assumptions: Vec<String>,
    pub counterpoints: Vec<String>,
    pub warnings: Vec<String>,
    pub source_refs: Vec<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum MindkitError {
    #[error("unsupported data_tier: {0}")]
    UnsupportedTier(String),
    #[error("prompt cannot be empty")]
    EmptyPrompt,
    #[error("unsupported mode: {0}")]
    UnsupportedMode(String),
}

pub fn process_thinking(req: ThinkingRequest) -> Result<ThinkingResponse, MindkitError> {
    if req.prompt.trim().is_empty() {
        return Err(MindkitError::EmptyPrompt);
    }

    if req.data_tier != "T2" {
        return Err(MindkitError::UnsupportedTier(req.data_tier));
    }

    let mode = req.mode.as_str();
    if !matches!(mode, "analytical" | "critical" | "synthesis" | "validation") {
        return Err(MindkitError::UnsupportedMode(req.mode));
    }

    let confidence = match mode {
        "critical" => 0.84,
        "validation" => 0.90,
        "synthesis" => 0.87,
        _ => 0.86,
    };

    let formatted_output = format!(
        "🔍 3/5 {:.0}% | {} | lens={} | matter={} ",
        confidence * 100.0,
        summarize_prompt(&req.prompt),
        req.custom_lens,
        req.matter_id.clone().unwrap_or_else(|| "unbound".to_string())
    );

    let warnings = match mode {
        "critical" => vec!["⚠️ CHECK ASSUMPTIONS AND ABSOLUTE STATEMENTS".to_string()],
        "validation" => vec!["⚠️ VERIFY AUTHORITY COVERAGE AND TIMELINE CONSISTENCY".to_string()],
        _ => Vec::new(),
    };

    Ok(ThinkingResponse {
        trace_id: format!("mk_{}", uuidish(&req.prompt)),
        confidence,
        formatted_output,
        assumptions: vec!["Input is de-identified and Tier-2 safe".to_string()],
        counterpoints: vec!["Alternative theory may remain viable pending source review".to_string()],
        warnings,
        source_refs: Vec::new(),
    })
}

fn summarize_prompt(prompt: &str) -> String {
    const MAX: usize = 96;
    let cleaned = prompt.split_whitespace().collect::<Vec<_>>().join(" ");
    cleaned.chars().take(MAX).collect()
}

fn uuidish(seed: &str) -> String {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    seed.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}
