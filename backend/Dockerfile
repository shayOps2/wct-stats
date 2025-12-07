FROM python:3.10

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN addgroup --system appuser && \
    adduser --system --ingroup appuser appuser

WORKDIR /app

COPY requirements.txt /app
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["gunicorn", "app:app", "-c", "gunicorn.conf.py", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]