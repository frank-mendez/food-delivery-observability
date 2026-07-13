import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';

declare global {
  var __foodDeliveryOtelSdkStarted: boolean | undefined;

  var __foodDeliveryOtelSdk: NodeSDK | undefined;
}

const sdkDisabled =
  process.env.OTEL_SDK_DISABLED === 'true' ||
  (process.env.NODE_ENV === 'test' &&
    process.env.OTEL_ENABLE_IN_TESTS !== 'true');

if (!sdkDisabled && !globalThis.__foodDeliveryOtelSdkStarted) {
  const otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
    `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'}/v1/traces`;

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': process.env.OTEL_SERVICE_NAME ?? 'food-delivery-api',
      'service.version': process.env.npm_package_version ?? '0.0.1',
      'deployment.environment': process.env.NODE_ENV ?? 'development',
    }),
    traceExporter: new OTLPTraceExporter({
      url: otlpEndpoint,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
    ],
  });

  sdk.start();
  globalThis.__foodDeliveryOtelSdk = sdk;
  globalThis.__foodDeliveryOtelSdkStarted = true;

  const shutdown = () => {
    void sdk.shutdown().finally(() => process.exit(0));
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
