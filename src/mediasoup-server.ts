import * as mediasoup from "mediasoup";
import os from "os";

type Worker = mediasoup.types.Worker;
type Router = mediasoup.types.Router;
type WebRtcTransport = mediasoup.types.WebRtcTransport;
type Producer = mediasoup.types.Producer;
type Consumer = mediasoup.types.Consumer;

// Mediasoup Config
const config = {
  numWorkers: Math.max(1, os.cpus().length),
  worker: {
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
    logLevel: "warn" as const,
    logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"] as any[],
  },
  router: {
    mediaCodecs: [
      {
        kind: "audio" as const,
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video" as const,
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {
          "x-google-start-bitrate": 1000,
        },
      },
      {
        kind: "video" as const,
        mimeType: "video/H264",
        clockRate: 90000,
        parameters: {
          "packetization-mode": 1,
          "profile-level-id": "42e01f",
          "level-asymmetry-allowed": 1,
        },
      },
    ] as any[],
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: "0.0.0.0",
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || "127.0.0.1",
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  },
};

const workers: Worker[] = [];
let nextWorkerIdx = 0;

const routers = new Map<string, Router>(); // sessionId -> Router
const transports = new Map<string, WebRtcTransport>(); // transportId -> Transport
const producers = new Map<string, Producer>(); // producerId -> Producer
const consumers = new Map<string, Consumer>(); // consumerId -> Consumer

// Peer mapping: socketId -> resource sets
const peerResources = new Map<
  string,
  {
    transports: Set<string>;
    producers: Set<string>;
    consumers: Set<string>;
  }
>();

export async function createWorkers() {
  const numWorkers = config.numWorkers;
  console.log(`[Mediasoup] Spawning ${numWorkers} workers...`);
  for (let i = 0; i < numWorkers; i++) {
    try {
      const worker = await mediasoup.createWorker({
        logLevel: config.worker.logLevel,
        logTags: config.worker.logTags,
        rtcMinPort: config.worker.rtcMinPort,
        rtcMaxPort: config.worker.rtcMaxPort,
      });

      worker.on("died", () => {
        console.error("[Mediasoup] Worker died, restarting in 2 seconds...");
        setTimeout(() => process.exit(1), 2000);
      });

      workers.push(worker);
    } catch (err) {
      console.error(`[Mediasoup] Failed to spawn worker ${i}:`, err);
    }
  }
}

function getWorker(): Worker {
  if (workers.length === 0) {
    throw new Error("No Mediasoup workers available.");
  }
  const worker = workers[nextWorkerIdx];
  nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
  return worker;
}

export async function getOrCreateRouter(sessionId: string): Promise<Router> {
  let router = routers.get(sessionId);
  if (!router) {
    const worker = getWorker();
    router = await worker.createRouter({ mediaCodecs: config.router.mediaCodecs });
    routers.set(sessionId, router);
    console.log(`[Mediasoup] Created router for session: ${sessionId}`);
  }
  return router;
}

function getOrCreatePeerResources(socketId: string) {
  let resources = peerResources.get(socketId);
  if (!resources) {
    resources = {
      transports: new Set(),
      producers: new Set(),
      consumers: new Set(),
    };
    peerResources.set(socketId, resources);
  }
  return resources;
}

export async function createWebRtcTransport(
  sessionId: string,
  socketId: string,
  direction: "send" | "recv"
) {
  const router = await getOrCreateRouter(sessionId);
  const { listenIps, enableUdp, enableTcp, preferUdp } = config.webRtcTransport;

  const transport = await router.createWebRtcTransport({
    listenIps,
    enableUdp,
    enableTcp,
    preferUdp,
    initialAvailableOutgoingBitrate: 1000000,
  });

  transports.set(transport.id, transport);

  const resources = getOrCreatePeerResources(socketId);
  resources.transports.add(transport.id);

  transport.on("dtlsstatechange", (dtlsState: any) => {
    if (dtlsState === "failed" || dtlsState === "closed") {
      console.warn(`[Mediasoup] Transport ${transport.id} DTLS state: ${dtlsState}`);
    }
  });

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };
}

export async function connectWebRtcTransport(transportId: string, dtlsParameters: any) {
  const transport = transports.get(transportId);
  if (!transport) {
    throw new Error(`Transport not found: ${transportId}`);
  }
  await transport.connect({ dtlsParameters });
}

const sessionProducers = new Map<string, Set<string>>();

function removeSessionProducer(sessionId: string, producerId: string) {
  const set = sessionProducers.get(sessionId);
  if (set) {
    set.delete(producerId);
    if (set.size === 0) {
      sessionProducers.delete(sessionId);
    }
  }
}

export function getSessionProducers(sessionId: string) {
  const set = sessionProducers.get(sessionId);
  if (!set) return [];
  const list: Array<{ producerId: string; kind: "audio" | "video"; appData: any }> = [];
  for (const producerId of set) {
    const producer = producers.get(producerId);
    if (producer) {
      list.push({
        producerId: producer.id,
        kind: producer.kind as "audio" | "video",
        appData: producer.appData,
      });
    }
  }
  return list;
}

export async function produce(
  sessionId: string,
  socketId: string,
  transportId: string,
  kind: "audio" | "video",
  rtpParameters: any,
  appData: any
) {
  const transport = transports.get(transportId);
  if (!transport) {
    throw new Error(`Transport not found: ${transportId}`);
  }

  const producer = await transport.produce({ kind, rtpParameters, appData });
  producers.set(producer.id, producer);

  const resources = getOrCreatePeerResources(socketId);
  resources.producers.add(producer.id);

  // Track session producer
  if (!sessionProducers.has(sessionId)) {
    sessionProducers.set(sessionId, new Set());
  }
  sessionProducers.get(sessionId)!.add(producer.id);

  producer.on("transportclose", () => {
    console.log(`[Mediasoup] Producer transport closed. Closing producer: ${producer.id}`);
    producer.close();
    producers.delete(producer.id);
    removeSessionProducer(sessionId, producer.id);
  });

  return { id: producer.id };
}

export async function consume(
  sessionId: string,
  socketId: string,
  transportId: string,
  producerId: string,
  rtpCapabilities: any
) {
  const router = await getOrCreateRouter(sessionId);
  const transport = transports.get(transportId);
  if (!transport) {
    throw new Error(`Transport not found: ${transportId}`);
  }

  if (!router.canConsume({ producerId, rtpCapabilities })) {
    throw new Error(`Cannot consume producer: ${producerId}`);
  }

  const consumer = await transport.consume({
    producerId,
    rtpCapabilities,
    paused: true,
  });

  consumers.set(consumer.id, consumer);

  const resources = getOrCreatePeerResources(socketId);
  resources.consumers.add(consumer.id);

  consumer.on("transportclose", () => {
    console.log(`[Mediasoup] Consumer transport closed. Closing consumer: ${consumer.id}`);
    consumer.close();
    consumers.delete(consumer.id);
  });

  consumer.on("producerclose", () => {
    console.log(`[Mediasoup] Producer closed. Closing consumer: ${consumer.id}`);
    consumer.close();
    consumers.delete(consumer.id);
  });

  return {
    id: consumer.id,
    producerId,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
    type: consumer.type,
  };
}

export function resumeConsumer(consumerId: string) {
  const consumer = consumers.get(consumerId);
  if (consumer) {
    consumer.resume();
  }
}

export function getProducer(producerId: string): Producer | undefined {
  return producers.get(producerId);
}

export function cleanupPeer(socketId: string) {
  const resources = peerResources.get(socketId);
  if (!resources) return;

  console.log(`[Mediasoup] Cleaning up resources for socket: ${socketId}`);

  for (const consumerId of resources.consumers) {
    const consumer = consumers.get(consumerId);
    if (consumer) {
      consumer.close();
      consumers.delete(consumerId);
    }
  }

  for (const producerId of resources.producers) {
    const producer = producers.get(producerId);
    if (producer) {
      // Find and remove from sessionProducers
      for (const [sid, set] of sessionProducers.entries()) {
        if (set.has(producerId)) {
          set.delete(producerId);
          if (set.size === 0) sessionProducers.delete(sid);
          break;
        }
      }
      producer.close();
      producers.delete(producerId);
    }
  }

  for (const transportId of resources.transports) {
    const transport = transports.get(transportId);
    if (transport) {
      transport.close();
      transports.delete(transportId);
    }
  }

  peerResources.delete(socketId);
}
