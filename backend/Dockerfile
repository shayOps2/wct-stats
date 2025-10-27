FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN addgroup --system appuser && \
    adduser --system --ingroup appuser appuser

WORKDIR /app

# Install mongodb-database-tools (binary release)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl wget tar && \
    ARCH=$(dpkg --print-architecture) && \
    case "$ARCH" in \
        amd64)  MONGO_ARCH="x86_64" ;; \
        arm64)  MONGO_ARCH="arm64" ;; \
        *) echo "Unsupported arch: $ARCH" && exit 1 ;; \
    esac && \
    curl -fsSL "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian12-${MONGO_ARCH}-100.9.4.tgz" -o /tmp/tools.tgz || \
    curl -fsSL "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian11-${MONGO_ARCH}-100.9.4.tgz" -o /tmp/tools.tgz && \
    tar -xzf /tmp/tools.tgz -C /usr/local/bin --strip-components=1 && \
    rm /tmp/tools.tgz && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["gunicorn", "main:app", "-c", "gunicorn.conf.py", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0:8000"]
