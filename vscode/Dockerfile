ARG BUILD_FROM=ghcr.io/hassio-addons/debian-base:9.3.0
# hadolint ignore=DL3006
FROM ${BUILD_FROM}

# Configure locale
ENV \
    LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Setup base system and install Microsoft VS Code
ARG BUILD_ARCH=amd64
# renovate: datasource=github-releases depName=microsoft/vscode
ARG VSCODE_VERSION="1.113.0"

# hadolint ignore=DL3008
RUN \
    apt-get update \
    \
    && apt-get install -y --no-install-recommends \
        git \
        curl \
        wget \
        nginx \
        openssh-client \
        locales \
    \
    && sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen \
    && locale-gen \
    \
    # Install Microsoft VS Code based on architecture (pinned version)
    && if [ "${BUILD_ARCH}" = "amd64" ]; then \
        echo "Installing VS Code ${VSCODE_VERSION} for amd64..." \
        && wget -q "https://update.code.visualstudio.com/${VSCODE_VERSION}/linux-deb-x64/stable" -O /tmp/vscode.deb \
        && apt-get update && apt-get install -y --no-install-recommends /tmp/vscode.deb \
        && rm /tmp/vscode.deb \
        && echo "VS Code ${VSCODE_VERSION} installed successfully for amd64"; \
    elif [ "${BUILD_ARCH}" = "aarch64" ]; then \
        echo "Installing VS Code ${VSCODE_VERSION} for arm64..." \
        && wget -q "https://update.code.visualstudio.com/${VSCODE_VERSION}/linux-deb-arm64/stable" -O /tmp/vscode.deb \
        && apt-get update && apt-get install -y --no-install-recommends /tmp/vscode.deb \
        && rm /tmp/vscode.deb \
        && echo "VS Code ${VSCODE_VERSION} installed successfully for arm64"; \
    fi \
    \
    # Verify VS Code installation
    && which code || (echo "ERROR: code command not found!" && exit 1) \
    \
    # Cleanup
    && find /usr/local \
        \( -type d -a -name test -o -name tests -o -name '__pycache__' \) \
        -o \( -type f -a -name '*.pyc' -o -name '*.pyo' \) \
        -exec rm -rf '{}' + \
    \
    && rm -fr \
        /root/.cache \
        /tmp/* \
        /var/{cache,log}/* \
        /var/lib/apt/lists/*

# Copy root filesystem
COPY rootfs /

# Health check
HEALTHCHECK \
    CMD curl --fail http://127.0.0.1:1337/healthz || exit 1

# Build arguments
ARG BUILD_ARCH
ARG BUILD_DATE
ARG BUILD_DESCRIPTION
ARG BUILD_NAME
ARG BUILD_REF
ARG BUILD_REPOSITORY
ARG BUILD_VERSION

# Labels
LABEL \
    io.hass.name="${BUILD_NAME}" \
    io.hass.description="${BUILD_DESCRIPTION}" \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.type="addon" \
    io.hass.version=${BUILD_VERSION} \
    maintainer="fonix232" \
    org.opencontainers.image.title="${BUILD_NAME}" \
    org.opencontainers.image.description="${BUILD_DESCRIPTION}" \
    org.opencontainers.image.authors="fonix232" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.source="https://github.com/${BUILD_REPOSITORY}" \
    org.opencontainers.image.documentation="https://github.com/${BUILD_REPOSITORY}/blob/main/README.md" \
    org.opencontainers.image.created=${BUILD_DATE} \
    org.opencontainers.image.revision=${BUILD_REF} \
    org.opencontainers.image.version=${BUILD_VERSION}
