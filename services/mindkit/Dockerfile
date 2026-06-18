FROM rust:1.83-slim AS builder
WORKDIR /app
COPY Cargo.toml ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
RUN useradd -r -u 10001 mindkit
WORKDIR /app
COPY --from=builder /app/target/release/mindkit-mcp /usr/local/bin/mindkit-mcp
EXPOSE 3100
USER mindkit
ENTRYPOINT ["/usr/local/bin/mindkit-mcp"]
