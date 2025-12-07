FROM mongo:6.0

# install curl and ca-certificates
USER root
RUN set -eux; \
    for i in 1 2 3 4 5; do \
      apt-get update -o Acquire::Retries=3 && break || { \
        echo "apt-get update failed, retrying ($i)"; \
        sleep $((i * 2)); \
      }; \
    done; \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*


CMD ["/bin/sh"]
