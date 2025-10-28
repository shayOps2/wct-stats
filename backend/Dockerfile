FROM python:3.11-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN addgroup --system appuser && \
    adduser --system --ingroup appuser appuser

WORKDIR /app

# removed multi-arch mongodb tools install (mongodump) — backup now uses pymongo
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["gunicorn", \
    "main:app", \
    "-c", \
    "gunicorn.conf.py", \
    "-k", \
    "uvicorn.workers.UvicornWorker", \
    "--bind", \
    "0.0.0:8000"]