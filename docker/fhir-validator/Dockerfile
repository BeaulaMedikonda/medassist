FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl openjdk-17-jre-headless \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/fhir-validator

RUN curl -L \
  https://github.com/hapifhir/org.hl7.fhir.core/releases/latest/download/validator_cli.jar \
  -o validator_cli.jar

COPY server.mjs ./server.mjs

ENV NODE_ENV=production
ENV PORT=8080
ENV FHIR_VERSION=4.0.1
ENV FHIR_VALIDATOR_IG_PACKAGE=ndhm.in#6.5.0
ENV FHIR_VALIDATOR_TX_SERVER=n/a
ENV FHIR_VALIDATOR_TIMEOUT_MS=120000

EXPOSE 8080

CMD ["node", "server.mjs"]
