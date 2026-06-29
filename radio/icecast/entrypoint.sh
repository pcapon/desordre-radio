#!/bin/sh
set -e

# Substitute ${ICECAST_*} placeholders from the environment into the config.
: "${ICECAST_SOURCE_PASSWORD:=changeme_source}"
: "${ICECAST_RELAY_PASSWORD:=changeme_relay}"
: "${ICECAST_ADMIN_PASSWORD:=changeme_admin}"
: "${ICECAST_HOSTNAME:=localhost}"
: "${ICECAST_MOUNT:=stream}"
export ICECAST_SOURCE_PASSWORD ICECAST_RELAY_PASSWORD ICECAST_ADMIN_PASSWORD ICECAST_HOSTNAME ICECAST_MOUNT

mkdir -p /var/log/icecast
envsubst < /etc/icecast/icecast.xml.template > /etc/icecast/icecast.xml

exec icecast -c /etc/icecast/icecast.xml
