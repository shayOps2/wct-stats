FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN addgroup --system appuser && \
    adduser --system --ingroup appuser appuser

WORKDIR /app

# install mongodb database tools + curl and required packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg wget && \
    # Add MongoDB tools repo (Debian/Ubuntu) and install database tools
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" \
      > /etc/apt/sources.list.d/mongodb-org-6.0.list && \
    apt-get update && apt-get install -y --no-install-recommends mongodb-database-tools && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

    
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