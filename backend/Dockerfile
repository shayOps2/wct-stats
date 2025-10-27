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
      curl -fsSL https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian11-x86_64-100.9.4.deb -o tools.deb && \
      apt install -y ./tools.deb && \
      rm tools.deb && \
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