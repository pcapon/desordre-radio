FROM savonet/liquidsoap:v2.3.1

# Run as the image's liquidsoap user; just drop in the script.
COPY radio.liq /radio/radio.liq

# Telnet (worker control) + harbor (live encoder input).
EXPOSE 1234 8005

ENTRYPOINT ["liquidsoap"]
CMD ["/radio/radio.liq"]
