FROM alpine:3.20

RUN apk add --no-cache icecast gettext && \
    mkdir -p /var/log/icecast

# The XML is a template; the entrypoint runs envsubst before starting Icecast.
COPY icecast.xml /etc/icecast/icecast.xml.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
