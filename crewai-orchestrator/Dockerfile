FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

FROM builder AS deps

COPY pyproject.toml .
RUN uv pip install --system --no-cache .

FROM python:3.12-slim AS runtime

WORKDIR /app

# Create non-root user
RUN useradd -m -u 1000 appuser

# Copy installed packages from deps stage
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copy source code
COPY src/ ./src/

ENV PYTHONPATH=/app/src

USER appuser

CMD ["python", "-m", "misjustice_crews.main"]
