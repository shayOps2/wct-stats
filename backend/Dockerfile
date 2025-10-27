FROM python:3.11-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN addgroup --system appuser && \
    adduser --system --ingroup appuser appuser

WORKDIR /app

ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl gnupg wget

RUN if [ "$TARGETARCH" = "amd64" ]; then \
      wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg && \
      echo "deb [signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" > /etc/apt/sources.list.d/mongodb-org-6.0.list && \
      apt-get update && apt-get install -y --no-install-recommends mongodb-database-tools && \
      ln -s /usr/bin/mongodump /usr/local/bin/mongodump; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
      wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian11-arm64-100.5.2.deb && \
      dpkg -x mongodb-database-tools-debian11-arm64-100.5.2.deb /tmp/mongodb-tools && \
      cp /tmp/mongodb-tools/usr/bin/mongodump /usr/local/bin/ && \
      rm -rf /tmp/mongodb-tools mongodb-database-tools-debian11-arm64-100.5.2.deb ; \
    fi
    
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