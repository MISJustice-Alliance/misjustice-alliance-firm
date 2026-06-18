use axum::{extract::State, http::StatusCode, routing::get, routing::post, Json, Router};
use mindkit_mcp::{process_thinking, MindkitError, ThinkingRequest};
use serde_json::json;
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone, Default)]
struct AppState;

#[tokio::main]
async fn main() {
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));
    tracing_subscriber::registry().with(filter).with(tracing_subscriber::fmt::layer()).init();

    let state = AppState;
    let app = Router::new()
        .route("/health", get(health))
        .route("/think", post(think))
        .with_state(state)
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([0, 0, 0, 0], 3100));
    tracing::info!(%addr, "mindkit-mcp starting");

    let listener = tokio::net::TcpListener::bind(addr).await.expect("bind listener");
    axum::serve(listener, app).await.expect("server error");
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({"ok": true, "service": "mindkit-mcp"}))
}

async fn think(
    State(_state): State<AppState>,
    Json(req): Json<ThinkingRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    match process_thinking(req) {
        Ok(resp) => Ok(Json(serde_json::to_value(resp).expect("serialize response"))),
        Err(err) => Err(map_error(err)),
    }
}

fn map_error(err: MindkitError) -> (StatusCode, Json<serde_json::Value>) {
    match err {
        MindkitError::EmptyPrompt | MindkitError::UnsupportedMode(_) | MindkitError::UnsupportedTier(_) => (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": err.to_string()})),
        ),
    }
}
