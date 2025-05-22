FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN addgroup --system appuser && \
    adduser --system --ingroup appuser appuser

WORKDIR /app

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