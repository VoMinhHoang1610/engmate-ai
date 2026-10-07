FROM python:3.13-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -o /tmp/microsoft-prod.deb \
    && dpkg -i /tmp/microsoft-prod.deb \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 libgssapi-krb5-2 ffmpeg \
    && python -m pip install --no-cache-dir -r requirements.txt \
    && rm /tmp/microsoft-prod.deb \
    && rm -rf /var/lib/apt/lists/*
COPY app ./app
RUN useradd --create-home --uid 10001 appuser \
    && mkdir /app/media \
    && chown appuser:appuser /app/media
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=5s --timeout=3s --start-period=15s --retries=20 \
    CMD curl --fail --silent --show-error --max-time 2 http://127.0.0.1:8000/api/health || exit 1
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
