FROM mongo:6.0

# install curl and ca-certificates
USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# copy restore script
COPY restore.sh /usr/local/bin/restore.sh
RUN chmod +x /usr/local/bin/restore.sh

ENTRYPOINT ["/usr/local/bin/restore.sh"]
CMD []